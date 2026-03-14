import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@mro/db';
import { randomUUID } from 'crypto';
import { sendInviteEmail } from '@/lib/email';
import { hasRole } from '@/lib/rbac';

/** GET /api/users — list org users + pending invites */
export async function GET() {
  const session = await auth();
  const orgId = (session?.user as { orgId?: string })?.orgId;
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [users, invites] = await Promise.all([
    prisma.user.findMany({
      where: { orgId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        technicianProfile: { select: { id: true, certifications: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.userInvite.findMany({
      where: { orgId, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, email: true, role: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return NextResponse.json({ data: { users, invites } });
}

/** POST /api/users — invite a new user */
export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as { orgId?: string; id?: string; role?: string } | undefined;
  if (!user?.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasRole(user.role, 'OWNER')) {
    return NextResponse.json({ error: 'Only owners can invite users' }, { status: 403 });
  }

  const { email, role } = await req.json() as { email: string; role: string };
  if (!email || !role) return NextResponse.json({ error: 'email and role required' }, { status: 400 });

  // Check if already a member
  const existing = await prisma.user.findFirst({ where: { orgId: user.orgId, email } });
  if (existing) return NextResponse.json({ error: 'User is already a member' }, { status: 409 });

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await prisma.userInvite.upsert({
    where: { orgId_email: { orgId: user.orgId, email } },
    update: { role: role as any, token, expiresAt, invitedBy: user.id ?? '', acceptedAt: null },
    create: { orgId: user.orgId, email, role: role as any, token, expiresAt, invitedBy: user.id ?? '' },
  });

  // Send invite email (non-blocking)
  const org = await prisma.organization.findUnique({ where: { id: user.orgId }, select: { name: true } });
  const inviterName = session?.user?.name ?? session?.user?.email ?? 'A team member';
  await sendInviteEmail({ email, inviterName, orgName: org?.name ?? 'the shop', token });

  return NextResponse.json({ data: invite, inviteToken: token });
}
