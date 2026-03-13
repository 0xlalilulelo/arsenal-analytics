import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { calculateAOGCallout } from '@mro/core';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const wo = await prisma.workOrder.findUnique({
    where: { id },
    select: {
      id: true, number: true, type: true,
      aogEventId: true,
      aogEvent: true,
      laborRate: { select: { rate: true, multiplier: true } },
    },
  });

  if (!wo) return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
  if (wo.type !== 'AOG') return NextResponse.json({ error: 'Not an AOG work order' }, { status: 422 });

  // Compute billing summary
  let billing = null;
  if (wo.aogEvent && wo.laborRate) {
    const breakdown = calculateAOGCallout({
      baseRate: wo.laborRate.rate,
      laborHours: 0,
      mileage: wo.aogEvent.mileage,
      driveHours: wo.aogEvent.driveHours,
      techCount: wo.aogEvent.techCount,
      mileageRate: wo.aogEvent.mileageRate,
      driveRate: wo.aogEvent.driveRate,
    });
    billing = breakdown;
  }

  return NextResponse.json({ data: { ...wo.aogEvent, billing } });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { location, mileage, mileageRate, driveHours, driveRate, techCount, resolvedAt, notes } = body;

    const wo = await prisma.workOrder.findUnique({
      where: { id },
      select: { aogEventId: true, type: true, laborRate: { select: { rate: true } } },
    });

    if (!wo) return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    if (wo.type !== 'AOG' || !wo.aogEventId) {
      return NextResponse.json({ error: 'No AOG event for this work order' }, { status: 422 });
    }

    const updated = await prisma.aOGEvent.update({
      where: { id: wo.aogEventId },
      data: {
        ...(location !== undefined ? { location } : {}),
        ...(mileage !== undefined ? { mileage } : {}),
        ...(mileageRate !== undefined ? { mileageRate } : {}),
        ...(driveHours !== undefined ? { driveHours } : {}),
        ...(driveRate !== undefined ? { driveRate } : {}),
        ...(techCount !== undefined ? { techCount } : {}),
        ...(resolvedAt !== undefined ? { resolvedAt: resolvedAt ? new Date(resolvedAt) : null } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    });

    // Recompute billing breakdown
    const breakdown = wo.laborRate ? calculateAOGCallout({
      baseRate: wo.laborRate.rate,
      laborHours: 0,
      mileage: updated.mileage,
      driveHours: updated.driveHours,
      techCount: updated.techCount,
      mileageRate: updated.mileageRate,
      driveRate: updated.driveRate,
    }) : null;

    return NextResponse.json({ data: { ...updated, billing: breakdown } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
