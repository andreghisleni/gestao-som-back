import Elysia, { t } from "elysia";
import { authMacro } from "~/auth";
import { prisma } from "~/db/client";
import { normalizeContractor } from "~/http/routes/public/budgets/validators";
import type { ContractorType } from "~/utils/documents";
import {
  isValidDocument,
  isValidEmail,
  isValidPhone,
  onlyDigits,
} from "~/utils/documents";
import { viewSummary } from "~/utils/public-views";
import {
  budgetEventDetailsResponseSchema,
  internalEventInclude,
  toBudgetEventDetails,
} from "./event-details-schemas";

const budgetParamsSchema = t.Object({
  budgetId: t.String({ format: "uuid" }),
});

/**
 * TODOS os campos são opcionais, por pedido explícito: dá para gravar só o
 * CNPJ hoje e deixar o resto para o cliente completar pelo link. A semântica é
 * de PATCH de verdade —
 *  - chave **ausente** no corpo: não toca no que está gravado;
 *  - chave **presente** (até com `""` ou `null`): escreve, e apaga se vier vazia.
 * Assim corrigir um campo nunca derruba os vizinhos, e trocar PF ↔ PJ não
 * precisa destruir os dados do outro tipo (o front omite o que está oculto).
 *
 * O formato gravado é o mesmo da página pública (dígitos puros, e-mail em
 * minúsculas), então quem lê depois — cliente ou tela interna — vê uma coisa só.
 */
const contractorBodySchema = t.Object({
  email: t.Optional(t.Nullable(t.String({ maxLength: 160 }))),
  name: t.Optional(t.Nullable(t.String({ maxLength: 120 }))),
  document: t.Optional(t.Nullable(t.String({ maxLength: 18 }))),
  phone: t.Optional(t.Nullable(t.String({ maxLength: 20 }))),
  tradeName: t.Optional(t.Nullable(t.String({ maxLength: 120 }))),
  type: t.Optional(t.Union([t.Literal("PF"), t.Literal("PJ")])),
});

/** Mesmo shape de erro do envio público: `fields` é o que marca os inputs. */
const fieldErrorSchema = t.Object({
  error: t.String(),
  fields: t.Array(t.String()),
});

/**
 * Pré-preenche os dados do contratante de um orçamento.
 *
 * O pedido foi "todos os campos opcionais", e é isso que sustenta a rota:
 *  1. **presence-aware** — só sai do lugar o que veio no corpo. Dá para gravar
 *     o CNPJ hoje e voltar daqui a uma semana para acrescentar o e-mail, sem
 *     reenviar o resto;
 *  2. **presente e vazio apaga** — `""` ou `null` é uma decisão, não um esquecimento.
 *     É assim que se limpa um CPF digitado com um dígito a mais;
 *  3. **formato só é cobrado quando existe conteúdo** — vazio nunca é erro,
 *     preenchido precisa ser CPF/CNPJ válido, e-mail com forma e WhatsApp de 10
 *     ou 11 dígitos, sempre contra o tipo de contratante que vai valer.
 *
 * A gravação reutiliza `normalizeContractor` da rota pública, então o banco
 * recebe exatamente a forma canônica de sempre (dígitos puros, e-mail em
 * minúsculas). Não existe um "segundo cadastro" para conciliar depois: o que o
 * escritório escreve é o mesmo campo que o cliente vê preenchido no link.
 *
 * Nenhuma trava contra "já enviado": depois da resposta, estes campos continuam
 * aparecendo para revisar, e é justamente aí que a manutenção faz falta. O que
 * esta rota nunca toca é `budget_event_revisions` — o histórico congelado
 * permanece a prova do que foi dito em cada ciclo.
 */
export const updateBudgetEventContractorRoute = new Elysia()
  .macro(authMacro)
  .patch(
    "/:budgetId/event-contractor",
    async ({ params, body, user, set }) => {
      const budget = await prisma.budget.findFirst({
        where: { id: params.budgetId, userId: user.id },
        include: internalEventInclude,
      });
      if (!budget) {
        set.status = 404;
        return { error: "Budget not found" };
      }

      const stored = budget.details;
      // Tipo efetivo: o que está chegando tem prioridade sobre o gravado, e um
      // orçamento sem resposta alguma é PF por definição do schema.
      const type: ContractorType =
        body.type ?? (stored?.contractorType === "PJ" ? "PJ" : "PF");

      // Alargado de propósito: `normalizeContractor` devolve um ou dois formatos
      // (só traz `contractorType` quando o tipo é reconhecido) e aqui o que
      // interessa é ler coluna por coluna.
      const patch: Record<string, string | null | undefined> =
        normalizeContractor(body);

      const data: Record<string, string | null> = {};
      if (body.type !== undefined) {
        data.contractorType = type;
      }
      if (body.name !== undefined) {
        data.contractorName = patch.contractorName ?? null;
      }
      if (body.tradeName !== undefined) {
        data.tradeName = patch.tradeName ?? null;
      }
      if (body.document !== undefined) {
        data.document = patch.document ?? null;
      }
      if (body.email !== undefined) {
        data.email = patch.email ?? null;
      }
      if (body.phone !== undefined) {
        data.phone = patch.phone ?? null;
      }

      // A checagem é do estado FINAL, campo a campo: veio algo agora, usa isso;
      // campo ausente continua sendo o que já estava gravado. Trocar PF → PJ com
      // um CPF na base, por exemplo, é barrado aqui em vez de deixar o link do
      // cliente mostrando um CNPJ de 11 dígitos.
      const document =
        body.document !== undefined
          ? data.document
          : (stored?.document ?? null);
      const email =
        body.email !== undefined ? data.email : (stored?.email ?? null);
      const phone =
        body.phone !== undefined ? data.phone : (stored?.phone ?? null);

      // "Havia conteúdo" é medido no que ELE digitou, não no que sobrou depois
      // da normalização: `normalizeContractor` devolve `null` para um telefone de
      // 5 dígitos, e sem isso um número incompleto apagaria o WhatsApp gravado em
      // vez de avisar. Formato errado nunca é tratado como campo vazio.
      const filled = (value: string | null | undefined) =>
        onlyDigits(value).length > 0 || (value ?? "").trim().length > 0;

      const fields: string[] = [];
      const badDocument =
        body.document !== undefined
          ? filled(body.document) && !isValidDocument(document, type)
          : Boolean(document) && !isValidDocument(document, type);
      if (badDocument) {
        fields.push("document");
      }
      if (email && !isValidEmail(email)) {
        fields.push("email");
      }
      const badPhone =
        body.phone !== undefined
          ? filled(body.phone) && !isValidPhone(body.phone)
          : Boolean(phone) && !isValidPhone(phone);
      if (badPhone) {
        fields.push("phone");
      }
      if (fields.length > 0) {
        set.status = 400;
        return {
          error: "Alguns campos têm formato inválido.",
          fields,
        };
      }

      // Corpo `{}` (ou só campos repetidos) não escreve nada: sem isso, um
      // GET disparado por engano criaria uma resposta vazia e o escritório
      // passaria a enxergar "cliente respondeu" onde ninguém abriu o link.
      if (Object.keys(data).length > 0) {
        await prisma.eventDetails.upsert({
          where: { budgetId: budget.id },
          create: { budgetId: budget.id, ...data },
          update: data,
        });
      }

      const fresh = await prisma.budget.findFirst({
        where: { id: budget.id },
        include: internalEventInclude,
      });
      // Devolve o DTO inteiro, com as visitas: a tela atualiza o card a partir
      // da própria resposta, sem precisar de um segundo request.
      return toBudgetEventDetails(
        fresh as typeof budget,
        await viewSummary(budget.id),
      );
    },
    {
      auth: true,
      params: budgetParamsSchema,
      body: contractorBodySchema,
      response: {
        200: budgetEventDetailsResponseSchema,
        400: fieldErrorSchema,
        404: t.Object({ error: t.String() }),
      },
      detail: {
        summary:
          "Pre-fill the contractor data of a budget (internal, optional)",
        operationId: "updateBudgetEventContractor",
      },
    },
  );
