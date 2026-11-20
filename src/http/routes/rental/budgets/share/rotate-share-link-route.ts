import Elysia, { t } from 'elysia';
import { authMacro } from '~/auth';
import { prisma } from '~/db/client';
import { buildPublicUrl, generateShareToken } from '~/utils/share-token';

const shareParamsSchema = t.Object({
  budgetId: t.String({ format: 'uuid' }),
});

const rotateResponseSchema = t.Object({
  token: t.String(),
  url: t.String(),
  previousUrlRevoked: t.Boolean(),
});

/**
 * Troca o token mantendo o link ativo: o endereço anterior morre e um novo
 * nasce na hora. É a saída quando o link foi encaminhado para alguém errado
 * ou quando a conversa comercial recomeçou com outra pessoa.
 */
export const rotateShareLinkRoute = new Elysia().macro(authMacro).post(
  '/:budgetId/share-link/rotate',
  async ({ params, user, set }) => {
    const budget = await prisma.budget.findFirst({
      where: { id: params.budgetId, userId: user.id },
    });
    if (!budget) {
      set.status = 404;
      return { error: 'Budget not found' };
    }

    const previousUrlRevoked = Boolean(budget.publicToken);
    const token = generateShareToken();
    await prisma.budget.update({
      where: { id: budget.id },
      data: {
        publicToken: token,
        publicTokenAt: new Date(),
        publicTokenRevoked: null,
      },
    });

    return {
      token,
      url: buildPublicUrl(token),
      previousUrlRevoked,
    };
  },
  {
    auth: true,
    params: shareParamsSchema,
    response: {
      200: rotateResponseSchema,
      404: t.Object({ error: t.String() }),
    },
    detail: {
      summary: 'Rotate the public link token of a budget',
      operationId: 'rotateBudgetShareLink',
    },
  }
);
