import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { getOrgId } from '@/lib/get-org-id';
import { validateExpirationBeforeInstall } from '@mro/core';

// GET /api/work-orders/[id]/parts/[partId]/eligible-lots
// Returns lots that can satisfy this part request at install time:
//   - same orgId, same partNumber, same condition
//   - qtyOnHand >= requested qty
//   - not expired
// Each lot is annotated with an expiration verdict (ok | warn).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> },
) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: workOrderId, partId: partRequestId } = await params;

  const pr = await prisma.partRequest.findFirst({
    where: { id: partRequestId, workOrderId },
    include: { workOrder: { select: { orgId: true } } },
  });
  if (!pr || pr.workOrder.orgId !== orgId) {
    return NextResponse.json({ error: 'Part request not found' }, { status: 404 });
  }

  const part = await prisma.part.findFirst({
    where: { orgId, partNumber: pr.partNumber, condition: pr.condition },
    select: { id: true },
  });
  if (!part) {
    return NextResponse.json({ data: [], reason: 'NO_CATALOG_PART' });
  }

  const lots = await prisma.partLot.findMany({
    where: { partId: part.id, condition: pr.condition },
    orderBy: [{ createdAt: 'asc' }],
  });

  const annotated = lots
    .map(lot => {
      const verdict = validateExpirationBeforeInstall(lot);
      return {
        id:              lot.id,
        serialNumber:    lot.serialNumber,
        lotNumber:       lot.lotNumber,
        batchNumber:     lot.batchNumber,
        revision:        lot.revision,
        qtyOnHand:       lot.qtyOnHand,
        mfgDate:         lot.mfgDate,
        expirationDate:  lot.expirationDate,
        cocDocUrl:       lot.cocDocUrl,
        form8130Url:     lot.form8130Url,
        createdAt:       lot.createdAt,
        verdict,
        sufficientQty:   lot.qtyOnHand >= pr.qty,
      };
    })
    // Hide blocked lots from selection (expired / no qty).
    .filter(l => l.verdict.status !== 'block' && l.sufficientQty);

  return NextResponse.json({ data: annotated, requiredQty: pr.qty, requires8130: pr.requires8130 });
}
