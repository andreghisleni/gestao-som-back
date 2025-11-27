import type { BudgetStatus, Prisma } from '@prisma/client';
import type { Static } from '@sinclair/typebox';
import Elysia, { t } from 'elysia';
import { prisma } from '~/db/client';

const QuerySchema = t.Object({
  'f.filter': t.Optional(t.String()),
  'p.page': t.Optional(t.Number({ default: 1 })),
  'p.pageSize': t.Optional(t.Number({ default: 20 })),
  'f.status': t.Optional(t.Union([t.Literal('DRAFT'), t.Literal('CONFIRMED')])),
  'ob.createdAt': t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
  'ob.finalValue': t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
  'ob.clientName': t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
});

type Query = Static<typeof QuerySchema>;

const BudgetShape = t.Object({
  id: t.String(),
  clientName: t.String(),
  status: t.String(),
  totalValue: t.Number(),
  finalValue: t.Number(),
  discount: t.Number(),
  createdAt: t.Date(),
});

export const listBudgetsRoute = new Elysia().get(
  '/',
  async ({ query }: { query: Query }) => {
    const page = Number(query['p.page'] ?? 1);
    const pageSize = Number(query['p.pageSize'] ?? 20);
    const offset = (Math.max(page, 1) - 1) * pageSize;

    const filters: Prisma.BudgetWhereInput[] = [];

    if (query['f.filter']) {
      filters.push({
        clientName: { contains: query['f.filter'], mode: 'insensitive' },
      });
    }

    if (query['f.status']) {
      filters.push({ status: query['f.status'] as BudgetStatus });
    }

    const where: Prisma.BudgetWhereInput = filters.length
      ? { AND: filters }
      : {};

    // Ordenação: priorizar parâmetros ob.* como no get-members-route
    let orderBy: Prisma.BudgetOrderByWithRelationInput = { createdAt: 'desc' };

    if (query['ob.finalValue']) {
      orderBy = {
        finalValue: query['ob.finalValue'],
      } as Prisma.BudgetOrderByWithRelationInput;
    } else if (query['ob.clientName']) {
      orderBy = {
        clientName: query['ob.clientName'],
      } as Prisma.BudgetOrderByWithRelationInput;
    } else if (query['ob.createdAt']) {
      orderBy = {
        createdAt: query['ob.createdAt'],
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
    response: t.Object({
      data: t.Array(BudgetShape),
      meta: t.Object({
        total: t.Number(),
        page: t.Number(),
        pageSize: t.Number(),
        totalPages: t.Number(),
      }),
    }),
  }
);
