import Elysia, { t } from 'elysia';
import { authMacro } from '~/auth';
import { prisma } from '~/db/client';

const budgetParamsSchema = t.Object({
  budgetId: t.String({ format: 'uuid' }),
});

export const offerItemBodySchema = t.Object(
  {
    name: t.String({
      minLength: 2,
      maxLength: 120,
      description: 'Ex.: "Sistema de som"',
    }),
    detail: t.Optional(
      t.Nullable(
        t.String({
          maxLength: 280,
          description: 'Ex.: "PA + subgrave para até 200 pessoas"',
        })
      )
    ),
    order: t.Optional(t.Number({ minimum: 0, maximum: 50 })),
  },
  { description: 'Linha exibida na proposta pública' }
);

/**
 * Cria uma linha de "o que está incluso".
 *
 * Estas linhas são texto de venda, não catálogo: sem equipamento, sem
 * quantidade e sem preço. Quem precifica continuam sendo os `BudgetItem`.
 */
export const createOfferItemRoute = new Elysia().macro(authMacro).post(
  '/:budgetId/offer-items',
  async ({ params, body, user, set }) => {
    const budget = await prisma.budget.findFirst({
      where: { id: params.budgetId, userId: user.id },
      select: { id: true, offerItems: { select: { id: true } } },
    });
    if (!budget) {
      set.status = 404;
      return { error: 'Budget not found' };
    }
    if (budget.offerItems.length >= 12) {
      set.status = 400;
      return { error: 'Máximo de 12 linhas na proposta pública' };
    }

    const created = await prisma.budgetOfferItem.create({
      data: {
        budgetId: budget.id,
        name: body.name.trim(),
        detail: body.detail?.trim() || null,
        order: body.order ?? budget.offerItems.length,
        source: 'MANUAL',
      },
    });

    set.status = 201;
    return { id: created.id };
  },
  {
    auth: true,
    params: budgetParamsSchema,
    body: offerItemBodySchema,
    response: {
      201: t.Object({ id: t.String({ format: 'uuid' }) }),
      400: t.Object({ error: t.String() }),
      404: t.Object({ error: t.String() }),
    },
    detail: {
      summary: 'Add a description line to the public proposal',
      operationId: 'createBudgetOfferItem',
    },
  }
);
