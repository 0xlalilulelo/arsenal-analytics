import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;
  const isAuthed = !!req.auth;
  const isAuthRoute = pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up');
  const isApiAuth = pathname.startsWith('/api/auth');

  if (isApiAuth) return NextResponse.next();
  if (isAuthRoute) {
    if (isAuthed) return NextResponse.redirect(new URL('/dashboard', req.url));
    return NextResponse.next();
  }
  if (!isAuthed) {
    return NextResponse.redirect(new URL(`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`, req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};
