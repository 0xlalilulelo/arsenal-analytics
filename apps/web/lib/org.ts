import { prisma } from '@mro/db';

/**
 * Resolve the single org for this MVP deployment.
 * Single-tenant: always returns the first (and only) org.
 */
export async function resolveOrgId(): Promise<string | null> {
  const org = await prisma.organization.findFirst({ select: { id: true } });
  return org?.id ?? null;
}
