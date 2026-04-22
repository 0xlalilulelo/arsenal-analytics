import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import type { CertStatus } from '@prisma/client';
import { getOrgId } from '@/lib/get-org-id';

// PATCH /api/technicians/[id]/certifications/[tcId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tcId: string }> },
) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: techId, tcId } = await params;

  const existing = await prisma.technicianCertification.findFirst({
    where: { id: tcId, technicianId: techId },
    include: { technician: { select: { orgId: true } } },
  });
  if (!existing || existing.technician.orgId !== orgId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json() as {
    issuedAt?: string;
    expiresAt?: string | null;
    certificateUrl?: string | null;
    status?: CertStatus;
  };

  const updated = await prisma.technicianCertification.update({
    where: { id: tcId },
    data: {
      ...(body.issuedAt !== undefined ? { issuedAt: new Date(body.issuedAt) } : {}),
      ...(body.expiresAt !== undefined ? { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null } : {}),
      ...(body.certificateUrl !== undefined ? { certificateUrl: body.certificateUrl } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    },
    include: { certification: true },
  });

  await prisma.auditLog.create({
    data: {
      orgId,
      entityType: 'TechnicianCertification',
      entityId:   tcId,
      action:     'CERT_UPDATED',
      before:     { status: existing.status, expiresAt: existing.expiresAt },
      after:      { status: updated.status,  expiresAt: updated.expiresAt },
    },
  }).catch(() => {});

  return NextResponse.json({ data: updated });
}

// DELETE /api/technicians/[id]/certifications/[tcId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; tcId: string }> },
) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: techId, tcId } = await params;

  const existing = await prisma.technicianCertification.findFirst({
    where: { id: tcId, technicianId: techId },
    include: { technician: { select: { orgId: true } } },
  });
  if (!existing || existing.technician.orgId !== orgId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.technicianCertification.delete({ where: { id: tcId } });
  return NextResponse.json({ ok: true });
}
