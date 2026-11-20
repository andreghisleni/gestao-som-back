import Elysia, { t } from 'elysia';
import { authMacro } from '~/auth';
import { prisma } from '~/db/client';

const budgetParamsSchema = t.Object({
  budgetId: t.String({ format: 'uuid' }),
});

const orderBodySchema = t.Object(
  {
    ids: t.Array(t.String({ format: 'uuid' }), {
      minItems: 1,
      maxItems: 12,
      description: 'Ids na ordem desejada, de cima para baixo',
    }),
  },
  { description: 'Nova ordem das linhas da proposta pública' }
);

/**
 * Ordem é o que faz a proposta ler bem: "Sistema de som" antes de
 * "Microfones". Persistimos o índice explícito em vez de depender de createdAt
 * porque linha editada não deve mudar de lugar.
 */
export const orderOfferItemsRoute = new Elysia().macro(authMacro).patch(
  '/:budgetId/offer-items/order',
  async ({ params, body, user, set }) => {
    const budget = await prisma.budget.findFirst({
      where: { id: params.budgetId, userId: user.id },
      select: { id: true, offerItems: { select: { id: true } } },
    });
    if (!budget) {
      set.status = 404;
      return { error: 'Budget not found' };
    }

    const owned = new Set(budget.offerItems.map((item) => item.id));
    // `body` chega como any pela forma como o macro de auth resolve o contexto
    // neste handler (retorna void); a validação de tipos é nossa aqui.
    const ids: string[] = body.ids;
    if (ids.some((id: string) => !owned.has(id))) {
      set.status = 400;
      return { error: 'Um dos ids não pertence a este orçamento' };
    }

    await prisma.$transaction(
      ids.map((id: string, index: number) =>
        prisma.budgetOfferItem.update({ where: { id }, data: { order: index } })
      )
    );

    set.status = 204;
  },
  {
    auth: true,
    params: budgetParamsSchema,
    body: orderBodySchema,
    response: {
      204: t.Void({ description: 'Offer items reordered' }),
      400: t.Object({ error: t.String() }),
      404: t.Object({ error: t.String() }),
    },
    detail: {
      summary: 'Reorder the description lines of the public proposal',
      operationId: 'orderBudgetOfferItems',
    },
  }
);
