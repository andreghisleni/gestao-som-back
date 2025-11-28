import Elysia from 'elysia';
import { budgetRoutes } from './budgets';
import { categoriesRoutes } from './categories';
import { equipmentRoutes } from './equipment';

export const rentalRoutes = new Elysia({ prefix: '/rental' })
  .group('/categories', (app) => app.use(categoriesRoutes))
  .group('/equipments', (app) => app.use(equipmentRoutes))
  .group('/budgets', (app) => app.use(budgetRoutes));

