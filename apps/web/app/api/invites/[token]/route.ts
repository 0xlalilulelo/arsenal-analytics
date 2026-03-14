import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { hashPassword } from '@/lib/password';

/** GET /api/invites/[token] — look up invite details for display */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invite = await prisma.userInvite.findUnique({
    where: { token },
    include: { org: { select: { name: true } } },
  });

  if (!invite) return NextResponse.json({ error: 'Invite not found or expired' }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: 'Invite already accepted' }, { status: 410 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Invite has expired' }, { status: 410 });

  return NextResponse.json({
    data: {
      email: invite.email,
      role: invite.role,
      orgName: invite.org.name,
      expiresAt: invite.expiresAt,
    },
  });
}

/** POST /api/invites/[token] — accept invite, create user account */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { name, password } = await req.json() as { name: string; password: string };

  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const invite = await prisma.userInvite.findUnique({
    where: { token },
    include: { org: true },
  });

  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: 'Already accepted' }, { status: 410 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Invite expired' }, { status: 410 });

  const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existingUser) {
    return NextResponse.json({ error: 'An account with this email already exists. Please sign in.' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  const [user] = await prisma.$transaction([
    prisma.user.create({
      data: {
        orgId: invite.orgId,
        email: invite.email,
        name: name?.trim() || invite.email.split('@')[0],
        role: invite.role,
        passwordHash,
      },
      select: { id: true, email: true, name: true, role: true },
    }),
    prisma.userInvite.update({
      where: { token },
      data: { acceptedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ data: user });
}
