import Elysia, { t } from 'elysia';
import { authMacro } from '~/auth';
import { prisma } from '~/db/client';

export const updateEquipmentRoute = new Elysia()
  .macro(authMacro)
  .put(
    '/:id',
    async ({ params, body }) => {
      const { id } = params as { id: string };

      const updated = await prisma.equipment.update({
        where: { id },
        data: {
          name: body.name,
          category: body.category,
          purchasePrice: body.purchasePrice != null ? String(body.purchasePrice) : undefined,
          rentalPercentage: body.rentalPercentage,
          baseRentalPrice:
            body.purchasePrice != null && body.rentalPercentage != null
              ? String(body.purchasePrice * (body.rentalPercentage / 100))
              : undefined,
          stockTotal: body.stockTotal,
        },
      });

      return updated;
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String()),
        category: t.Optional(t.String()),
        purchasePrice: t.Optional(t.Number()),
        rentalPercentage: t.Optional(t.Number()),
        stockTotal: t.Optional(t.Number()),
      }),
      response: t.Any(),
    }
  );
