import { Prisma } from '@db/client';
import Elysia, { t } from 'elysia';
import { prisma } from '~/db/client';
import { buildProtocol, serviceDurationMinutes } from '~/utils/share-token';
import { clientIp, findPublicBudget, isLinkUsable, NOT_FOUND } from './helpers';
import { submitBodySchema } from './schemas';
import { buildDetailsData, collectSubmissionErrors } from './validators';

const tokenParamsSchema = t.Object({
  token: t.String({ minLength: 10, maxLength: 40 }),
});

export const submitResponseSchema = t.Object(
  {
    protocol: t.String({
      description: 'Código curto para o cliente citar no WhatsApp',
    }),
    submittedAt: t.Date(),
    agreedValue: t.Number(),
    status: t.String(),
    durationMinutes: t.Nullable(
      t.Number({ description: 'Início → término, já com a virada de dia' })
    ),
    alreadySubmitted: t.Boolean(),
  },
  { description: 'Confirmação do envio dos dados do evento' }
);

/**
 * Envio final do wizard: valida tudo, grava rascunho + aceite e avança o status.
 *
 * Decisões deliberadas:
 *  - o aceite é idempotente por design. Reenviar depois de corrigir um dado
 *    não registra um novo aceite nem reescreve `acceptedAt` enquanto o valor
 *    for o mesmo; se o valor mudou, o cliente está aceitando outra proposta e
 *    o registro precisa ser novo;
 *  - `CONFIRMED` nunca é rebaixado de volta: contrato já emitido não se
 *    reabre por um submit;
 *  - nada de preço decomposto aqui dentro; `agreedValue` é só o que já estava
 *    na proposta.
 */
export const submitEventDetailsRoute = new Elysia().post(
  '/:token/submit',
  async ({ params, body, set, request }) => {
    const budget = await findPublicBudget(params.token);
    if (!isLinkUsable(budget)) {
      set.status = 404;
      return NOT_FOUND;
    }

    const errors = collectSubmissionErrors(body);
    if (errors.length > 0) {
      set.status = 400;
      return {
        error: 'Revise os campos destacados antes de enviar.',
        fields: errors,
      };
    }

    const detailsData = buildDetailsData(body);
    const submittedAt = new Date();
    const alreadySubmitted = Boolean(budget.details?.completedAt);

    const acceptedValue = new Prisma.Decimal(budget.finalValue);
    const needsNewAcceptance =
      !budget.acceptance ||
      Number(budget.acceptance.acceptedValue) !== Number(acceptedValue);

    await prisma.$transaction([
      prisma.eventDetails.upsert({
        where: { budgetId: budget.id },
        create: {
          budgetId: budget.id,
          ...detailsData,
          stepSeen: 6,
          completedAt: submittedAt,
        },
        update: {
          ...detailsData,
          stepSeen: 6,
          completedAt: submittedAt,
        },
      }),
      ...(needsNewAcceptance
        ? [
            prisma.budgetAcceptance.upsert({
              where: { budgetId: budget.id },
              create: {
                budgetId: budget.id,
                acceptedName: body.acceptance.name.trim(),
                acceptedValue,
                acceptedAt: submittedAt,
                acceptedIp: clientIp(request),
                userAgent: request.headers.get('user-agent'),
              },
              update: {
                acceptedName: body.acceptance.name.trim(),
                acceptedValue,
                acceptedAt: submittedAt,
                acceptedIp: clientIp(request),
                userAgent: request.headers.get('user-agent'),
              },
            }),
          ]
        : []),
      // Reabrir um orçamento já confirmado é decisão sua, não do cliente.
      ...(budget.status === 'CONFIRMED'
        ? []
        : [
            prisma.budget.update({
              where: { id: budget.id },
              data: { status: 'DETAILS_SENT' },
            }),
          ]),
    ]);

    const fresh = await findPublicBudget(params.token);
    const details = fresh?.details;

    return {
      protocol: buildProtocol(params.token, budget.eventDate),
      submittedAt,
      agreedValue: Number(fresh?.finalValue ?? budget.finalValue),
      status: fresh?.status ?? budget.status,
      durationMinutes: serviceDurationMinutes({
        startTime: details?.startTime,
        endTime: details?.endTime,
        endsNextDay: details?.endsNextDay,
      }),
      alreadySubmitted,
    };
  },
  {
    params: tokenParamsSchema,
    body: submitBodySchema,
    response: {
      200: submitResponseSchema,
      400: t.Object({ error: t.String(), fields: t.Array(t.String()) }),
      404: t.Object({ error: t.String() }),
    },
    detail: {
      summary: 'Submit event details and accept the agreed value (public)',
      operationId: 'submitPublicEventDetails',
    },
  }
);
