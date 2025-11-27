import Elysia, { t } from "elysia";
import { authMacro } from "~/auth";
import { prisma } from "~/db/client";

export const createEquipmentRoute = new Elysia().macro(authMacro).post(
  "/",
  async ({ user, body }) => {
    const { name, category, purchasePrice, rentalPercentage, stockTotal } =
      body;

    const baseRentalPrice = purchasePrice * (rentalPercentage / 100);

    const created = await prisma.equipment.create({
      data: {
        name,
        category,
        purchasePrice: purchasePrice.toString(),
        rentalPercentage,
        baseRentalPrice: baseRentalPrice.toString(),
        stockTotal: stockTotal ?? 0,
        createdById: user.id,
      },
    });

    return created;
  },
  {
    auth: true,
    body: t.Object(
      {
        name: t.String({ description: "Equipment name" }),
        category: t.String({ description: "Equipment category" }),
        purchasePrice: t.Number({ description: "Purchase price as number" }),
        rentalPercentage: t.Number({ description: "Rental percent" }),
        stockTotal: t.Optional(
          t.Number({
            description: "Total stock available for rental",
          })
        ),
      },
      {
        description: "Payload to create a new equipment",
      }
    ),
    response: {
      200: t.Object(
        {
          id: t.String({
            description: "Created equipment ID",
          }),
        },
        {
          description: "Response containing the ID of the created equipment",
        }
      ),
    },
    detail: {
      summary: "Create a new equipment",
      operationId: "createEquipment",
    },
  }
);
