import Elysia, { t } from "elysia";
import { authMacro } from "~/auth";
import { prisma } from "~/db/client";

export const updateEquipmentRoute = new Elysia().macro(authMacro).put(
  "/:id",
  async ({ params, body, set }) => {
    const { id } = params as { id: string };

    await prisma.equipment.update({
      where: { id },
      data: {
        name: body.name,
        category: body.category,
        purchasePrice:
          body.purchasePrice != null ? String(body.purchasePrice) : undefined,
        rentalPercentage: body.rentalPercentage,
        baseRentalPrice:
          body.purchasePrice != null && body.rentalPercentage != null
            ? String(body.purchasePrice * (body.rentalPercentage / 100))
            : undefined,
        stockTotal: body.stockTotal,
      },
    });

    set.status = 201;
    return { message: "Equipment updated successfully" };
  },
  {
    auth: true,
    params: t.Object(
      {
        id: t.String({
          description: "Equipment ID",
        }),
      },
      {
        description: "Parameters for updating equipment",
      }
    ),
    body: t.Object(
      {
        name: t.Optional(
          t.String({
            description: "Equipment name",
          })
        ),
        category: t.Optional(
          t.String({
            description: "Equipment category",
          })
        ),
        purchasePrice: t.Optional(
          t.Number({
            description: "Purchase price as number",
          })
        ),
        rentalPercentage: t.Optional(
          t.Number({
            description: "Rental percentage",
          })
        ),
        stockTotal: t.Optional(
          t.Number({
            description: "Total stock available",
          })
        ),
      },
      {
        description: "Body for updating equipment",
      }
    ),
    response: {
      201: t.Object(
        {
          message: t.String({
            description: "Success message",
          }),
        },
        {
          description: "Response after updating equipment",
        }
      ),
    },

    detail: {
      summary: "Update an existing equipment",
      operationId: "updateEquipment",
    },
  }
);
