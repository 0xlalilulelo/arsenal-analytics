import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

type Params = { params: Promise<{ id: string }> };

function roundToIncrement(hours: number, incrementMinutes: number): number {
  const increment = incrementMinutes / 60;
  return Math.round(hours / increment) * increment;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { technicianId, date, hours, description, lineItemId, billable = true } = body;

    const [tech, wo, org] = await Promise.all([
      prisma.technician.findUnique({ where: { id: technicianId }, select: { billRate: true, name: true } }),
      prisma.workOrder.findUnique({ where: { id }, include: { laborRate: { select: { multiplier: true } }, org: { select: { laborRoundingMinutes: true } } } }),
      prisma.organization.findFirst({ select: { id: true, laborRoundingMinutes: true } }),
    ]);

    if (!tech) return NextResponse.json({ error: 'Technician not found' }, { status: 404 });
    if (!wo) return NextResponse.json({ error: 'Work order not found' }, { status: 404 });

    const multiplier = wo.laborRate.multiplier;
    const rateUsed = tech.billRate * multiplier;
    const roundingMinutes = org?.laborRoundingMinutes ?? 15;
    const billedHours = roundToIncrement(hours, roundingMinutes);

    const entry = await prisma.laborEntry.create({
      data: {
        workOrderId: id,
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

    // Audit log
    await prisma.auditLog.create({
      data: {
        orgId: wo.orgId,
        entityType: 'WorkOrder',
        entityId: id,
        action: 'LABOR_LOGGED',
        actorName: tech.name,
        meta: { hours: billedHours, rateUsed, billable, description: description ?? null },
      },
    }).catch(() => {/* non-critical */});

    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/work-orders/[id]/labor — clock out (update clockOut on an entry)
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { entryId, clockOut } = body;

    const entry = await prisma.laborEntry.findUnique({
      where: { id: entryId },
      include: { technician: { select: { billRate: true } } },
    });
    if (!entry) return NextResponse.json({ error: 'Labor entry not found' }, { status: 404 });
    if (!entry.clockIn) return NextResponse.json({ error: 'No clock-in recorded' }, { status: 422 });

    const org = await prisma.organization.findFirst({ select: { laborRoundingMinutes: true } });
    const roundingMinutes = org?.laborRoundingMinutes ?? 15;

    const clockOutDate = new Date(clockOut);
    const rawMinutes = Math.round((clockOutDate.getTime() - entry.clockIn.getTime()) / 60000);
    const billedHours = roundToIncrement(rawMinutes / 60, roundingMinutes);

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
