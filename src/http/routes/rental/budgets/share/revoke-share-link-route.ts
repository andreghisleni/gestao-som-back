import Elysia, { t } from 'elysia';
import { authMacro } from '~/auth';
import { prisma } from '~/db/client';

const shareParamsSchema = t.Object({
  budgetId: t.String({ format: 'uuid' }),
});

/**
 * Revogação: o token vai a NULL, então o link antigo cai no 404 da rota
 * pública. Os dados que o cliente já informou ficam intactos — revogar o link
 * não é descartar o trabalho dele.
 */
export const revokeShareLinkRoute = new Elysia().macro(authMacro).delete(
  '/:budgetId/share-link',
  async ({ params, user, set }) => {
    const budget = await prisma.budget.findFirst({
      where: { id: params.budgetId, userId: user.id },
    });
    if (!budget) {
      set.status = 404;
      return { error: 'Budget not found' };
    }
    if (!budget.publicToken) {
      set.status = 409;
      return { error: 'Este orçamento ainda não tem link público ativo' };
    }

    await prisma.budget.update({
      where: { id: budget.id },
      data: { publicToken: null, publicTokenRevoked: new Date() },
    });

    set.status = 204;
  },
  {
    auth: true,
    params: shareParamsSchema,
    response: {
      204: t.Void({ description: 'Public link revoked' }),
      404: t.Object({ error: t.String() }),
      409: t.Object({ error: t.String() }),
    },
    detail: {
      summary: 'Revoke the public link of a budget',
      operationId: 'revokeBudgetShareLink',
    },
  }
);
