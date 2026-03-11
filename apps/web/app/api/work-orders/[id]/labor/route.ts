import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { roundToQuarterHour } from '@mro/core';

type Params = { params: { id: string } };

// POST /api/work-orders/[id]/labor — clock in or create labor entry
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();
    const { technicianId, clockIn, clockOut, notes, lineItemId, isBillable = true } = body;

    const technician = await prisma.technician.findUnique({
      where: { id: technicianId },
      select: { billingRate: true, costRate: true, aogBillingRate: true },
    });

    if (!technician) {
      return NextResponse.json({ error: 'Technician not found' }, { status: 404 });
    }

    const workOrder = await prisma.workOrder.findUnique({
      where: { id: params.id },
      select: { type: true },
    });

    const isAog = workOrder?.type === 'AOG';
    const billingRate = isAog
      ? (technician.aogBillingRate ?? Number(technician.billingRate) * 1.5)
      : technician.billingRate;

    const clockInDate = new Date(clockIn);
    const clockOutDate = clockOut ? new Date(clockOut) : null;

    let billedHours: number | null = null;
    let rawMinutes: number | null = null;
    let totalBilled: number | null = null;
    let totalCost: number | null = null;

    if (clockOutDate) {
      rawMinutes = Math.round((clockOutDate.getTime() - clockInDate.getTime()) / 60000);
      billedHours = roundToQuarterHour(rawMinutes / 60);
      totalBilled = billedHours * Number(billingRate);
      totalCost = billedHours * Number(technician.costRate);
    }

    const entry = await prisma.laborEntry.create({
      data: {
        workOrderId: params.id,
        lineItemId: lineItemId ?? null,
        technicianId,
        clockIn: clockInDate,
        clockOut: clockOutDate,
        rawMinutes,
        billedHours,
        billingRate,
        costRate: technician.costRate,
        totalBilled,
        totalCost,
        isAog,
        isBillable,
        notes,
      },
      include: {
        technician: { select: { firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error) {
    console.error('POST /api/work-orders/[id]/labor error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
