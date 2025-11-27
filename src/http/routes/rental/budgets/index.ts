import Elysia from 'elysia';
import { createBudgetRoute } from './create-budget-route';
import { getBudgetRoute } from './get-budget-route';
import { listBudgetsRoute } from './list-budgets-route';

export const budgets = new Elysia({
  prefix: '/budgets',
  name: 'Budgets',
  tags: ['Rental', 'Budgets'],
})
  .use(createBudgetRoute)
  .use(listBudgetsRoute)
  .use(getBudgetRoute);
