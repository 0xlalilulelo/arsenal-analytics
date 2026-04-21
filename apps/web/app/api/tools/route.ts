import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import type { ToolOwnership, ToolStatus } from '@prisma/client';
import { getOrgId } from '@/lib/get-org-id';
import { calculateNextCalibrationDue } from '@mro/core';

// GET /api/tools — list tools with optional filters.
//   ?status=AVAILABLE|CHECKED_OUT|CALIBRATION_DUE|OUT_OF_SERVICE|LOST
//   ?dueWithinDays=30          (show tools whose next calibration is within N days or overdue)
//   ?q=search                  (match assetTag / name / serialNumber)
export async function GET(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get('status') as ToolStatus | null;
  const dueWithinDays = url.searchParams.get('dueWithinDays');
  const q = url.searchParams.get('q');

  const where: Record<string, unknown> = { orgId };
  if (status) where.status = status;
  if (dueWithinDays) {
    const n = parseInt(dueWithinDays);
    if (Number.isFinite(n)) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + n);
      where.nextCalibrationDue = { lte: cutoff };
    }
  }
  if (q) {
    where.OR = [
      { assetTag:     { contains: q, mode: 'insensitive' } },
      { name:         { contains: q, mode: 'insensitive' } },
      { serialNumber: { contains: q, mode: 'insensitive' } },
    ];
  }

  const tools = await prisma.tool.findMany({
    where,
    orderBy: [{ assetTag: 'asc' }],
    include: {
      ownerTechnician: { select: { id: true, name: true } },
      checkouts: {
        where: { returnedAt: null },
        take: 1,
        include: {
          technician: { select: { id: true, name: true } },
          workOrder:  { select: { id: true, number: true } },
        },
      },
    },
  });

  return NextResponse.json({ data: tools });
}

// POST /api/tools — create a tool row.
export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    assetTag: string;
    name: string;
    manufacturer?: string;
    modelNumber?: string;
    serialNumber?: string;
    ownership?: ToolOwnership;
    ownerTechnicianId?: string;
    calibrationRequired?: boolean;
    calibrationIntervalMonths?: number;
    lastCalibratedAt?: string;
    calibrationCertUrl?: string;
    bin?: string;
    notes?: string;
  };

  if (!body.assetTag?.trim() || !body.name?.trim()) {
    return NextResponse.json({ error: 'assetTag and name are required' }, { status: 422 });
  }

  const last = body.lastCalibratedAt ? new Date(body.lastCalibratedAt) : null;
  const nextDue = last && body.calibrationRequired
    ? calculateNextCalibrationDue(last, body.calibrationIntervalMonths ?? null)
    : null;

  try {
    const tool = await prisma.tool.create({
      data: {
        orgId,
        assetTag:                  body.assetTag.trim(),
        name:                      body.name.trim(),
        manufacturer:              body.manufacturer ?? null,
        modelNumber:               body.modelNumber ?? null,
        serialNumber:              body.serialNumber ?? null,
        ownership:                 body.ownership ?? 'COMPANY',
        ownerTechnicianId:         body.ownerTechnicianId ?? null,
        calibrationRequired:       body.calibrationRequired ?? false,
        calibrationIntervalMonths: body.calibrationIntervalMonths ?? null,
        lastCalibratedAt:          last,
        nextCalibrationDue:        nextDue,
        calibrationCertUrl:        body.calibrationCertUrl ?? null,
        bin:                       body.bin ?? null,
        notes:                     body.notes ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        orgId,
        entityType: 'Tool',
        entityId:   tool.id,
        action:     'TOOL_CREATED',
        after:      { assetTag: tool.assetTag, name: tool.name },
      },
    }).catch(() => {});

    return NextResponse.json({ data: tool }, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'A tool with this asset tag already exists' }, { status: 409 });
    }
    console.error('[TOOLS] Create failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
