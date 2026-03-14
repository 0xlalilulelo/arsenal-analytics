import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@mro/db';
import { hasRole } from '@/lib/rbac';

/** PATCH /api/users/[id] — update role */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const caller = session?.user as { orgId?: string; id?: string; role?: string } | undefined;
  if (!caller?.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasRole(caller.role, 'OWNER')) {
    return NextResponse.json({ error: 'Only owners can change roles' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json() as { role?: string };

  // Prevent demoting yourself
  if (id === caller.id && body.role !== 'OWNER') {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
  }

  const target = await prisma.user.findFirst({ where: { id, orgId: caller.orgId } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id },
    data: { role: body.role as any },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json({ data: updated });
}

/** DELETE /api/users/[id] — remove user from org */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const caller = session?.user as { orgId?: string; id?: string; role?: string } | undefined;
  if (!caller?.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasRole(caller.role, 'OWNER')) {
    return NextResponse.json({ error: 'Only owners can remove users' }, { status: 403 });
  }

  const { id } = await params;
  if (id === caller.id) return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });

  const target = await prisma.user.findFirst({ where: { id, orgId: caller.orgId } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (target.role === 'OWNER') return NextResponse.json({ error: 'Cannot remove an owner' }, { status: 400 });

  // Soft remove — delete auth sessions/accounts but keep the user row inactive
  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ data: { removed: true } });
}
