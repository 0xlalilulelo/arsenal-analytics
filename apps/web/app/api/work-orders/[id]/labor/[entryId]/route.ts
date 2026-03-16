import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

type Params = { params: { id: string; entryId: string } };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();
    const { hours, description, billable, date } = body;

    const entry = await prisma.laborEntry.findFirst({
      where: { id: params.entryId, workOrderId: params.id },
    });
    if (!entry) return NextResponse.json({ error: 'Labor entry not found' }, { status: 404 });

    const updated = await prisma.laborEntry.update({
      where: { id: params.entryId },
      data: {
        ...(hours !== undefined ? { hours: parseFloat(hours) } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(billable !== undefined ? { billable } : {}),
        ...(date !== undefined ? { date: new Date(date) } : {}),
      },
      include: { technician: { select: { name: true } } },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error('[LABOR_ENTRY_PATCH]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const entry = await prisma.laborEntry.findFirst({
      where: { id: params.entryId, workOrderId: params.id },
    });
    if (!entry) return NextResponse.json({ error: 'Labor entry not found' }, { status: 404 });

    await prisma.laborEntry.delete({ where: { id: params.entryId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[LABOR_ENTRY_DELETE]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
