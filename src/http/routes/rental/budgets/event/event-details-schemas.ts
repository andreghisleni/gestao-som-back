import type { Prisma } from "@db/client";
import { t } from "elysia";
import {
  buildProtocol,
  buildPublicUrl,
  serviceDurationMinutes,
} from "~/utils/share-token";

/**
 * Formato INTERNO da resposta do formulário público.
 *
 * Não confundir com `public/budgets/schemas.ts`: aquele arquivo é a fronteira
 * sem autenticação e decide o que o cliente pode ver. Este aqui alimenta a tela
 * do escritório, onde quem lê é o dono do orçamento — então aparece tudo,
 * inclusive a trilha do aceite (IP e user agent) e as versões antigas, que
 * nunca saem no link.
 */

const str = (max = 160) => t.String({ maxLength: max });
const nstr = (max = 160) => t.Nullable(str(max));

/**
 * Conteúdo da resposta, sem metadados. É exatamente o objeto que vai congelado
 * em `BudgetEventRevision.data`, então uma versão antiga continua legível mesmo
 * depois que o formulário ganhar ou perder campos.
 */
const answerProperties = {
  contractorType: t.String(),
  contractorName: nstr(120),
  tradeName: nstr(120),
  /** CPF/CNPJ sem máscara; a máscara é responsabilidade do front. */
  document: nstr(18),
  email: nstr(160),
  phone: nstr(20),

  venueName: nstr(160),
  zipCode: nstr(12),
  street: nstr(200),
  streetNumber: nstr(20),
  district: nstr(120),
  city: nstr(120),
  state: nstr(2),
  complement: nstr(160),
  reference: nstr(280),
  accessNotes: t.Array(t.String()),
  powerSupply: nstr(40),
  venueSize: nstr(40),

  internetAvailable: nstr(40),
  internetDetail: nstr(280),

  setupTime: nstr(5),
  startTime: nstr(5),
  endTime: nstr(5),
  endsNextDay: t.Boolean(),
  pickupTime: nstr(5),
  startsFlexibility: nstr(40),
  onSiteContactName: nstr(120),
  onSiteContactPhone: nstr(20),

  eventType: nstr(40),
  guestCount: t.Nullable(t.Number()),
  musicStyles: t.Array(t.String()),
  musicStyleOther: nstr(280),

  requestedExtras: t.Array(t.String()),
  notes: nstr(2000),
};

export const eventAnswerSchema = t.Object(answerProperties, {
  description: "Resposta do formulário, sem metadados de ciclo",
});

export const internalEventDetailsSchema = t.Object(
  {
    id: t.String({ format: "uuid" }),
    ...answerProperties,
    /** Maior etapa visitada pelo cliente — retoma o "continuar depois". */
    stepSeen: t.Number(),
    /** null = ainda em rascunho (ou reaberto por um pedido de revisão). */
    completedAt: t.Nullable(t.Date()),
    createdAt: t.Date(),
    updatedAt: t.Date(),
  },
  { description: "Cópia de trabalho dos dados do evento" },
);

export const eventAcceptanceSchema = t.Object(
  {
    acceptedName: t.String(),
    acceptedValue: t.Number(),
    acceptedAt: t.Date(),
    acceptedIp: t.Nullable(t.String()),
    userAgent: t.Nullable(t.String()),
  },
  { description: "Trilha do aceite do valor acordado" },
);

export const eventRevisionSchema = t.Object(
  {
    id: t.String({ format: "uuid" }),
    /** 1, 2, 3... na ordem em que os pedidos de revisão foram criados. */
    version: t.Number(),
    data: eventAnswerSchema,
    submittedAt: t.Nullable(t.Date()),
    acceptance: t.Nullable(eventAcceptanceSchema),
    /** Motivo digitado ao pedir a revisão (opcional). */
    reason: t.Nullable(t.String()),
    requestedBy: t.Nullable(t.String()),
    requestedAt: t.Nullable(t.Date()),
    /** null = o pedido ainda está em aberto, esperando o cliente. */
    resolvedAt: t.Nullable(t.Date()),
  },
  { description: "Cópia congelada de uma resposta anterior" },
);

const eventDetailsResponseProperties = {
  budgetId: t.String({ format: "uuid" }),
  status: t.String(),
  clientName: t.String(),
  eventDate: t.Date(),
  /** Valor acordado no momento — é o que estava escrito no aceite. */
  agreedValue: t.Number(),
  /** Código curto para o cliente citar no WhatsApp (null sem link). */
  protocol: t.Nullable(t.String()),
  publicUrl: t.Nullable(t.String()),
  publicViewCount: t.Number(),
  submitted: t.Boolean(),
  durationMinutes: t.Nullable(t.Number()),
  details: t.Nullable(internalEventDetailsSchema),
  acceptance: t.Nullable(eventAcceptanceSchema),
  /** Pedido de revisão em aberto, se houver. */
  openReview: t.Nullable(eventRevisionSchema),
  /** Mais recente primeiro; no máximo 20 cópias por orçamento. */
  revisions: t.Array(eventRevisionSchema),
};

export const budgetEventDetailsResponseSchema = t.Object(
  eventDetailsResponseProperties,
  { description: "Resposta do formulário público + histórico de revisões" },
);

export const requestEventReviewResponseSchema = t.Object(
  {
    /** false quando já existia um pedido em aberto: nada foi duplicado. */
    created: t.Boolean(),
    ...eventDetailsResponseProperties,
  },
  { description: "Estado depois de congelar a resposta atual" },
);

export const internalEventInclude = {
  details: true,
  acceptance: true,
  revisions: { orderBy: { version: "desc" }, take: 20 },
} satisfies Prisma.BudgetInclude;

export type InternalEventSource = Prisma.BudgetGetPayload<{
  include: typeof internalEventInclude;
}>;

/** Derivado do próprio include: sem isso o tipo do row dependceria de genérico
 *  do Prisma que muda de versão para versão. */
type EventAnswer = NonNullable<InternalEventSource["details"]>;
type RevisionRow = InternalEventSource["revisions"][number];

/** A resposta sem os metadados do ciclo — é o que entra no JSON congelado. */
type AnswerContent = Omit<
  EventAnswer,
  "id" | "budgetId" | "createdAt" | "updatedAt" | "stepSeen" | "completedAt"
>;

/** Os campos de resposta dentro de uma linha viva de `event_details`. */
export const toAnswer = (row: EventAnswer) => {
  const {
    id: _id,
    budgetId: _budgetId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    stepSeen: _stepSeen,
    completedAt: _completedAt,
    ...answer
  } = row;
  return answer;
};

/**
 * Um `data` de snapshot é JSON antigo gravado por uma versão anterior do
 * formulário: nunca indexar às cegas. O que sumiu vira null/lista vazia em vez
 * de estourar a tela.
 */
const toAnswerFromJson = (raw: unknown): AnswerContent => {
  const value = (raw ?? {}) as Partial<AnswerContent>;
  return {
    contractorType: value.contractorType ?? "PF",
    contractorName: value.contractorName ?? null,
    tradeName: value.tradeName ?? null,
    document: value.document ?? null,
    email: value.email ?? null,
    phone: value.phone ?? null,
    venueName: value.venueName ?? null,
    zipCode: value.zipCode ?? null,
    street: value.street ?? null,
    streetNumber: value.streetNumber ?? null,
    district: value.district ?? null,
    city: value.city ?? null,
    state: value.state ?? null,
    complement: value.complement ?? null,
    reference: value.reference ?? null,
    accessNotes: value.accessNotes ?? [],
    powerSupply: value.powerSupply ?? null,
    venueSize: value.venueSize ?? null,
    internetAvailable: value.internetAvailable ?? null,
    internetDetail: value.internetDetail ?? null,
    setupTime: value.setupTime ?? null,
    startTime: value.startTime ?? null,
    endTime: value.endTime ?? null,
    endsNextDay: Boolean(value.endsNextDay),
    pickupTime: value.pickupTime ?? null,
    startsFlexibility: value.startsFlexibility ?? null,
    onSiteContactName: value.onSiteContactName ?? null,
    onSiteContactPhone: value.onSiteContactPhone ?? null,
    eventType: value.eventType ?? null,
    guestCount: value.guestCount ?? null,
    musicStyles: value.musicStyles ?? [],
    musicStyleOther: value.musicStyleOther ?? null,
    requestedExtras: value.requestedExtras ?? [],
    notes: value.notes ?? null,
  };
};

const toRevisionAcceptance = (row: RevisionRow) =>
  row.acceptedName && row.acceptedValue != null && row.acceptedAt
    ? {
        acceptedName: row.acceptedName,
        acceptedValue: Number(row.acceptedValue),
        acceptedAt: row.acceptedAt,
        acceptedIp: row.acceptedIp,
        userAgent: row.acceptedUserAgent,
      }
    : null;

const toRevision = (row: RevisionRow) => ({
  id: row.id,
  version: row.version,
  data: toAnswerFromJson(row.data),
  submittedAt: row.submittedAt,
  acceptance: toRevisionAcceptance(row),
  reason: row.reason,
  requestedBy: row.requestedBy,
  requestedAt: row.requestedAt,
  resolvedAt: row.resolvedAt,
});

export const toBudgetEventDetails = (budget: InternalEventSource) => {
  const details = budget.details;
  const revisions = budget.revisions.map(toRevision);

  return {
    budgetId: budget.id,
    status: budget.status,
    clientName: budget.clientName,
    eventDate: budget.eventDate,
    agreedValue: Number(budget.finalValue),
    protocol: budget.publicToken
      ? buildProtocol(budget.publicToken, budget.eventDate)
      : null,
    publicUrl:
      budget.publicToken && !budget.publicTokenRevoked
        ? buildPublicUrl(budget.publicToken)
        : null,
    publicViewCount: budget.publicViewCount,
    submitted: Boolean(details?.completedAt),
    durationMinutes: serviceDurationMinutes({
      startTime: details?.startTime,
      endTime: details?.endTime,
      endsNextDay: details?.endsNextDay,
    }),
    details: details
      ? {
          id: details.id,
          ...toAnswer(details),
          stepSeen: details.stepSeen,
          completedAt: details.completedAt,
          createdAt: details.createdAt,
          updatedAt: details.updatedAt,
        }
      : null,
    acceptance: budget.acceptance
      ? {
          acceptedName: budget.acceptance.acceptedName,
          acceptedValue: Number(budget.acceptance.acceptedValue),
          acceptedAt: budget.acceptance.acceptedAt,
          acceptedIp: budget.acceptance.acceptedIp,
          userAgent: budget.acceptance.userAgent,
        }
      : null,
    openReview: revisions.find((item) => !item.resolvedAt) ?? null,
    revisions,
  };
};
