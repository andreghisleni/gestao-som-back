import Elysia, { t } from 'elysia';
import { authMacro } from '~/auth';
import { prisma } from '~/db/client';
import { buildPublicUrl, generateShareToken } from '~/utils/share-token';

const shareParamsSchema = t.Object({
  budgetId: t.String({ format: 'uuid' }),
});

const shareResponseSchema = t.Object(
  {
    token: t.String(),
    url: t.String(),
    viewCount: t.Number(),
    createdAt: t.Nullable(t.Date()),
    revokedAt: t.Nullable(t.Date()),
    /** Quantas linhas de "o que está incluso" a proposta pública tem no ar. */
    offerItemCount: t.Number(),
  },
  { description: 'Estado do link público do orçamento' }
);

/**
 * Gera (ou retorna o existente) o link público.
 *
 * Idempotente por desenho: clicar duas vezes não troca o link que já foi
 * mandado para o cliente. Se não houver nenhuma linha de "o que está incluso",
 * semeia uma por ambiente (seção) com `source: AUTO` — um ponto de partida
 * editável, não um espelho do estoque: os equipamentos em si nunca aparecem.
 */
export const createShareLinkRoute = new Elysia().macro(authMacro).post(
  '/:budgetId/share-link',
  async ({ params, user, set }) => {
    const budget = await prisma.budget.findFirst({
      where: { id: params.budgetId, userId: user.id },
      include: { sections: { orderBy: { name: 'asc' } }, offerItems: true },
    });
    if (!budget) {
      set.status = 404;
      return { error: 'Budget not found' };
    }

    const token = budget.publicToken ?? generateShareToken();

    const data: Record<string, unknown> = {
      publicToken: token,
      publicTokenAt: budget.publicTokenAt ?? new Date(),
      publicTokenRevoked: null,
    };

    if (budget.offerItems.length === 0 && budget.sections.length > 0) {
      data.offerItems = {
        create: budget.sections.map((section, index) => ({
          name: section.name,
          detail: null,
          source: 'AUTO',
          order: index,
        })),
      };
    }

    const updated = await prisma.budget.update({
      where: { id: budget.id },
      data,
      select: {
        publicToken: true,
        publicTokenAt: true,
        publicTokenRevoked: true,
        publicViewCount: true,
        offerItems: { select: { id: true } },
      },
    });

    if (!updated.publicToken) {
      set.status = 500;
      return { error: 'Token was not persisted' };
    }

    return {
      token: updated.publicToken,
      url: buildPublicUrl(updated.publicToken),
      viewCount: updated.publicViewCount,
      createdAt: updated.publicTokenAt,
      revokedAt: updated.publicTokenRevoked,
      offerItemCount: updated.offerItems.length,
    };
  },
  {
    auth: true,
    params: shareParamsSchema,
    response: {
      200: shareResponseSchema,
      404: t.Object({ error: t.String() }),
      500: t.Object({ error: t.String() }),
    },
    detail: {
      summary: 'Create or read the public link of a budget',
      operationId: 'createBudgetShareLink',
    },
  }
);
