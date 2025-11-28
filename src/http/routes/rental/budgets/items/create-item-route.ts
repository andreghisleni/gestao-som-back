import { Prisma } from '@db/client';
import Elysia, { t } from 'elysia';
import { authMacro } from '~/auth';
import { prisma } from '~/db/client';

const sectionParamsSchema = t.Object({
  sectionId: t.String({ format: 'uuid' }),
});

const createItemBodySchema = t.Object(
  {
    equipmentId: t.String({ format: 'uuid' }),
    quantity: t.Number({ minimum: 1 }),
    customUnitPrice: t.Optional(t.Number()),
  },
  {
    description: 'Schema for adding an equipment to a section',
  }
);

export const createBudgetItemRoute = new Elysia().macro(authMacro).post(
  '/sections/:sectionId/items',
  async ({ body, params, set }) => {
    const section = await prisma.budgetSection.findUnique({
      where: { id: params.sectionId },
      include: { budget: true },
    });

    if (!section) {
      set.status = 404;
      return { error: 'Budget Section not found' };
    }

    const equipment = await prisma.equipment.findUnique({
      where: { id: body.equipmentId },
    });

    if (!equipment) {
      set.status = 404;
      return { error: 'Equipment not found' };
    }

    // Lógica do Preço Unitário (Snapshot)
    let unitPriceDecimal: Prisma.Decimal;

    if (body.customUnitPrice !== undefined) {
      unitPriceDecimal = new Prisma.Decimal(body.customUnitPrice);
    } else if (equipment.rentalPrice) {
      unitPriceDecimal = equipment.rentalPrice;
    } else {
      unitPriceDecimal = new Prisma.Decimal(0);
    }

    const subtotalDecimal = unitPriceDecimal.mul(body.quantity);

    await prisma.$transaction(async (tx) => {
      // 1. Cria o Item
      await tx.budgetItem.create({
        data: {
          sectionId: params.sectionId,
          equipmentId: body.equipmentId,
          quantity: body.quantity,
          unitPrice: unitPriceDecimal,
          subtotal: subtotalDecimal,
        },
      });

      // 2. Atualiza o Orçamento Pai
      await tx.budget.update({
        where: { id: section.budgetId },
        data: {
          totalValue: { increment: subtotalDecimal },
          finalValue: { increment: subtotalDecimal },
        },
      });
    });

    set.status = 201;
  },
  {
    auth: true,
    params: sectionParamsSchema,
    body: createItemBodySchema,
    response: {
      201: t.Void({ description: 'Item added and budget updated' }),
      404: t.Object({ error: t.String() }),
    },
    detail: {
      summary: 'Add equipment item to a budget section',
      operationId: 'createBudgetItem',
    },
  }
);
