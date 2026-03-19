import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/auth.config';
import { hasRole } from '@/lib/rbac';

const { auth } = NextAuth(authConfig);

/** Routes that require a minimum role. First match wins. */
const ROLE_GUARDS: Array<{ prefix: string; minRole: 'OWNER' | 'MANAGER' | 'ACCOUNTANT' | 'PARTS_CLERK' | 'TECHNICIAN' }> = [
  { prefix: '/settings/users',   minRole: 'OWNER' },
  { prefix: '/api/users',        minRole: 'OWNER' },
  { prefix: '/settings',         minRole: 'MANAGER' },
  { prefix: '/reports',          minRole: 'ACCOUNTANT' },
  { prefix: '/analytics',        minRole: 'ACCOUNTANT' },
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = req.auth as any;
  const isAuthed = !!session;
  const isAuthRoute = pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up') ||
    pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password') ||
    pathname.startsWith('/invite/');
  const isPublic = pathname.startsWith('/api/auth') || pathname.startsWith('/portal/') ||
    pathname.startsWith('/print/') || pathname.startsWith('/api/webhooks/');

  if (isPublic) return NextResponse.next();
  if (isAuthRoute) {
    if (isAuthed) return NextResponse.redirect(new URL('/dashboard', req.url));
    return NextResponse.next();
  }
  if (!isAuthed) {
    return NextResponse.redirect(new URL(`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`, req.url));
  }

  // Role-based guards
  const userRole: string | undefined = session?.user?.role;
  for (const guard of ROLE_GUARDS) {
    if (pathname.startsWith(guard.prefix)) {
      if (!hasRole(userRole, guard.minRole)) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/dashboard?error=forbidden', req.url));
      }
      break;
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
