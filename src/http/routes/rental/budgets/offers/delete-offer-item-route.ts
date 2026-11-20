import Elysia, { t } from 'elysia';
import { authMacro } from '~/auth';
import { prisma } from '~/db/client';

const offerItemParamsSchema = t.Object({
  budgetId: t.String({ format: 'uuid' }),
  id: t.String({ format: 'uuid' }),
});

/**
 * Remover uma linha de descrição não toca em item nem em total: são camadas
 * independentes de propósito. O que o cliente vê pode ser resumido sem que a
 * memória de cálculo do orçamento se perca.
 */
export const deleteOfferItemRoute = new Elysia().macro(authMacro).delete(
  '/:budgetId/offer-items/:id',
  async ({ params, user, set }) => {
    const item = await prisma.budgetOfferItem.findFirst({
      where: {
        id: params.id,
        budgetId: params.budgetId,
        budget: { userId: user.id },
      },
    });
    if (!item) {
      set.status = 404;
      return { error: 'Offer item not found in this budget' };
    }

    await prisma.budgetOfferItem.delete({ where: { id: item.id } });
    set.status = 204;
  },
  {
    auth: true,
    params: offerItemParamsSchema,
    response: {
      204: t.Void({ description: 'Offer item deleted successfully' }),
      404: t.Object({ error: t.String() }),
    },
    detail: {
      summary: 'Delete a description line from the public proposal',
      operationId: 'deleteBudgetOfferItem',
    },
  }
);
