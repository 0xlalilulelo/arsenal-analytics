import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

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
  const { name, password } = await req.json() as { name: string; password?: string };

  const invite = await prisma.userInvite.findUnique({
    where: { token },
    include: { org: true },
  });

  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  if (invite.acceptedAt) return NextResponse.json({ error: 'Already accepted' }, { status: 410 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Invite expired' }, { status: 410 });

  // Check if user already exists (re-inviting an existing user to a new org)
  const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existingUser) {
    return NextResponse.json({ error: 'An account with this email already exists. Please sign in.' }, { status: 409 });
  }

  // Create the user
  const user = await prisma.user.create({
    data: {
      orgId: invite.orgId,
      email: invite.email,
      name: name || invite.email.split('@')[0],
      role: invite.role,
    },
    select: { id: true, email: true, name: true, role: true },
  });

  // Mark invite accepted
  await prisma.userInvite.update({
    where: { token },
    data: { acceptedAt: new Date() },
  });

  return NextResponse.json({ data: user });
}
