import Elysia from "elysia";
import { cloneBudgetRoute } from "./clone-budget-route";
import { createBudgetRoute } from "./create-budget-route";
import { getBudgetEventDetailsRoute } from "./event/get-event-details-route";
import { requestEventReviewRoute } from "./event/request-event-review-route";
import { getBudgetRoute } from "./get-budget-route";
import { getBudgetsRoute } from "./get-budgets-route";
import { createBudgetItemRoute } from "./items/create-item-route";
import { deleteBudgetItemRoute } from "./items/delete-item-route";
import { toggleShowInBudgetPrintRoute } from "./items/toggle-show-in-budget-print-item-route";
import { updateBudgetItemRoute } from "./items/update-item-route";
import { createOfferItemRoute } from "./offers/create-offer-item-route";
import { deleteOfferItemRoute } from "./offers/delete-offer-item-route";
import { orderOfferItemsRoute } from "./offers/order-offer-items-route";
import { updateOfferItemRoute } from "./offers/update-offer-item-route";
import { createBudgetSectionRoute } from "./sections/create-section-route";
import { deleteBudgetSectionRoute } from "./sections/delete-section-route";
import { updateSectionRoute } from "./sections/update-section-route";
import { createShareLinkRoute } from "./share/create-share-link-route";
import { revokeShareLinkRoute } from "./share/revoke-share-link-route";
import { rotateShareLinkRoute } from "./share/rotate-share-link-route";
import { updateBudgetRoute } from "./update-budget-route";

export const budgetRoutes = new Elysia({
  prefix: "/budgets",
  tags: ["Budgets"],
})
  // Rotas Principais de Orçamento
  .use(createBudgetRoute)
  .use(getBudgetsRoute)
  .use(getBudgetRoute)
  .use(updateBudgetRoute)
  .use(cloneBudgetRoute)

  // Rotas de Seções (Ambientes)
  .use(createBudgetSectionRoute)
  .use(updateSectionRoute)
  .use(deleteBudgetSectionRoute)

  // Rotas de Itens
  .use(createBudgetItemRoute)
  .use(updateBudgetItemRoute)
  .use(deleteBudgetItemRoute)
  .use(toggleShowInBudgetPrintRoute)

  // Linhas de descrição exibidas na proposta pública (sem preço, sem equipamento)
  .use(createOfferItemRoute)
  .use(updateOfferItemRoute)
  .use(deleteOfferItemRoute)
  .use(orderOfferItemsRoute)

  // Link público /p/:token
  .use(createShareLinkRoute)
  .use(revokeShareLinkRoute)
  .use(rotateShareLinkRoute)

  // Resposta do formulário público: leitura e pedido de nova revisão
  .use(getBudgetEventDetailsRoute)
  .use(requestEventReviewRoute);
