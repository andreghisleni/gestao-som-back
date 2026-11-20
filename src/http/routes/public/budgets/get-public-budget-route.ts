import Elysia, { t } from 'elysia';
import { prisma } from '~/db/client';
import { findPublicBudget, isLinkUsable, NOT_FOUND } from './helpers';
import { publicBudgetSchema, toPublicBudget } from './schemas';

const tokenParamsSchema = t.Object({
  token: t.String({
    minLength: 10,
    maxLength: 40,
    description: 'Token opaco do link público do orçamento',
  }),
});

export const getPublicBudgetRoute = new Elysia().get(
  '/:token',
  async ({ params, set }) => {
    const budget = await findPublicBudget(params.token);
    if (!isLinkUsable(budget)) {
      set.status = 404;
      return NOT_FOUND;
    }

    // Contagem de visualização é sinal para você ("o cliente abriu 4x e não
    // respondeu") e não pode travar a leitura: falha aqui é só perda de métrica.
    try {
      await prisma.budget.update({
        where: { id: budget.id },
        data: { publicViewCount: { increment: 1 } },
      });
    } catch {
      // ignore
    }

    return toPublicBudget(budget);
  },
  {
    params: tokenParamsSchema,
    response: {
      200: publicBudgetSchema,
      404: t.Object({ error: t.String() }),
    },
    detail: {
      summary: 'Get budget proposal for the public event-details page',
      description:
        'Rota SEM autenticação, autorizada pelo token. Retorna apenas o valor ' +
        'acordado e as linhas de descrição editáveis: nada de preço por item, ' +
        'equipamento, mão de obra, frete ou desconto.',
      operationId: 'getPublicBudget',
    },
  }
);
