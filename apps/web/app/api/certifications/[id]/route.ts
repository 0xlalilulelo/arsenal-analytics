import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { getOrgId } from '@/lib/get-org-id';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.certification.findFirst({ where: { id, orgId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json() as {
    name?: string;
    issuingAuthority?: string | null;
    requiresRenewal?: boolean;
    renewalIntervalMonths?: number | null;
  };

  const updated = await prisma.certification.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.issuingAuthority !== undefined ? { issuingAuthority: body.issuingAuthority } : {}),
      ...(body.requiresRenewal !== undefined ? { requiresRenewal: body.requiresRenewal } : {}),
      ...(body.renewalIntervalMonths !== undefined ? { renewalIntervalMonths: body.renewalIntervalMonths } : {}),
    },
  });
  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.certification.findFirst({
    where: { id, orgId },
    include: { _count: { select: { technicianCerts: true, taskRequirements: true } } },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (existing._count.technicianCerts > 0 || existing._count.taskRequirements > 0) {
    return NextResponse.json(
      { error: 'Certification is in use by technicians or task requirements and cannot be deleted' },
      { status: 409 },
    );
  }

  await prisma.certification.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
