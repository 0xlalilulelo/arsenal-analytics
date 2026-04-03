import { auth } from '@/auth';

/**
 * Extract the authenticated user's orgId from the current session.
 * Returns null if the user is not authenticated.
 * Use this in all API routes instead of prisma.organization.findFirst().
 */
export async function getOrgId(): Promise<string | null> {
  const session = await auth();
  return (session?.user as { orgId?: string })?.orgId ?? null;
}

/**
 * Extract full session user context (orgId + role) for routes that need RBAC.
 */
export async function getSessionUser(): Promise<{ orgId: string; role: string; userId: string } | null> {
  const session = await auth();
  if (!session?.user) return null;
  const u = session.user as { orgId?: string; role?: string; id?: string };
  if (!u.orgId || !u.role) return null;
  return { orgId: u.orgId, role: u.role, userId: u.id ?? '' };
}
