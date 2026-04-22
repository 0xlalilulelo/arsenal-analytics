import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { getOrgId } from '@/lib/get-org-id';

// GET /api/certifications
export async function GET(_req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const certs = await prisma.certification.findMany({
    where: { orgId },
    orderBy: [{ code: 'asc' }],
    include: {
      _count: { select: { technicianCerts: true, taskRequirements: true } },
    },
  });
  return NextResponse.json({ data: certs });
}

// POST /api/certifications
export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    code: string;
    name: string;
    issuingAuthority?: string;
    requiresRenewal?: boolean;
    renewalIntervalMonths?: number;
  };

  if (!body.code?.trim() || !body.name?.trim()) {
    return NextResponse.json({ error: 'code and name are required' }, { status: 422 });
  }

  try {
    const cert = await prisma.certification.create({
      data: {
        orgId,
        code:                  body.code.trim().toUpperCase(),
        name:                  body.name.trim(),
        issuingAuthority:      body.issuingAuthority?.trim() ?? null,
        requiresRenewal:       body.requiresRenewal ?? false,
        renewalIntervalMonths: body.renewalIntervalMonths ?? null,
      },
    });
    return NextResponse.json({ data: cert }, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'A certification with this code already exists' }, { status: 409 });
    }
    console.error('[CERTS] Create failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
