import type { BudgetStatus, Prisma } from "@prisma/client";
import type { Static } from "@sinclair/typebox";
import Elysia, { t } from "elysia";
import { prisma } from "~/db/client";

const QuerySchema = t.Object({
  "f.filter": t.Optional(t.String()),
  "p.page": t.Optional(t.Number({ default: 1 })),
  "p.pageSize": t.Optional(t.Number({ default: 20 })),
  "f.status": t.Optional(t.Union([t.Literal("DRAFT"), t.Literal("CONFIRMED")])),
  "ob.createdAt": t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
  "ob.finalValue": t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
  "ob.clientName": t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
});

type Query = Static<typeof QuerySchema>;

const BudgetShape = t.Object(
  {
    id: t.String({
      description: "Budget ID",
    }),
    clientName: t.String({
      description: "Name of the client for the budget",
    }),
    status: t.String({
      description: "Current status of the budget",
    }),
    totalValue: t.Number({
      description: "Total value of the budget before discount",
    }),
    finalValue: t.Number({
      description: "Final value of the budget after discount",
    }),
    discount: t.Number({
      description: "Discount applied to the budget",
    }),
    createdAt: t.Date({
      description: "Date when the budget was created",
    }),
  },
  {
    description: "Shape of a budget in the list of budgets",
  }
);

export const listBudgetsRoute = new Elysia().get(
  "/",
  async ({ query }: { query: Query }) => {
    const page = Number(query["p.page"] ?? 1);
    const pageSize = Number(query["p.pageSize"] ?? 20);
    const offset = (Math.max(page, 1) - 1) * pageSize;

    const filters: Prisma.BudgetWhereInput[] = [];

    if (query["f.filter"]) {
      filters.push({
        clientName: { contains: query["f.filter"], mode: "insensitive" },
      });
    }

    if (query["f.status"]) {
      filters.push({ status: query["f.status"] as BudgetStatus });
    }

    const where: Prisma.BudgetWhereInput = filters.length
      ? { AND: filters }
      : {};

    // Ordenação: priorizar parâmetros ob.* como no get-members-route
    let orderBy: Prisma.BudgetOrderByWithRelationInput = { createdAt: "desc" };

    if (query["ob.finalValue"]) {
      orderBy = {
        finalValue: query["ob.finalValue"],
      } as Prisma.BudgetOrderByWithRelationInput;
    } else if (query["ob.clientName"]) {
      orderBy = {
        clientName: query["ob.clientName"],
      } as Prisma.BudgetOrderByWithRelationInput;
    } else if (query["ob.createdAt"]) {
      orderBy = {
        createdAt: query["ob.createdAt"],
      } as Prisma.BudgetOrderByWithRelationInput;
    }

    const [rows, totalCount] = await Promise.all([
      prisma.budget.findMany({
        where,
        skip: offset,
        take: pageSize,
        orderBy: [orderBy],
      }),
      prisma.budget.count({ where }),
    ]);

    const data = rows.map((b) => ({
      id: b.id,
      clientName: b.clientName,
      status: String(b.status),
      totalValue: Number(
        String((b as unknown as { totalValue?: unknown }).totalValue ?? 0)
      ),
      finalValue: Number(
        String((b as unknown as { finalValue?: unknown }).finalValue ?? 0)
      ),
      discount: Number(
        String((b as unknown as { discount?: unknown }).discount ?? 0)
      ),
      createdAt: b.createdAt,
    }));

    return {
      data,
      meta: {
        total: totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  },
  {
    query: QuerySchema,
    response: t.Object(
      {
        data: t.Array(BudgetShape),
        meta: t.Object(
          {
            total: t.Number({
              description: "Total number of budgets matching the query",
            }),
            page: t.Number({
              description: "Current page number",
            }),
            pageSize: t.Number({
              description: "Number of budgets per page",
            }),
            totalPages: t.Number({
              description: "Total number of pages",
            }),
          },
          {
            description: "Metadata about the pagination",
          }
        ),
      },
      {
        description:
          "Response containing the list of budgets with pagination metadata",
      }
    ),
    detail: {
      summary: "Get all budgets",
      operationId: "getBudgets",
    },
  }
);
