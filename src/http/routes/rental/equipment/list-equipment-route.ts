import type { Prisma } from '@prisma/client';
import type { Static } from '@sinclair/typebox';
import Elysia, { t } from 'elysia';
import { prisma } from '~/db/client';

const QuerySchema = t.Object({
  'f.filter': t.Optional(t.String()),
  'p.page': t.Optional(t.Number({ default: 1 })),
  'p.pageSize': t.Optional(t.Number({ default: 20 })),
  'ob.name': t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
  'ob.category': t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
  'ob.purchasePrice': t.Optional(
    t.Union([t.Literal('asc'), t.Literal('desc')])
  ),
});

type Query = Static<typeof QuerySchema>;

const EquipmentShape = t.Object({
  id: t.String(),
  name: t.String(),
  category: t.String(),
  purchasePrice: t.Number(),
  stockTotal: t.Number(),
});

export const listEquipmentRoute = new Elysia().get(
  '/',
  async ({ query }: { query: Query }) => {
    const page = Number(query['p.page'] ?? 1);
    const pageSize = Number(query['p.pageSize'] ?? 20);
    const offset = (Math.max(page, 1) - 1) * pageSize;

    const filters: Prisma.EquipmentWhereInput[] = [];

    if (query['f.filter']) {
      filters.push({
        OR: [
          { name: { contains: query['f.filter'], mode: 'insensitive' } },
          { category: { contains: query['f.filter'], mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.EquipmentWhereInput = filters.length
      ? { AND: filters }
      : {};

    // Ordenação: prioridade por parâmetros ob.* (similar ao padrão em get-members-route)
    let orderBy: Prisma.EquipmentOrderByWithRelationInput = { name: 'asc' };

    if (query['ob.purchasePrice']) {
      orderBy = { purchasePrice: query['ob.purchasePrice'] };
    } else if (query['ob.category']) {
      orderBy = { category: query['ob.category'] };
    } else if (query['ob.name']) {
      orderBy = { name: query['ob.name'] };
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
    response: t.Object({
      data: t.Array(EquipmentShape),
      meta: t.Object({
        total: t.Number(),
        page: t.Number(),
        pageSize: t.Number(),
        totalPages: t.Number(),
      }),
    }),
    detail: { summary: 'List equipments' },
  }
);
