import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { getOrgId } from '@/lib/get-org-id';
import { calculateNextCalibrationDue } from '@mro/core';

// GET /api/tools/[id]/calibrations — history
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const tool = await prisma.tool.findFirst({ where: { id, orgId }, select: { id: true } });
  if (!tool) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const events = await prisma.toolCalibrationEvent.findMany({
    where: { toolId: id },
    orderBy: { performedAt: 'desc' },
  });
  return NextResponse.json({ data: events });
}

// POST /api/tools/[id]/calibrations
// Body: { performedAt, performedBy, vendor?, certUrl?, notes?, intervalMonthsOverride? }
// Creates a ToolCalibrationEvent, updates the tool's lastCalibratedAt
// and nextCalibrationDue, and clears CALIBRATION_DUE status if set.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const body = await req.json() as {
    performedAt:           string;
    performedBy:           string;
    vendor?:               string;
    certUrl?:              string;
    notes?:                string;
    intervalMonthsOverride?: number;
  };

  if (!body.performedAt || !body.performedBy?.trim()) {
    return NextResponse.json({ error: 'performedAt and performedBy are required' }, { status: 422 });
  }

  const tool = await prisma.tool.findFirst({ where: { id, orgId } });
  if (!tool) return NextResponse.json({ error: 'Tool not found' }, { status: 404 });

  const performedAt = new Date(body.performedAt);
  const interval = body.intervalMonthsOverride ?? tool.calibrationIntervalMonths;
  const nextDue = calculateNextCalibrationDue(performedAt, interval);

  if (!nextDue) {
    return NextResponse.json(
      { error: 'Cannot record calibration without a calibration interval (set one on the tool first)' },
      { status: 422 },
    );
  }

  const result = await prisma.$transaction(async tx => {
    const event = await tx.toolCalibrationEvent.create({
      data: {
        toolId:      id,
        performedAt,
        performedBy: body.performedBy.trim(),
        vendor:      body.vendor ?? null,
        certUrl:     body.certUrl ?? null,
        nextDueAt:   nextDue,
        notes:       body.notes ?? null,
      },
    });

    // If the tool was in CALIBRATION_DUE, move it to AVAILABLE.
    // Don't overwrite CHECKED_OUT / OUT_OF_SERVICE / LOST — those are user-managed.
    const nextStatus = tool.status === 'CALIBRATION_DUE' ? 'AVAILABLE' : tool.status;

    await tx.tool.update({
      where: { id },
      data: {
        lastCalibratedAt:   performedAt,
        nextCalibrationDue: nextDue,
        calibrationCertUrl: body.certUrl ?? tool.calibrationCertUrl,
        ...(body.intervalMonthsOverride ? { calibrationIntervalMonths: body.intervalMonthsOverride } : {}),
        status: nextStatus,
      },
    });

    return event;
  });

  await prisma.auditLog.create({
    data: {
      orgId,
      entityType: 'Tool',
      entityId:   id,
      action:     'TOOL_CALIBRATED',
      after: {
        eventId:     result.id,
        performedAt: result.performedAt,
        nextDueAt:   result.nextDueAt,
      },
    },
  }).catch(() => {});

  return NextResponse.json({ data: result }, { status: 201 });
}
