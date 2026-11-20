import { createHash } from "node:crypto";
import { prisma } from "~/db/client";
import { env } from "~/env";

/**
 * Contagem de visualização do link público.
 *
 * Antes era um `increment: 1` cru em cada `GET /public/budgets/:token`, o que
 * contava recarga de aba, refetch de foco da janela, retry de rede em 4G e
 * preview de link de robô. Aqui a unidade passa a ser **visita**: uma linha por
 * visitante (`budget_public_views`) e o contador global só sobe quando a linha
 * é criada ou quando já passou a janela sem aquela pessoa aparecer.
 */

/** Manter a aba aberta renova a visita, mas sem escrever 1x por request. */
const HEARTBEAT_MS = 60_000;

/**
 * Preview de WhatsApp/Telegram, crawlers e scripts de teste não são "o cliente
 * abriu o link". O user-agent vazio também fica fora: navegador real sempre
 * manda um, e o que não manda é robot.
 */
const NON_HUMAN_AGENT =
  /(bot|crawler|spider|slurp|preview|facebookexternalhit|whatsapp|telegrambot|twitterbot|linkedinbot|slackbot|discordbot|headless|puppeteer|playwright|selenium|curl|wget|python|okhttp|go-http-client|java\/|bun\/|node-fetch|axios\/|httpie)/i;

/** Só "de onde" abriu: sem versão de navegador, para não criar visitante novo a cada update. */
const OS_PATTERNS: [RegExp, string][] = [
  [/iPhone/i, "iPhone"],
  [/iPad/i, "iPad"],
  [/Android/i, "Android"],
  [/(Windows NT|Windows)/i, "Windows"],
  [/(Mac OS X|Macintosh)/i, "Mac"],
  [/(Linux|X11)/i, "Linux"],
];

const BROWSER_PATTERNS: [RegExp, string][] = [
  [/(Edg|EdgA|OPR)\/|Opera/i, "Edge ou Opera"],
  [/Firefox\//i, "Firefox"],
  [/Chrome\//i, "Chrome"],
  [/Safari\//i, "Safari"],
];

export const isHumanAgent = (userAgent: string | null): boolean => {
  // UA vazio não é navegador real: fica fora da conta.
  if (!userAgent) {
    return false;
  }
  return !NON_HUMAN_AGENT.test(userAgent);
};

export const deviceLabel = (userAgent: string): string => {
  const os =
    OS_PATTERNS.find(([pattern]) => pattern.test(userAgent))?.[1] ??
    "dispositivo não identificado";
  // Edge/Opera e Chrome também dizem "Safari" no UA, então a ordem importa.
  const browser =
    BROWSER_PATTERNS.find(([pattern]) => pattern.test(userAgent))?.[1] ??
    "navegador não identificado";
  return `${os} · ${browser}`;
};

/** IP puro nunca vai para o banco: só o hash curto de (IP, dispositivo). */
const buildVisitorKey = (ip: string | null, device: string): string =>
  createHash("sha256")
    .update(`${ip ?? "ip-desconhecido"}|${device}`)
    .digest("hex")
    .slice(0, 24);

export const viewWindowMinutes = (): number => env.PUBLIC_VIEW_WINDOW_MINUTES;

export type PublicViewOutcome = "counted" | "repeat" | "ignored";

/**
 * Registra a leitura de um visitante. Nunca lança: métrica não pode derrubar a
 * página do cliente (a rota chama isso dentro de try/catch por segurança).
 */
export const registerPublicView = async (input: {
  budgetId: string;
  ip: string | null;
  userAgent: string | null;
}): Promise<PublicViewOutcome> => {
  if (!isHumanAgent(input.userAgent)) {
    return "ignored";
  }

  const device = deviceLabel(input.userAgent ?? "");
  const visitorKey = buildVisitorKey(input.ip, device);
  const where = {
    budgetId_visitorKey: { budgetId: input.budgetId, visitorKey },
  };
  const now = new Date();
  const windowMs = viewWindowMinutes() * 60_000;

  const existing = await prisma.budgetPublicView.findUnique({
    where,
    select: { lastSeenAt: true },
  });
  const elapsed = existing
    ? now.getTime() - existing.lastSeenAt.getTime()
    : Number.POSITIVE_INFINITY;

  if (elapsed < HEARTBEAT_MS) {
    // Duas requests em sequência (foco de aba, retry): não escreve nada.
    return "repeat";
  }

  if (elapsed < windowMs) {
    // Continuou olhando: renova a janela, não conta visita nova.
    await prisma.budgetPublicView.update({ where, data: { lastSeenAt: now } });
    return "repeat";
  }

  const userAgent = (input.userAgent ?? "").slice(0, 200) || null;
  if (existing) {
    await prisma.$transaction([
      prisma.budgetPublicView.update({
        where,
        data: { lastSeenAt: now, views: { increment: 1 }, userAgent },
      }),
      prisma.budget.update({
        where: { id: input.budgetId },
        data: { publicViewCount: { increment: 1 } },
      }),
    ]);
    return "counted";
  }

  await prisma.$transaction([
    prisma.budgetPublicView.create({
      data: {
        budgetId: input.budgetId,
        visitorKey,
        device,
        userAgent,
        views: 1,
        firstSeenAt: now,
        lastSeenAt: now,
      },
    }),
    prisma.budget.update({
      where: { id: input.budgetId },
      data: { publicViewCount: { increment: 1 } },
    }),
  ]);
  return "counted";
};

const viewRowSchema = {
  visitorKey: true,
  device: true,
  views: true,
  firstSeenAt: true,
  lastSeenAt: true,
} as const;

/** O que a tela interna mostra: total rastreado + quem abriu, mais recente primeiro. */
export const viewSummary = async (budgetId: string) => {
  const rows = await prisma.budgetPublicView.findMany({
    where: { budgetId },
    select: viewRowSchema,
    orderBy: { lastSeenAt: "desc" },
    take: 10,
  });

  const firsts = rows.map((row) => row.firstSeenAt.getTime());
  const lasts = rows.map((row) => row.lastSeenAt.getTime());

  return {
    rows,
    devices: rows.length,
    trackedVisits: rows.reduce((total, row) => total + row.views, 0),
    firstViewAt: firsts.length ? new Date(Math.min(...firsts)) : null,
    lastViewAt: lasts.length ? new Date(Math.max(...lasts)) : null,
    windowMinutes: viewWindowMinutes(),
  };
};

export type PublicViewSummary = Awaited<ReturnType<typeof viewSummary>>;
