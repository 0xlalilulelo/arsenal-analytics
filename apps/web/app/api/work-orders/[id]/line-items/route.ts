import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { description, estHours = 0, referenceDoc, laborRate: bodyLaborRate } = body;

    if (!description?.trim()) {
      return NextResponse.json({ error: 'description is required' }, { status: 422 });
    }

    const wo = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        laborRate: true,
        lineItems: { select: { id: true } },
      },
    });

    if (!wo) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    const laborRate = typeof bodyLaborRate === 'number' ? bodyLaborRate : wo.laborRate.rate;
    const taskCount = wo.lineItems.length;
    const taskNumber = `TC-${String(taskCount + 1).padStart(3, '0')}`;

    const lineItem = await prisma.workOrderLineItem.create({
      data: {
        workOrderId: id,
        taskNumber,
        description: description.trim(),
        referenceDoc: referenceDoc?.trim() || null,
        estHours: typeof estHours === 'number' ? estHours : parseFloat(estHours) || 0,
        laborRate,
        sortOrder: taskCount,
      },
    });

    return NextResponse.json({ data: lineItem }, { status: 201 });
  } catch (e) {
    console.error('[LINE_ITEM_POST]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
