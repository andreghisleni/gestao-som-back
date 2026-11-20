import Elysia, { t } from "elysia";
import { authMacro } from "~/auth";
import { prisma } from "~/db/client";
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
 * A resposta do formulário público, vista por dentro.
 *
 * É o espelho da tela de revisão que o cliente vê antes de enviar — mesmos
 * grupos, mesma ordem — mais a trilha do aceite e o histórico de versões. O
 * `GET /rental/budgets/:id` continua sem saber de nada disso de propósito:
 * coleta de dados do evento não é parte do cálculo do orçamento.
 *
 * Chega junto o resumo de visitas do link (quantas, de quantos dispositivos e
 * quando), porque é a resposta para "será que ele abriu?".
 */
export const getBudgetEventDetailsRoute = new Elysia().macro(authMacro).get(
  "/:budgetId/event-details",
  async ({ params, user, set }) => {
    const budget = await prisma.budget.findFirst({
      where: { id: params.budgetId, userId: user.id },
      include: internalEventInclude,
    });

    if (!budget) {
      set.status = 404;
      return { error: "Budget not found" };
    }

    return toBudgetEventDetails(budget, await viewSummary(budget.id));
  },
  {
    auth: true,
    params: budgetParamsSchema,
    response: {
      200: budgetEventDetailsResponseSchema,
      404: t.Object({ error: t.String() }),
    },
    detail: {
      summary: "Read the client answer of the public event form (internal)",
      operationId: "getBudgetEventDetails",
    },
  },
);
