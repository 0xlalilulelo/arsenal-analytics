import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { getOrgId } from '@/lib/get-org-id';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.taskCertificationRequirement.findFirst({ where: { id, orgId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.taskCertificationRequirement.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
