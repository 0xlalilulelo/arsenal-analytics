import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

type Params = { params: { id: string; lineItemId: string } };

const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETE', 'AWAITING_INSPECTION', 'SIGNED_OFF'];

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 422 },
      );
    }

    const lineItem = await prisma.workOrderLineItem.findFirst({
      where: { id: params.lineItemId, workOrderId: params.id },
    });
    if (!lineItem) {
      return NextResponse.json({ error: 'Line item not found' }, { status: 404 });
    }

    const updated = await prisma.workOrderLineItem.update({
      where: { id: params.lineItemId },
      data: {
        status,
        ...(status === 'COMPLETE' || status === 'SIGNED_OFF'
          ? { completedAt: lineItem.completedAt ?? new Date() }
          : {}),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error('[LINE_ITEM_PATCH]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
