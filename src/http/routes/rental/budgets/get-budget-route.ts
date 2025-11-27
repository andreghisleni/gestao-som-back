import type { Static } from "@sinclair/typebox";
import Elysia, { t } from "elysia";
import { prisma } from "~/db/client";

const ParamsSchema = t.Object(
  { id: t.String({ format: "uuid", description: "UUID of the budget" }) },
  {
    description: "Parameters to identify the budget",
  }
);

const EquipmentShape = t.Object({
  id: t.String({
    description: "Equipment ID",
  }),
  name: t.String({
    description: "Equipment name",
  }),
  category: t.String({
    description: "Equipment category",
  }),
  purchasePrice: t.Union(
    [
      t.Number({
        description: "Purchase price as number",
      }),
      t.Null({
        description: "Purchase price as number",
      }),
    ],
    {
      description: "Purchase price of the equipment",
    }
  ),
  rentalPercentage: t.Union(
    [
      t.Number({
        description: "Rental percentage as number",
      }),
      t.Null({
        description: "Rental percentage as number",
      }),
    ],
    {
      description: "Rental percentage of the equipment",
    }
  ),
  baseRentalPrice: t.Union(
    [
      t.Number({
        description: "Base rental price as number",
      }),
      t.Null({
        description: "Base rental price as number",
      }),
    ],
    {
      description: "Base rental price of the equipment",
    }
  ),
  stockTotal: t.Union(
    [
      t.Number({
        description: "Total stock as number",
      }),
      t.Null({
        description: "Total stock as number",
      }),
    ],
    {
      description: "Total stock available for rental",
    }
  ),
});

const BudgetItemShape = t.Object({
  id: t.String({
    description: "Budget item ID",
  }),
  equipmentId: t.String({
    description: "Associated equipment ID",
  }),
  quantity: t.Number({
    description: "Quantity of the equipment in the budget item",
  }),
  unitPrice: t.Union(
    [
      t.Number({
        description: "Unit price of the equipment in the budget item",
      }),
      t.Null({
        description: "Unit price of the equipment in the budget item",
      }),
    ],
    {
      description: "Unit price of the equipment in the budget item",
    }
  ),
  subtotal: t.Union(
    [
      t.Number({
        description: "Subtotal price for the budget item",
      }),
      t.Null({
        description: "Subtotal price for the budget item",
      }),
    ],
    {
      description: "Subtotal price for the budget item",
    }
  ),
  equipment: t.Optional(EquipmentShape),
});

const BudgetSectionShape = t.Object(
  {
    id: t.String({
      description: "Budget section ID",
    }),
    name: t.String({
      description: "Name of the budget section",
    }),
    items: t.Array(BudgetItemShape),
  },
  {
    description: "Section of the budget",
  }
);

const CreatorShape = t.Object(
  {
    id: t.String({
      description: "Creator user ID",
    }),
    name: t.Optional(
      t.String({
        description: "Creator user name",
      })
    ),
  },
  {
    description: "Information about the user who created the budget",
  }
);

const BudgetFullShape = t.Object({
  id: t.String({
    description: "Budget ID",
  }),
  clientName: t.String({
    description: "Name of the client for the budget",
  }),
  eventDate: t.Date({
    description: "Date of the event for the budget",
  }),
  status: t.String({
    description: "Current status of the budget",
  }),
  totalValue: t.Union(
    [
      t.Number({
        description: "Total value of the budget before discount",
      }),
      t.Null({
        description: "Total value of the budget before discount",
      }),
    ],
    {
      description: "Total value of the budget before discount",
    }
  ),
  discount: t.Union(
    [
      t.Number({
        description: "Discount applied to the budget",
      }),
      t.Null({
        description: "Discount applied to the budget",
      }),
    ],
    {
      description: "Discount applied to the budget",
    }
  ),
  finalValue: t.Union(
    [
      t.Number({
        description: "Final value of the budget after discount",
      }),
      t.Null({
        description: "Final value of the budget after discount",
      }),
    ],
    {
      description: "Final value of the budget after discount",
    }
  ),
  createdAt: t.Date({
    description: "Date when the budget was created",
  }),
  createdBy: CreatorShape,
  sections: t.Array(BudgetSectionShape),
});

export const getBudgetRoute = new Elysia().get(
  "/:id",
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
      return { error: "Budget not found" };
    }

    // Retorna o objeto conforme veio do Prisma (sem mapeamentos desnecessários).
    return budget as unknown as Static<typeof BudgetFullShape>;
  },
  {
    params: ParamsSchema,
    response: {
      200: BudgetFullShape,
      404: t.Object(
        {
          error: t.String({
            description: "Error message indicating budget not found",
          }),
        },
        {
          description: "Response when the budget is not found",
        }
      ),
    },
    detail: {
      summary: "Get a budget by ID",
      operationId: "getBudget",
    },
  }
);
