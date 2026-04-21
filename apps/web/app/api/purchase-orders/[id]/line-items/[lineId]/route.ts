import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import type { POStatus } from '@prisma/client';
import { getOrgId } from '@/lib/get-org-id';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lineId: string }> },
) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: purchaseOrderId, lineId } = await params;
  const body = await request.json() as {
    receivedQty: number | string;
    // Optional traceability fields supplied at receive-time. When present, create a PartLot.
    serialNumber?: string;
    lotNumber?: string;
    batchNumber?: string;
    mfgDate?: string;
    expirationDate?: string;
    cocDocUrl?: string;
    form8130Url?: string;
  };
  const qty = typeof body.receivedQty === 'string' ? parseInt(body.receivedQty) : body.receivedQty;
  if (!Number.isFinite(qty) || qty < 0) {
    return NextResponse.json({ error: 'receivedQty must be a non-negative number' }, { status: 422 });
  }

  // Load PO line with the PO org for auth
  const lineWithPo = await prisma.pOLineItem.findUnique({
    where: { id: lineId },
    include: { purchaseOrder: { select: { orgId: true } } },
  });
  if (!lineWithPo || lineWithPo.purchaseOrderId !== purchaseOrderId || lineWithPo.purchaseOrder.orgId !== orgId) {
    return NextResponse.json({ error: 'PO line not found' }, { status: 404 });
  }

  const previouslyReceived = lineWithPo.receivedQty;
  const delta = qty - previouslyReceived;

  const lineItem = await prisma.pOLineItem.update({
    where: { id: lineId },
    data: {
      receivedQty: qty,
      receivedAt: qty > 0 ? new Date() : null,
    },
  });

  // Auto-create a PartLot row when additional quantity was received this call.
  // Skip if delta <= 0 (reversal or no change). Only create when we can match a
  // Part row in this org by partNumber + condition (the Part schema's unique key).
  if (delta > 0) {
    const part = await prisma.part.findFirst({
      where: {
        orgId,
        partNumber: lineItem.partNumber,
        condition:  lineItem.condition,
      },
      select: { id: true },
    });
    if (part) {
      const hasTraceability = !!(body.serialNumber || body.lotNumber || body.batchNumber);
      await prisma.partLot.create({
        data: {
          partId:           part.id,
          serialNumber:     body.serialNumber ?? null,
          lotNumber:        body.lotNumber ?? (hasTraceability ? null : `PO-${purchaseOrderId.slice(-6)}-${lineId.slice(-4)}`),
          batchNumber:      body.batchNumber ?? null,
          mfgDate:          body.mfgDate        ? new Date(body.mfgDate)        : null,
          expirationDate:   body.expirationDate ? new Date(body.expirationDate) : null,
          qtyOnHand:        delta,
          condition:        lineItem.condition,
          receivedPoLineId: lineItem.id,
          cocDocUrl:        body.cocDocUrl   ?? null,
          form8130Url:      body.form8130Url ?? null,
          notes:            hasTraceability ? null : 'Auto-generated on PO receipt — add traceability before install.',
        },
      });
    }
  }

  // Recompute PO status
  const allItems = await prisma.pOLineItem.findMany({ where: { purchaseOrderId } });
  const totalQty = allItems.reduce((s, i) => s + i.qty, 0);
  const totalReceived = allItems.reduce((s, i) => s + i.receivedQty, 0);

  const newStatus: POStatus =
    totalReceived === 0 ? 'SUBMITTED'
    : totalReceived >= totalQty ? 'RECEIVED'
    : 'PARTIALLY_RECEIVED';

  const po = await prisma.purchaseOrder.update({
    where: { id: purchaseOrderId },
    data: {
      status: newStatus,
      ...(newStatus === 'RECEIVED' ? { receivedAt: new Date() } : {}),
    },
    include: { lineItems: true },
  });

  return NextResponse.json({ data: { lineItem, po } });
}
