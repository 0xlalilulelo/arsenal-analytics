import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lineId: string }> },
) {
  const { id: purchaseOrderId, lineId } = await params;
  const body = await request.json();
  const { receivedQty } = body;

  const lineItem = await prisma.pOLineItem.update({
    where: { id: lineId },
    data: {
      receivedQty: parseInt(receivedQty),
      receivedAt: parseInt(receivedQty) > 0 ? new Date() : null,
    },
  });

  // Recompute PO status based on all line items
  const allItems = await prisma.pOLineItem.findMany({ where: { purchaseOrderId } });
  const totalQty = allItems.reduce((s, i) => s + i.qty, 0);
  const totalReceived = allItems.reduce((s, i) => s + i.receivedQty, 0);

  let newStatus: string;
  if (totalReceived === 0) newStatus = 'SUBMITTED';
  else if (totalReceived >= totalQty) newStatus = 'RECEIVED';
  else newStatus = 'PARTIALLY_RECEIVED';

  const po = await prisma.purchaseOrder.update({
    where: { id: purchaseOrderId },
    data: {
      status: newStatus as any,
      ...(newStatus === 'RECEIVED' ? { receivedAt: new Date() } : {}),
    },
    include: { lineItems: true },
  });

  return NextResponse.json({ data: { lineItem, po } });
}
