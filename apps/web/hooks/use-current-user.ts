'use client';
import { useSession } from 'next-auth/react';
import { can, hasRole, UserRole } from '@/lib/rbac';

/**
 * Returns the current user's session data + convenience permission helpers.
 */
export function useCurrentUser() {
  const { data: session, status } = useSession();
  const user = session?.user as { id?: string; name?: string | null; email?: string | null; orgId?: string; role?: string } | undefined;

  return {
    user,
    role: (user?.role ?? 'TECHNICIAN') as UserRole,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    can,
    hasRole: (required: UserRole) => hasRole(user?.role, required),
  };
}
