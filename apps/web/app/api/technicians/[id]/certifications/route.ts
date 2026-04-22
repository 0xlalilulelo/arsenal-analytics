import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import type { CertStatus } from '@prisma/client';
import { getOrgId } from '@/lib/get-org-id';

// GET /api/technicians/[id]/certifications
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: techId } = await params;

  const tech = await prisma.technician.findFirst({ where: { id: techId, orgId } });
  if (!tech) return NextResponse.json({ error: 'Technician not found' }, { status: 404 });

  const certs = await prisma.technicianCertification.findMany({
    where: { technicianId: techId },
    include: { certification: true },
    orderBy: [{ status: 'asc' }, { expiresAt: 'asc' }],
  });
  return NextResponse.json({ data: certs });
}

// POST /api/technicians/[id]/certifications
// Body: { certificationId, issuedAt, expiresAt?, certificateUrl?, status? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: techId } = await params;

  const body = await req.json() as {
    certificationId: string;
    issuedAt: string;
    expiresAt?: string;
    certificateUrl?: string;
    status?: CertStatus;
  };

  if (!body.certificationId || !body.issuedAt) {
    return NextResponse.json({ error: 'certificationId and issuedAt are required' }, { status: 422 });
  }

  const tech = await prisma.technician.findFirst({ where: { id: techId, orgId } });
  if (!tech) return NextResponse.json({ error: 'Technician not found' }, { status: 404 });

  const cert = await prisma.certification.findFirst({ where: { id: body.certificationId, orgId } });
  if (!cert) return NextResponse.json({ error: 'Certification not found' }, { status: 404 });

  try {
    const tc = await prisma.technicianCertification.create({
      data: {
        technicianId:    techId,
        certificationId: body.certificationId,
        issuedAt:        new Date(body.issuedAt),
        expiresAt:       body.expiresAt ? new Date(body.expiresAt) : null,
        certificateUrl:  body.certificateUrl ?? null,
        status:          body.status ?? 'ACTIVE',
      },
      include: { certification: true },
    });

    await prisma.auditLog.create({
      data: {
        orgId,
        entityType: 'TechnicianCertification',
        entityId:   tc.id,
        action:     'CERT_ASSIGNED',
        after: {
          technicianId:    techId,
          certificationId: body.certificationId,
          code:            cert.code,
          expiresAt:       tc.expiresAt,
        },
      },
    }).catch(() => {});

    return NextResponse.json({ data: tc }, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'This technician already holds this certification' }, { status: 409 });
    }
    console.error('[TECH CERTS] Create failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
