import Elysia, { t } from "elysia";
import { registerPublicView } from "~/utils/public-views";
import { clientIp, findPublicBudget, isLinkUsable, NOT_FOUND } from "./helpers";
import { publicBudgetSchema, toPublicBudget } from "./schemas";

const tokenParamsSchema = t.Object({
  token: t.String({
    minLength: 10,
    maxLength: 40,
    description: "Token opaco do link público do orçamento",
  }),
});

export const getPublicBudgetRoute = new Elysia().get(
  "/:token",
  async ({ params, request, set }) => {
    const budget = await findPublicBudget(params.token);
    if (!isLinkUsable(budget)) {
      set.status = 404;
      return NOT_FOUND;
    }

    // Contagem é sinal para você ("o cliente abriu 3x e não respondeu"), então
    // agora é por visitante e com janela: recarga, refetch de foco de aba, retry
    // de rede e preview de link de robô não somam visita nova. Falha aqui é só
    // perda de métrica — nunca pode travar a leitura do cliente.
    try {
      await registerPublicView({
        budgetId: budget.id,
        ip: clientIp(request),
        userAgent: request.headers.get("user-agent"),
      });
    } catch {
      // ignore
    }

    return toPublicBudget(budget);
  },
  {
    params: tokenParamsSchema,
    response: {
      200: publicBudgetSchema,
      404: t.Object({ error: t.String() }),
    },
    detail: {
      summary: "Get budget proposal for the public event-details page",
      description:
        "Rota SEM autenticação, autorizada pelo token. Retorna apenas o valor " +
        "acordado e as linhas de descrição editáveis: nada de preço por item, " +
        "equipamento, mão de obra, frete ou desconto.",
      operationId: "getPublicBudget",
    },
  },
);
