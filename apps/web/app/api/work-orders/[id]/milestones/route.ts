import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: workOrderId } = await params;
    const body = await request.json();
    const { name, pct } = body;

    if (!name || typeof pct !== 'number' || pct <= 0 || pct > 100) {
      return NextResponse.json({ error: 'name and pct (1–100) required' }, { status: 422 });
    }

    const wo = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: { id: true, _count: { select: { milestones: true } } },
    });
    if (!wo) return NextResponse.json({ error: 'Work order not found' }, { status: 404 });

    const milestone = await prisma.billingMilestone.create({
      data: {
        workOrderId,
        name,
        pct,
        sortOrder: wo._count.milestones,
      },
    });

    return NextResponse.json({ data: milestone }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
