import Elysia from 'elysia';
import { publicBudgetRoutes } from './budgets';
import { publicOptionsRoutes } from './options';

/**
 * Raiz do que é acessível sem sessão.
 *
 * Nada aqui usa `authMacro`: a autorização é o token do link, com escopo de
 * leitura mínimo definido em `budgets/schemas.ts`. Novas rotas públicas entram
 * por este caminho para ficarem visíveis como superfície exposta.
 */
export const publicRoutes = new Elysia({ prefix: '/public', tags: ['Public'] })
  .use(publicBudgetRoutes)
  .use(publicOptionsRoutes);
