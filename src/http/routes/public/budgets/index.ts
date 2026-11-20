import Elysia from 'elysia';
import { getPublicBudgetRoute } from './get-public-budget-route';
import { saveEventDetailsRoute } from './save-event-details-route';
import { submitEventDetailsRoute } from './submit-event-details-route';

export const publicBudgetRoutes = new Elysia({
  prefix: '/budgets',
  tags: ['Public'],
})
  .use(getPublicBudgetRoute)
  .use(saveEventDetailsRoute)
  .use(submitEventDetailsRoute);
