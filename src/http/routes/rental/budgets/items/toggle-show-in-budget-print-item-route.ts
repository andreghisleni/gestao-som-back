import Elysia, { t } from 'elysia';
import { authMacro } from '~/auth';
import { prisma } from '~/db/client';

const itemParamsSchema = t.Object({
  id: t.String({ format: 'uuid' }), // ID do Item
  budgetId: t.String({ format: 'uuid' }), // ID do Orçamento (para segurança)
});

export const toggleShowInBudgetPrintRoute = new Elysia().macro(authMacro).put(
  '/:budgetId/items/:id/toggle-show-in-budget-print',
  async ({ params, set }) => {
    // 1. Busca Item, Seção e Orçamento
    const item = await prisma.budgetItem.findUnique({
      where: { id: params.id },
      include: {
        section: { include: { budget: true } },
      },
    });

    if (!item) {
      set.status = 404;
      return { error: 'Item not found' };
    }

    if (item.section.budgetId !== params.budgetId) {
      set.status = 400;
      return { error: 'Item does not belong to this budget' };
    }

    // 2. Toggle showInBudgetPrint
    const newShowInBudgetPrint = !item.showInBudgetPrint;

    await prisma.budgetItem.update({
      where: { id: item.id },
      data: {
        showInBudgetPrint: newShowInBudgetPrint,
      },
    });

    set.status = 201;
  },
  {
    auth: true,
    params: itemParamsSchema,
    response: {
      201: t.Void({ description: 'Item updated' }),
      404: t.Object({ error: t.String() }),
      400: t.Object({ error: t.String() }),
    },
    detail: {
      summary: 'Toggle showInBudgetPrint for a budget item',
      operationId: 'toggleShowInBudgetPrint',
    },
  }
);
