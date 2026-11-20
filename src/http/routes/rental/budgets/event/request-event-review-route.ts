import type { Prisma } from "@db/client";
import Elysia, { t } from "elysia";
import { authMacro } from "~/auth";
import { prisma } from "~/db/client";
import { viewSummary } from "~/utils/public-views";
import {
  internalEventInclude,
  requestEventReviewResponseSchema,
  toAnswer,
  toBudgetEventDetails,
} from "./event-details-schemas";

const budgetParamsSchema = t.Object({
  budgetId: t.String({ format: "uuid" }),
});

const reviewBodySchema = t.Object(
  {
    /**
     * O que escrevo no WhatsApp chega literalmente na página do cliente como
     * "o que precisa ser revisto". Opcional por design.
     */
    reason: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
  },
  { description: "Motivo do pedido de nova revisão" },
);

/**
 * Congela a resposta atual e libera o reenvio.
 *
 * Uma transação, quatro efeitos:
 *  1. copia os dados do evento (+ o aceite vigente) em `budget_event_revisions`
 *     com a próxima versão — a partir daqui nada sobrescreve aquela resposta, e
 *     dá para compará-la com a seguinte;
 *  2. zera `completedAt`, que é exatamente o que destrava o autosave e o submit
 *     (enquanto há resposta enviada, a rota pública responde 409);
 *  3. marca `REVISION_REQUESTED`, para a tela interna e a página pública
 *     mostrarem que a bola voltou para o cliente;
 *  4. NÃO mexe no token: o link já enviado continua valendo, porque quem
 *     reenvia é a mesma pessoa, pelo mesmo endereço.
 *
 * Idempotente: se já existe um pedido em aberto, o segundo clique não cria uma
 * cópia nova — responde o estado atual com `created: false`.
 */
export const requestEventReviewRoute = new Elysia().macro(authMacro).post(
  "/:budgetId/event-reviews",
  async ({ params, body, user, set }) => {
    const budget = await prisma.budget.findFirst({
      where: { id: params.budgetId, userId: user.id },
      include: internalEventInclude,
    });

    if (!budget) {
      set.status = 404;
      return { error: "Budget not found" };
    }

    const open = budget.revisions.find((item) => !item.resolvedAt);
    if (open) {
      // Nada duplicado: o pedido em aberto já é a cópia mais recente.
      set.status = 200;
      return {
        created: false,
        ...toBudgetEventDetails(budget, await viewSummary(budget.id)),
      };
    }

    // `completedAt` e não a linha: pré-preencher o contratante cria a linha sem
    // o cliente ter respondido. Congelar aqui guardaria uma versão vazia.
    if (!budget.details?.completedAt) {
      set.status = 400;
      return {
        error: "O cliente ainda não respondeu pelo link da proposta.",
      };
    }

    const reason = (body.reason ?? "").replace(/\s+/g, " ").trim();
    const requestedAt = new Date();
    const version = (budget.revisions[0]?.version ?? 0) + 1;

    await prisma.$transaction([
      prisma.budgetEventRevision.create({
        data: {
          budgetId: budget.id,
          version,
          // Só o conteúdo da resposta: id e timestamps do ciclo atual não
          // fazem sentido dentro de uma cópia congelada.
          data: toAnswer(budget.details) as Prisma.InputJsonValue,
          submittedAt: budget.details.completedAt,
          acceptedName: budget.acceptance?.acceptedName ?? null,
          acceptedValue: budget.acceptance?.acceptedValue ?? null,
          acceptedAt: budget.acceptance?.acceptedAt ?? null,
          acceptedIp: budget.acceptance?.acceptedIp ?? null,
          acceptedUserAgent: budget.acceptance?.userAgent ?? null,
          reason: reason || null,
          requestedBy: user.id,
          requestedAt,
        },
      }),
      // Cópia de trabalho continua no lugar: o cliente retoma do seu rascunho,
      // mas agora com permissão para enviar de novo.
      prisma.eventDetails.update({
        where: { budgetId: budget.id },
        data: { completedAt: null },
      }),
      prisma.budget.update({
        where: { id: budget.id },
        data: { status: "REVISION_REQUESTED" },
      }),
    ]);

    const fresh = await prisma.budget.findFirst({
      where: { id: budget.id },
      include: internalEventInclude,
    });

    set.status = 201;
    return {
      created: true,
      ...toBudgetEventDetails(
        fresh as typeof budget,
        await viewSummary(budget.id),
      ),
    };
  },
  {
    auth: true,
    params: budgetParamsSchema,
    body: reviewBodySchema,
    response: {
      200: requestEventReviewResponseSchema,
      201: requestEventReviewResponseSchema,
      400: t.Object({ error: t.String() }),
      404: t.Object({ error: t.String() }),
    },
    detail: {
      summary: "Freeze the current answer and allow the client to submit again",
      operationId: "requestBudgetEventReview",
    },
  },
);
