import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

type Params = { params: Promise<{ id: string; partId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id, partId } = await params;
    const body = await request.json();
    const { has8130 } = body;

    const part = await prisma.partRequest.findFirst({
      where: { id: partId, workOrderId: id },
    });
    if (!part) return NextResponse.json({ error: 'Part request not found' }, { status: 404 });

    const updated = await prisma.partRequest.update({
      where: { id: partId },
      data: { ...(has8130 !== undefined ? { has8130 } : {}) },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error('[PART_REQUEST_PATCH]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
