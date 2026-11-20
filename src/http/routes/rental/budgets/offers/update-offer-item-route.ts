import Elysia, { t } from 'elysia';
import { authMacro } from '~/auth';
import { prisma } from '~/db/client';

const offerItemParamsSchema = t.Object({
  budgetId: t.String({ format: 'uuid' }),
  id: t.String({ format: 'uuid' }),
});

const updateOfferItemBodySchema = t.Object({
  name: t.Optional(t.String({ minLength: 2, maxLength: 120 })),
  detail: t.Optional(t.Nullable(t.String({ maxLength: 280 }))),
  order: t.Optional(t.Number({ minimum: 0, maximum: 50 })),
});

/**
 * Editar uma linha da proposta pública é a operação central do seu fluxo de
 * revisão: o que o cliente lê como "sistema de karaokê com 30 mil músicas"
 * é escrito aqui, e a proposta em si (valores e itens) não muda.
 */
export const updateOfferItemRoute = new Elysia().macro(authMacro).put(
  '/:budgetId/offer-items/:id',
  async ({ params, body, user, set }) => {
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

    await prisma.budgetOfferItem.update({
      where: { id: item.id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.detail !== undefined && {
          detail: body.detail?.trim() || null,
        }),
        ...(body.order !== undefined && { order: body.order }),
        // Uma linha AUTO que foi editada passa a ser sua.
        source: 'MANUAL',
      },
    });

    set.status = 201;
  },
  {
    auth: true,
    params: offerItemParamsSchema,
    body: updateOfferItemBodySchema,
    response: {
      201: t.Void({ description: 'Offer item updated successfully' }),
      404: t.Object({ error: t.String() }),
    },
    detail: {
      summary: 'Update a description line of the public proposal',
      operationId: 'updateBudgetOfferItem',
    },
  }
);
