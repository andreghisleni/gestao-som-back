/** biome-ignore-all lint/performance/useTopLevelRegex: <explanation> */
import type { Prisma } from "@db/client";
import type { Static } from "elysia";
import {
  isKnownOption,
  isKnownOptionList,
  type optionIds,
} from "~/constants/event-options";
import {
  isValidDocument,
  isValidEmail,
  isValidPhone,
  onlyDigits,
} from "~/utils/documents";
import { minutesFromTime, serviceDurationMinutes } from "~/utils/share-token";
import type { draftBodySchema, submitBodySchema } from "./schemas";

type Draft = Static<typeof draftBodySchema>;
type Submission = Static<typeof submitBodySchema>;

/**
 * Sanitização comum a rascunho e envio.
 *
 * Regra: o banco guarda a forma canônica (dígitos puros, UF em maiúsculas);
 * a apresentação com máscara fica a cargo do front. Devolve só as chaves
 * presentes, para o
 * `update` parcial de autosave não apagar o que a pessoa já preencheu.
 */

const text = (value: string | null | undefined, max = 200) => {
  const clean = (value ?? "").replace(/\s+/g, " ").trim();
  if (!clean) {
    return null;
  }
  return clean.slice(0, max);
};

const digitsOrNull = (value: string | null | undefined, size?: number) => {
  const digits = onlyDigits(value);
  if (!digits) {
    return null;
  }
  if (size && digits.length !== size) {
    return null;
  }
  return digits;
};

const uF = (value: string | null | undefined) => {
  const clean = (value ?? "").trim().toUpperCase().slice(0, 2);
  return /^[A-Z]{2}$/.test(clean) ? clean : null;
};

const knownList = (
  key: Parameters<typeof isKnownOptionList>[0],
  values: string[] | null | undefined,
) => [...new Set((values ?? []).filter((value) => isKnownOption(key, value)))];

/** Um dos dois formatos aceitos: com ou sem máscara. */
const timeOrNull = (value: string | null | undefined) =>
  minutesFromTime(value) == null ? null : (value ?? "").trim().slice(0, 5);

export const normalizeContractor = (input: Draft["contractor"]) => {
  if (!input) {
    return {};
  }
  const type =
    // biome-ignore lint/style/noNestedTernary: <explanation>
    input.type === "PJ" ? "PJ" : input.type === "PF" ? "PF" : undefined;
  return {
    ...(type && { contractorType: type }),
    contractorName: text(input.name, 120),
    tradeName: text(input.tradeName, 120),
    document: digitsOrNull(input.document),
    email: input.email ? text(input.email.toLowerCase(), 160) : null,
    phone: digitsOrNull(input.phone, 10) ?? digitsOrNull(input.phone, 11),
  };
};

export const normalizeVenue = (input: Draft["venue"]) => {
  if (!input) {
    return {};
  }
  return {
    venueName: text(input.venueName, 160),
    zipCode: digitsOrNull(input.zipCode, 8),
    street: text(input.street, 200),
    streetNumber: text(input.streetNumber, 20),
    district: text(input.district, 120),
    city: text(input.city, 120),
    state: uF(input.state),
    complement: text(input.complement, 160),
    reference: text(input.reference, 280),
    accessNotes: knownList("accessNotes", input.accessNotes),
    powerSupply: isKnownOption("powerSupply", input.powerSupply)
      ? input.powerSupply
      : null,
    venueSize: isKnownOption("venueSizes", input.venueSize)
      ? input.venueSize
      : null,
    internetAvailable: isKnownOption(
      "internetAvailability",
      input.internetAvailable,
    )
      ? input.internetAvailable
      : null,
    internetDetail: text(input.internetDetail, 280),
  };
};

export const normalizeSchedule = (input: Draft["schedule"]) => {
  if (!input) {
    return {};
  }
  return {
    setupTime: timeOrNull(input.setupTime),
    startTime: timeOrNull(input.startTime),
    endTime: timeOrNull(input.endTime),
    endsNextDay: Boolean(input.endsNextDay),
    pickupTime: timeOrNull(input.pickupTime),
    startsFlexibility: isKnownOption(
      "startsFlexibility",
      input.startsFlexibility,
    )
      ? input.startsFlexibility
      : null,
    onSiteContactName: text(input.onSiteContactName, 120),
    onSiteContactPhone:
      digitsOrNull(input.onSiteContactPhone, 10) ??
      digitsOrNull(input.onSiteContactPhone, 11),
  };
};

export const normalizeEvent = (input: Draft["event"]) => {
  if (!input) {
    return {};
  }
  return {
    eventType: isKnownOption("eventTypes", input.eventType)
      ? input.eventType
      : null,
    guestCount:
      input.guestCount != null && input.guestCount > 0
        ? Math.min(Math.trunc(input.guestCount), 20_000)
        : null,
    musicStyles: knownList("musicStyles", input.musicStyles),
    musicStyleOther: text(input.musicStyleOther, 280),
    requestedExtras: knownList("requestedExtras", input.requestedExtras),
    notes: text(input.notes, 2000),
  };
};

/** Monta o `data` do upsert a partir de um rascunho parcial. */
export const normalizeDraft = (body: Draft) => {
  const data: Record<string, unknown> = {
    ...normalizeContractor(body.contractor),
    ...normalizeVenue(body.venue),
    ...normalizeSchedule(body.schedule),
    ...normalizeEvent(body.event),
  };
  // Chaves null já significam "ainda não preenchido" aqui; as ausentes
  // (etapa que o cliente ainda não visitou) ficam fora do update de propósito.
  // `budgetId` pertence à rota (é ela quem conhece o dono do link), então fica
  // fora deste tipo para o spread não sobrescrever o valor real.
  return data as Omit<Prisma.EventDetailsUncheckedCreateInput, "budgetId">;
};

/* ------------------------------------------------------------------ */
/* Validação do envio                                                  */
/* ------------------------------------------------------------------ */

/**
 * Devolve a lista de caminhos de campo inválidos (ex.: `contractor.document`).
 * Vazio = pode persistir. O front usa o array para marcar os inputs.
 *
 * As regras que geram erro são as que não dá para consertar sozinho: documento
 * com dígito verificador errado, horário incoerente e opção fora do catálogo.
 */
export const collectSubmissionErrors = (body: Submission): string[] => {
  const errors: string[] = [];
  const { contractor, venue, schedule, event, acceptance } = body;

  if (acceptance.website) {
    errors.push("acceptance.website");
  }

  // ---- contratante ----
  if (!contractor.name || contractor.name.trim().length < 3) {
    errors.push("contractor.name");
  }
  if (!isValidDocument(contractor.document, contractor.type)) {
    errors.push("contractor.document");
  }
  if (contractor.type === "PJ" && !text(contractor.tradeName, 120)) {
    errors.push("contractor.tradeName");
  }
  if (!isValidEmail(contractor.email)) {
    errors.push("contractor.email");
  }
  if (!isValidPhone(contractor.phone)) {
    errors.push("contractor.phone");
  }

  // ---- local ----
  if (digitsOrNull(venue.zipCode, 8) === null) {
    errors.push("venue.zipCode");
  }
  if (!text(venue.street, 200)) {
    errors.push("venue.street");
  }
  if (!text(venue.streetNumber, 20)) {
    errors.push("venue.streetNumber");
  }
  if (!text(venue.district, 120)) {
    errors.push("venue.district");
  }
  if (!text(venue.city, 120)) {
    errors.push("venue.city");
  }
  if (uF(venue.state) === null) {
    errors.push("venue.state");
  }
  if (!isKnownOption("internetAvailability", venue.internetAvailable)) {
    errors.push("venue.internetAvailable");
  }
  if (!isKnownOptionList("accessNotes", venue.accessNotes)) {
    errors.push("venue.accessNotes");
  }

  // ---- cronograma ----
  const setup = minutesFromTime(schedule.setupTime);
  const start = minutesFromTime(schedule.startTime);
  const end = minutesFromTime(schedule.endTime);
  if (setup == null) {
    errors.push("schedule.setupTime");
  }
  if (start == null) {
    errors.push("schedule.startTime");
  }
  if (end == null) {
    errors.push("schedule.endTime");
  }

  if (start != null && setup != null && setup >= start) {
    // montagem depois do início não existe; equal também é ambíguo demais
    errors.push("schedule.setupTime");
  }
  if (
    serviceDurationMinutes({
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      endsNextDay: schedule.endsNextDay,
    }) === null
  ) {
    errors.push("schedule.endTime");
  }
  const pickup = minutesFromTime(schedule.pickupTime ?? null);
  if (schedule.pickupTime && pickup == null) {
    errors.push("schedule.pickupTime");
  }

  // ---- repertório ----
  if (event.musicStyles.length < 1) {
    errors.push("event.musicStyles");
  }
  if (!isKnownOptionList("musicStyles", event.musicStyles)) {
    errors.push("event.musicStyles");
  }
  if (!isKnownOptionList("requestedExtras", event.requestedExtras ?? [])) {
    errors.push("event.requestedExtras");
  }
  if (event.eventType && !isKnownOption("eventTypes", event.eventType)) {
    errors.push("event.eventType");
  }

  if (acceptance.name.trim().length < 3) {
    errors.push("acceptance.name");
  }

  return [...new Set(errors)];
};

/** Payload já saneado, pronto para ir ao banco. */
export const buildDetailsData = (body: Submission) => ({
  ...normalizeContractor(body.contractor),
  ...normalizeVenue(body.venue),
  ...normalizeSchedule(body.schedule),
  ...normalizeEvent(body.event),
});

export type OptionKey = Parameters<typeof optionIds>[0];
