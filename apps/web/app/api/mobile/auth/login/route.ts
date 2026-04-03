import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { prisma } from '@mro/db';
import { verifyPassword } from '@/lib/password';
import { rateLimit } from '@/lib/rate-limit';

if (!process.env.AUTH_SECRET) {
  console.error('[MOBILE AUTH] AUTH_SECRET is not configured');
  // Fall through — jose will reject empty-key tokens which is acceptable fail-safe behavior
}
const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? '');
const TOKEN_TTL = '30d';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`mobile-login:${ip}:${(body.email as string ?? '').toLowerCase()}`, 5, 900);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { email: body.email as string },
    include: { org: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  let valid = false;
  if (user.passwordHash) {
    valid = await verifyPassword(body.password as string, user.passwordHash);
  }

  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = await new SignJWT({
    sub: user.id,
    userId: user.id,
    orgId: user.orgId,
    role: user.role,
    email: user.email,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(secret);

  return NextResponse.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      orgId: user.orgId,
    },
  });
}
