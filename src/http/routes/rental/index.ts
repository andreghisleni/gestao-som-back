import Elysia from 'elysia';
import { budgets } from './budgets/index';
import { equipment } from './equipment/index';

export const rental = new Elysia({
  prefix: '/rental',
  name: 'Rental',
  tags: ['Rental'],
})
  .use(equipment)
  .use(budgets);
