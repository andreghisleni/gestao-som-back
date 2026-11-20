import Elysia, { t } from 'elysia';
import { prisma } from '~/db/client';
import { findPublicBudget, isLinkUsable, NOT_FOUND } from './helpers';
import { draftBodySchema, publicBudgetSchema, toPublicBudget } from './schemas';
import { normalizeDraft } from './validators';

const tokenParamsSchema = t.Object({
  token: t.String({ minLength: 10, maxLength: 40 }),
});

/**
 * Autosave do wizard.
 *
 * Aceita um subconjunto por vez (uma etapa), nunca exige payload completo e
 * nunca muda `status`. Responde o orçamento inteiro já no formato público: o
 * front usa a mesma função de hidratação da carga inicial, então "salvar e
 * continuar depois" retoma exatamente de onde parou.
 */
export const saveEventDetailsRoute = new Elysia().patch(
  '/:token/details',
  async ({ params, body, set }) => {
    const budget = await findPublicBudget(params.token);
    if (!isLinkUsable(budget)) {
      set.status = 404;
      return NOT_FOUND;
    }

    if (budget.details?.completedAt) {
      set.status = 409;
      return {
        error:
          'Estes dados já foram enviados. Peça a correção pelo WhatsApp ou pelo telefone da proposta.',
      };
    }

    const data = normalizeDraft(body);
    const stepSeen =
      body.step != null
        ? Math.max(budget.details?.stepSeen ?? 0, body.step)
        : undefined;

    await prisma.eventDetails.upsert({
      where: { budgetId: budget.id },
      create: {
        budgetId: budget.id,
        ...data,
        ...(stepSeen != null && { stepSeen }),
      },
      update: { ...data, ...(stepSeen != null && { stepSeen }) },
    });

    const fresh = await findPublicBudget(params.token);
    return toPublicBudget(fresh as NonNullable<typeof fresh>);
  },
  {
    params: tokenParamsSchema,
    body: draftBodySchema,
    response: {
      200: publicBudgetSchema,
      404: t.Object({ error: t.String() }),
      409: t.Object({ error: t.String() }),
    },
    detail: {
      summary:
        'Save a partial draft of the event details (public, token-scoped)',
      operationId: 'savePublicEventDetails',
    },
  }
);
