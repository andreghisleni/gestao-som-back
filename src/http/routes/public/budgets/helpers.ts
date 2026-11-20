import { prisma } from '~/db/client';
import { type PublicBudgetSource, publicBudgetInclude } from './schemas';

/**
 * Toda rota pública passa por aqui. Um único ponto de decisão sobre o que é
 * "link válido" evita que um futuro endpoint esqueça o check de revogação.
 */
export const findPublicBudget = (
  token: string
): Promise<PublicBudgetSource | null> =>
  prisma.budget.findUnique({
    where: { publicToken: token },
    include: publicBudgetInclude,
  });

// Type predicate: quem passa no check já chega estreitado no resto do handler.
export const isLinkUsable = (
  budget: PublicBudgetSource | null
): budget is PublicBudgetSource =>
  budget !== null && !budget.publicTokenRevoked;

/** Propagador/NGINX na frente; sem o header, marcamos unknown em vez de vazar nada. */
export const clientIp = (request: Request): string | null => {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || null;
  }
  return request.headers.get('x-real-ip');
};

export const NOT_FOUND = {
  error: 'Link inválido, expirado ou revogado',
} as const;
