import type { Static } from '@sinclair/typebox';
import Elysia, { t } from 'elysia';
import { prisma } from '~/db/client';

const ParamsSchema = t.Object({ id: t.String({ format: 'uuid' }) });

const EquipmentShape = t.Object({
  id: t.String(),
  name: t.String(),
  category: t.String(),
  purchasePrice: t.Union([t.Number(), t.String(), t.Null()]),
  rentalPercentage: t.Union([t.Number(), t.String(), t.Null()]),
  baseRentalPrice: t.Union([t.Number(), t.String(), t.Null()]),
  stockTotal: t.Union([t.Number(), t.String(), t.Null()]),
});

const BudgetItemShape = t.Object({
  id: t.String(),
  equipmentId: t.String(),
  quantity: t.Number(),
  unitPrice: t.Union([t.Number(), t.String(), t.Null()]),
  subtotal: t.Union([t.Number(), t.String(), t.Null()]),
  equipment: t.Optional(EquipmentShape),
});

const BudgetSectionShape = t.Object({
  id: t.String(),
  name: t.String(),
  items: t.Array(BudgetItemShape),
});

const CreatorShape = t.Object({ id: t.String(), name: t.Optional(t.String()) });

const BudgetFullShape = t.Object({
  id: t.String(),
  clientName: t.String(),
  eventDate: t.Date(),
  status: t.String(),
  totalValue: t.Union([t.Number(), t.String(), t.Null()]),
  discount: t.Union([t.Number(), t.String(), t.Null()]),
  finalValue: t.Union([t.Number(), t.String(), t.Null()]),
  createdAt: t.Date(),
  createdBy: CreatorShape,
  sections: t.Array(BudgetSectionShape),
});

export const getBudgetRoute = new Elysia().get(
  '/:id',
  async ({ params }) => {
    const { id } = params;

    const budget = await prisma.budget.findUnique({
      where: { id },
      include: {
        sections: { include: { items: { include: { equipment: true } } } },
        createdBy: true,
      },
    });

    if (!budget) {
      return { error: 'Budget not found' };
    }

    // Retorna o objeto conforme veio do Prisma (sem mapeamentos desnecessários).
    return budget as unknown as Static<typeof BudgetFullShape>;
  },
  {
    params: ParamsSchema,
    response: {
      200: BudgetFullShape,
      404: t.Object({ error: t.String() }),
    },
  }
);
