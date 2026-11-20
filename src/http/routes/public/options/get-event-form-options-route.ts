import Elysia, { t } from 'elysia';
import { formOptionsPayload } from '~/constants/event-options';

const optionSchema = t.Object({
  id: t.String(),
  label: t.String(),
  hint: t.Optional(t.String()),
});

const formOptionsSchema = t.Object(
  {
    musicStyles: t.Array(optionSchema),
    eventTypes: t.Array(optionSchema),
    accessNotes: t.Array(optionSchema),
    powerSupply: t.Array(optionSchema),
    internetAvailability: t.Array(optionSchema),
    venueSizes: t.Array(optionSchema),
    startsFlexibility: t.Array(optionSchema),
    requestedExtras: t.Array(optionSchema),
    contractorTypes: t.Array(optionSchema),
  },
  { description: 'Catálogos usados pelo formulário público' }
);

/**
 * As listas de escolha vêm do servidor de propósito.
 *
 * Estilo musical e opções de acesso mudam com frequência e precisam ser os
 * mesmos ids que a validação de `submit` aceita. Deixar isso só no front
 * garantia deriva entre as partes.
 */
export const getEventFormOptionsRoute = new Elysia().get(
  '/options',
  () => formOptionsPayload(),
  {
    response: { 200: formOptionsSchema },
    detail: {
      summary: 'List option catalogs for the public event-details form',
      operationId: 'getEventFormOptions',
    },
  }
);
