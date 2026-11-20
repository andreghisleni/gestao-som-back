import type { Prisma } from "@db/client";
import { t } from "elysia";

/**
 * ÚNICO ponto onde a forma pública de um orçamento é decidida.
 *
 * Nada aqui é preenchido "por reflexo" a partir do objeto do Prisma. Se um
 * campo novo entrar em `Budget`, ele continua invisível ao cliente até ser
 * adicionado explicitamente neste arquivo — o que é exatamente o comportamento
 * que se quer numa rota sem autenticação.
 *
 * Regras de exposição acordadas:
 *  - não aparece preço de item, de mão de obra, de frete nem desconto;
 *  - não aparece equipamento, quantidade ou categoria;
 *  - aparece apenas o valor acordado (`finalValue`).
 */

export const publicBudgetInclude = {
  details: true,
  offerItems: { orderBy: { order: "asc" } },
  acceptance: true,
  /**
   * Só o pedido ainda não respondido. As cópias antigas do histórico ficam do
   * outro lado do muro: a página pública nunca lê versão anterior de resposta.
   */
  revisions: {
    where: { resolvedAt: null },
    orderBy: { version: "desc" },
    take: 1,
  },
} satisfies Prisma.BudgetInclude;

export type PublicBudgetSource = Prisma.BudgetGetPayload<{
  include: typeof publicBudgetInclude;
}>;

export const publicOfferItemSchema = t.Object({
  name: t.String({ description: "Ex.: Sistema de som" }),
  detail: t.Nullable(
    t.String({ description: "Ex.: PA + subgrave para até 200 pessoas" }),
  ),
});

export const publicEventDetailsSchema = t.Object(
  {
    id: t.String({ format: "uuid" }),

    contractorType: t.String(),
    contractorName: t.Nullable(t.String()),
    tradeName: t.Nullable(t.String()),
    /** CPF/CNPJ apenas dígitos; a máscara é responsabilidade do front. */
    document: t.Nullable(t.String()),
    email: t.Nullable(t.String()),
    phone: t.Nullable(t.String()),

    venueName: t.Nullable(t.String()),
    zipCode: t.Nullable(t.String()),
    street: t.Nullable(t.String()),
    streetNumber: t.Nullable(t.String()),
    district: t.Nullable(t.String()),
    city: t.Nullable(t.String()),
    state: t.Nullable(t.String()),
    complement: t.Nullable(t.String()),
    reference: t.Nullable(t.String()),
    accessNotes: t.Array(t.String()),
    powerSupply: t.Nullable(t.String()),
    venueSize: t.Nullable(t.String()),

    internetAvailable: t.Nullable(t.String()),
    internetDetail: t.Nullable(t.String()),

    setupTime: t.Nullable(t.String()),
    startTime: t.Nullable(t.String()),
    endTime: t.Nullable(t.String()),
    endsNextDay: t.Boolean(),
    pickupTime: t.Nullable(t.String()),
    startsFlexibility: t.Nullable(t.String()),
    onSiteContactName: t.Nullable(t.String()),
    onSiteContactPhone: t.Nullable(t.String()),

    eventType: t.Nullable(t.String()),
    guestCount: t.Nullable(t.Number()),
    musicStyles: t.Array(t.String()),
    musicStyleOther: t.Nullable(t.String()),

    requestedExtras: t.Array(t.String()),
    notes: t.Nullable(t.String()),

    stepSeen: t.Number(),
    completedAt: t.Nullable(t.Date()),
  },
  { description: "Rascunho/resultado dos dados do evento coletados" },
);

export const publicBudgetSchema = t.Object(
  {
    token: t.String(),
    clientName: t.String(),
    eventDate: t.Date(),
    status: t.String(),
    /** Valor acordado — único valor monetário que a página pública conhece. */
    agreedValue: t.Number(),
    offerItems: t.Array(publicOfferItemSchema),
    details: t.Nullable(publicEventDetailsSchema),
    acceptance: t.Nullable(
      t.Object({
        acceptedName: t.String(),
        acceptedValue: t.Number(),
        acceptedAt: t.Date(),
      }),
    ),
    submitted: t.Boolean(),
    /**
     * Pedido de revisão em aberto: o escritório congelou a resposta anterior e
     * o link voltou a aceitar envio. É a única coisa do histórico que o cliente
     * enxerga — o motivo escrito por ele, nada além disso.
     */
    revisionRequest: t.Nullable(
      t.Object({
        version: t.Number(),
        reason: t.Nullable(t.String()),
        requestedAt: t.Nullable(t.Date()),
      }),
    ),
  },
  { description: "Proposta pública, sem decomposição de preços" },
);

const str = (max = 160) => t.String({ maxLength: max });
const nstr = (max = 160) => t.Nullable(str(max));
const TIME_PATTERN = "^([01]\\d|2[0-3]):([0-5]\\d)$";

/* ------------------------------------------------------------------ */
/* Entrada                                                             */
/* ------------------------------------------------------------------ */

export const contractorInputSchema = t.Object(
  {
    type: t.Union([t.Literal("PF"), t.Literal("PJ")]),
    /** Nome completo (PF) ou razão social (PJ). */
    name: str(120),
    /** Nome fantasia — exigido apenas quando type = PJ. */
    tradeName: t.Optional(nstr(120)),
    document: t.String({ minLength: 11, maxLength: 18 }),
    email: t.String({ format: "email", maxLength: 160 }),
    phone: t.String({ minLength: 10, maxLength: 20 }),
  },
  {
    description: "Contratante sem menção a nota fiscal (emissão é por recibo)",
  },
);

export const venueInputSchema = t.Object(
  {
    venueName: t.Optional(t.Nullable(str(160))),
    // 12 de folga: colar "90.000-000" com ponto não pode virar 422. O
    // normalizador exige os 8 dígitos; a máscara é cosmética.
    zipCode: t.String({ minLength: 8, maxLength: 12 }),
    street: str(200),
    streetNumber: str(20),
    district: str(120),
    city: str(120),
    state: t.String({ minLength: 2, maxLength: 2 }),
    complement: t.Optional(t.Nullable(str(160))),
    reference: t.Optional(t.Nullable(str(280))),
    accessNotes: t.Array(t.String({ maxLength: 40 }), { maxItems: 12 }),
    powerSupply: t.Optional(t.Nullable(str(40))),
    venueSize: t.Optional(t.Nullable(str(40))),
    internetAvailable: str(40),
    internetDetail: t.Optional(t.Nullable(str(280))),
  },
  { description: "Local completo do evento" },
);

export const scheduleInputSchema = t.Object(
  {
    setupTime: t.String({ pattern: TIME_PATTERN }),
    startTime: t.String({ pattern: TIME_PATTERN }),
    endTime: t.String({ pattern: TIME_PATTERN }),
    endsNextDay: t.Boolean(),
    pickupTime: t.Optional(t.String({ pattern: TIME_PATTERN })),
    startsFlexibility: t.Optional(t.Nullable(str(40))),
    onSiteContactName: t.Optional(t.Nullable(str(120))),
    onSiteContactPhone: t.Optional(t.Nullable(str(20))),
  },
  { description: "Horários murados em HH:MM, com virada de dia explícita" },
);

export const eventInputSchema = t.Object(
  {
    eventType: t.Optional(t.Nullable(str(40))),
    guestCount: t.Optional(
      t.Nullable(t.Number({ minimum: 1, maximum: 20_000 })),
    ),
    // Sem minItems: lista vazia precisa virar erro de campo
    // (`event.musicStyles`), não 422 genérico — é assim que o front destaca a
    // etapa inteira em vermelho.
    musicStyles: t.Array(t.String({ maxLength: 40 }), { maxItems: 24 }),
    musicStyleOther: t.Optional(t.Nullable(str(280))),
    requestedExtras: t.Optional(
      t.Array(t.String({ maxLength: 40 }), { maxItems: 12 }),
    ),
    notes: t.Optional(t.Nullable(t.String({ maxLength: 2000 }))),
  },
  { description: "Repertório e detalhes do evento" },
);

export const acceptanceInputSchema = t.Object(
  {
    /** Nome digitado pelo cliente; registrado como aceite eletrônico simples. */
    name: t.String({ minLength: 3, maxLength: 120 }),
    /**
     * Honeypot: campo invisível no front. Qualquer coisa aqui indica bot e o
     * envio é descartado como inválido. O tamanho tem que ser grande o
     * suficiente para o valor do bot chegar até o validador de campos — se o
     * schema cortasse em 0, viraria 422 e entregaria que existe honeypot.
     */
    website: t.Optional(t.String({ maxLength: 200 })),
  },
  { description: "Aceite do valor acordado" },
);

export const submitBodySchema = t.Object(
  {
    contractor: contractorInputSchema,
    venue: venueInputSchema,
    schedule: scheduleInputSchema,
    event: eventInputSchema,
    acceptance: acceptanceInputSchema,
  },
  { description: "Payload completo do formulário público" },
);

/** Autosave: qualquer subconjunto, sem obrigatoriedade. */
export const draftBodySchema = t.Object(
  {
    step: t.Optional(t.Number({ minimum: 0, maximum: 6 })),
    contractor: t.Optional(t.Partial(contractorInputSchema)),
    venue: t.Optional(t.Partial(venueInputSchema)),
    schedule: t.Optional(t.Partial(scheduleInputSchema)),
    event: t.Optional(t.Partial(eventInputSchema)),
  },
  { description: "Rascunho parcial de uma etapa" },
);

/* ------------------------------------------------------------------ */
/* Mapper                                                              */
/* ------------------------------------------------------------------ */

const toPublicDetails = (details: PublicBudgetSource["details"]) =>
  details && {
    id: details.id,
    contractorType: details.contractorType,
    contractorName: details.contractorName,
    tradeName: details.tradeName,
    document: details.document,
    email: details.email,
    phone: details.phone,
    venueName: details.venueName,
    zipCode: details.zipCode,
    street: details.street,
    streetNumber: details.streetNumber,
    district: details.district,
    city: details.city,
    state: details.state,
    complement: details.complement,
    reference: details.reference,
    accessNotes: details.accessNotes,
    powerSupply: details.powerSupply,
    venueSize: details.venueSize,
    internetAvailable: details.internetAvailable,
    internetDetail: details.internetDetail,
    setupTime: details.setupTime,
    startTime: details.startTime,
    endTime: details.endTime,
    endsNextDay: details.endsNextDay,
    pickupTime: details.pickupTime,
    startsFlexibility: details.startsFlexibility,
    onSiteContactName: details.onSiteContactName,
    onSiteContactPhone: details.onSiteContactPhone,
    eventType: details.eventType,
    guestCount: details.guestCount,
    musicStyles: details.musicStyles,
    musicStyleOther: details.musicStyleOther,
    requestedExtras: details.requestedExtras,
    notes: details.notes,
    stepSeen: details.stepSeen,
    completedAt: details.completedAt,
  };

/**
 * O pedido de revisão em aberto, se existir. No máximo um: o botão interno é
 * idempotente enquanto o cliente não reenviar.
 */
const toRevisionRequest = (rows: PublicBudgetSource["revisions"]) => {
  const pending = rows[0];
  return pending
    ? {
        version: pending.version,
        reason: pending.reason,
        requestedAt: pending.requestedAt,
      }
    : null;
};

export const toPublicBudget = (budget: PublicBudgetSource) => ({
  token: budget.publicToken ?? "",
  clientName: budget.clientName,
  eventDate: budget.eventDate,
  status: budget.status,
  agreedValue: Number(budget.finalValue),
  offerItems: budget.offerItems.map((item) => ({
    name: item.name,
    detail: item.detail,
  })),
  details: toPublicDetails(budget.details),
  acceptance: budget.acceptance && {
    acceptedName: budget.acceptance.acceptedName,
    acceptedValue: Number(budget.acceptance.acceptedValue),
    acceptedAt: budget.acceptance.acceptedAt,
  },
  revisionRequest: toRevisionRequest(budget.revisions),
  submitted: Boolean(budget.details?.completedAt),
});
