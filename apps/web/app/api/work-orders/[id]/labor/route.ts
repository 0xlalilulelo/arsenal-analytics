import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { roundToQuarterHour } from '@mro/core';

type Params = { params: { id: string } };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();
    const { technicianId, date, hours, description, lineItemId, billable = true } = body;

    const tech = await prisma.technician.findUnique({
      where: { id: technicianId },
      select: { billRate: true },
    });
    if (!tech) return NextResponse.json({ error: 'Technician not found' }, { status: 404 });

    const wo = await prisma.workOrder.findUnique({
      where: { id: params.id },
      include: { laborRate: { select: { multiplier: true } } },
    });
    if (!wo) return NextResponse.json({ error: 'Work order not found' }, { status: 404 });

    const multiplier = wo.laborRate.multiplier;
    const rateUsed = tech.billRate * multiplier;
    const billedHours = roundToQuarterHour(hours);

    const entry = await prisma.laborEntry.create({
      data: {
        workOrderId: params.id,
        lineItemId: lineItemId ?? null,
        technicianId,
        date: new Date(date),
        hours: billedHours,
        rateUsed,
        billable,
        description,
      },
      include: { technician: { select: { name: true } } },
    });

    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/work-orders/[id]/labor — clock out (update clockOut on an entry)
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();
    const { entryId, clockOut } = body;

    const entry = await prisma.laborEntry.findUnique({
      where: { id: entryId },
      include: { technician: { select: { billRate: true } } },
    });
    if (!entry) return NextResponse.json({ error: 'Labor entry not found' }, { status: 404 });
    if (!entry.clockIn) return NextResponse.json({ error: 'No clock-in recorded' }, { status: 422 });

    const clockOutDate = new Date(clockOut);
    const rawMinutes = Math.round((clockOutDate.getTime() - entry.clockIn.getTime()) / 60000);
    const billedHours = roundToQuarterHour(rawMinutes / 60);

    const updated = await prisma.laborEntry.update({
      where: { id: entryId },
      data: { clockOut: clockOutDate, hours: billedHours },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
