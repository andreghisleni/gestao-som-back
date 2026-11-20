/** biome-ignore-all lint/performance/useTopLevelRegex: <explanation> */
import { randomBytes } from 'node:crypto';
import { env } from '~/env';

/**
 * Token do link público.
 *
 * Opaco, 20 caracteres URL-safe (~120 bits). De propósito não é o uuid do
 * orçamento: uuid é enumerável e vaza informação de volume. Como `publicToken`
 * é nullable, "sem token" significa "link ainda não gerado".
 */
export const generateShareToken = (): string =>
  randomBytes(15).toString('base64url');

/** Monta a URL que vai no WhatsApp do cliente. */
export const buildPublicUrl = (token: string): string =>
  `${env.PUBLIC_APP_URL.replace(/\/+$/, '')}/p/${token}`;

/**
 * Protocolo curto para o cliente citar no WhatsApp.
 * Não é chave de segurança — só um endereço humano ("meu pedido AND-26-7F3KA").
 */
export const buildProtocol = (token: string, eventDate: Date): string =>
  `AND-${String(eventDate.getFullYear()).slice(-2)}-${token
    .slice(-5)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, 'X')}`;

/** "16:30" -> 990 minutos. Horas muradas, sem fuso no meio do caminho. */
export const minutesFromTime = (time?: string | null): number | null => {
  if (!time) {
    return null;
  }
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  if (!match) {
    return null;
  }
  return Number(match[1]) * 60 + Number(match[2]);
};

/**
 * Duração do serviço em minutos, tratando a virada de meia-noite
 * (caso comum: 23:00 → 02:00 do dia seguinte).
 */
export const serviceDurationMinutes = (params: {
  startTime?: string | null;
  endTime?: string | null;
  endsNextDay?: boolean | null;
}): number | null => {
  const start = minutesFromTime(params.startTime);
  const end = minutesFromTime(params.endTime);
  if (start == null || end == null) {
    return null;
  }
  const adjustedEnd = params.endsNextDay ? end + 1440 : end;
  return adjustedEnd > start ? adjustedEnd - start : null;
};

export const formatDuration = (minutes: number | null): string | null => {
  if (minutes == null) {
    return null;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) {
    return `${rest} min`;
  }
  return rest ? `${hours}h${String(rest).padStart(2, '0')}` : `${hours}h`;
};
