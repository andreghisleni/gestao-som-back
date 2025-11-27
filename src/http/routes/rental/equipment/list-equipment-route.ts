import type { Prisma } from "@prisma/client";
import type { Static } from "@sinclair/typebox";
import Elysia, { t } from "elysia";
import { prisma } from "~/db/client";

const QuerySchema = t.Object({
  "f.filter": t.Optional(
    t.String({
      description: "Filter to search equipment by name or category",
    })
  ),
  "p.page": t.Optional(
    t.Number({ default: 1, description: "Page number for pagination" })
  ),
  "p.pageSize": t.Optional(
    t.Number({ default: 20, description: "Number of items per page" })
  ),
  "ob.name": t.Optional(
    t.Union(
      [
        t.Literal("asc", {
          description: "Sort by name in ascending order",
        }),
        t.Literal("desc", {
          description: "Sort by name in descending order",
        }),
      ],
      {
        description: "Order by name",
      }
    )
  ),
  "ob.category": t.Optional(
    t.Union(
      [
        t.Literal("asc", {
          description: "Sort by category in ascending order",
        }),
        t.Literal("desc", {
          description: "Sort by category in descending order",
        }),
      ],
      {
        description: "Order by category",
      }
    )
  ),
  "ob.purchasePrice": t.Optional(
    t.Union(
      [
        t.Literal("asc", {
          description: "Sort by purchase price in ascending order",
        }),
        t.Literal("desc", {
          description: "Sort by purchase price in descending order",
        }),
      ],
      {
        description: "Order by purchase price",
      }
    )
  ),
});

type Query = Static<typeof QuerySchema>;

const EquipmentShape = t.Object(
  {
    id: t.String({
      description: "Equipment ID",
    }),
    name: t.String({
      description: "Equipment name",
    }),
    category: t.String({
      description: "Equipment category",
    }),
    purchasePrice: t.Number({
      description: "Purchase price of the equipment",
    }),
    stockTotal: t.Number({
      description: "Total stock available for rental",
    }),
  },
  {
    description: "Shape representing equipment details",
  }
);

export const listEquipmentRoute = new Elysia().get(
  "/",
  async ({ query }: { query: Query }) => {
    const page = Number(query["p.page"] ?? 1);
    const pageSize = Number(query["p.pageSize"] ?? 20);
    const offset = (Math.max(page, 1) - 1) * pageSize;

    const filters: Prisma.EquipmentWhereInput[] = [];

    if (query["f.filter"]) {
      filters.push({
        OR: [
          { name: { contains: query["f.filter"], mode: "insensitive" } },
          { category: { contains: query["f.filter"], mode: "insensitive" } },
        ],
      });
    }

    const where: Prisma.EquipmentWhereInput = filters.length
      ? { AND: filters }
      : {};

    // Ordenação: prioridade por parâmetros ob.* (similar ao padrão em get-members-route)
    let orderBy: Prisma.EquipmentOrderByWithRelationInput = { name: "asc" };

    if (query["ob.purchasePrice"]) {
      orderBy = { purchasePrice: query["ob.purchasePrice"] };
    } else if (query["ob.category"]) {
      orderBy = { category: query["ob.category"] };
    } else if (query["ob.name"]) {
      orderBy = { name: query["ob.name"] };
    }

    const [data, totalResult] = await Promise.all([
      prisma.equipment.findMany({
        where,
        skip: offset,
        take: pageSize,
        orderBy: [orderBy],
      }),
      prisma.equipment.count({ where }),
    ]);

    const total = totalResult;

    const mapped = data.map((e) => ({
      id: e.id,
      name: e.name,
      category: e.category,
      purchasePrice: Number(
        String((e as unknown as { purchasePrice?: unknown }).purchasePrice ?? 0)
      ),
      stockTotal: e.stockTotal,
    }));

    return {
      data: mapped,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  },
  {
    query: QuerySchema,
    response: t.Object(
      {
        data: t.Array(EquipmentShape),
        meta: t.Object(
          {
            total: t.Number({
              description: "Total number of equipments matching the query",
            }),
            page: t.Number({
              description: "Current page number",
            }),
            pageSize: t.Number({
              description: "Number of equipments per page",
            }),
            totalPages: t.Number({
              description: "Total number of pages available",
            }),
          },
          {
            description: "Metadata about the pagination",
          }
        ),
      },
      {
        description:
          "Response containing the list of equipments and pagination metadata",
      }
    ),
    detail: {
      summary: "Get all equipments",
      operationId: "getEquipments",
    },
  }
);
