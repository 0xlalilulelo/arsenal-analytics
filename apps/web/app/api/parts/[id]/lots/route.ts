import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import type { PartCondition } from '@prisma/client';
import { getOrgId } from '@/lib/get-org-id';

// GET /api/parts/[id]/lots — list all lots for a part
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const part = await prisma.part.findUnique({ where: { id }, select: { orgId: true } });
  if (!part || part.orgId !== orgId) {
    return NextResponse.json({ error: 'Part not found' }, { status: 404 });
  }

  const lots = await prisma.partLot.findMany({
    where: { partId: id },
    orderBy: [{ createdAt: 'desc' }],
    include: {
      receivedPoLine: {
        select: {
          purchaseOrder: { select: { id: true, poNumber: true, vendor: true } },
        },
      },
    },
  });
  return NextResponse.json({ data: lots });
}

// POST /api/parts/[id]/lots — create a new lot (manual entry, outside PO receipt)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: partId } = await params;
    const body = await request.json() as {
      serialNumber?: string;
      lotNumber?: string;
      batchNumber?: string;
      mfgDate?: string;
      expirationDate?: string;
      revision?: string;
      qtyOnHand: number;
      condition?: PartCondition;
      receivedPoLineId?: string;
      cocDocUrl?: string;
      form8130Url?: string;
      notes?: string;
    };

    const part = await prisma.part.findUnique({ where: { id: partId }, select: { orgId: true, condition: true } });
    if (!part || part.orgId !== orgId) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 });
    }

    // Traceability requires at least one identifier
    if (!body.serialNumber && !body.lotNumber && !body.batchNumber) {
      return NextResponse.json(
        { error: 'At least one of serialNumber, lotNumber, or batchNumber is required' },
        { status: 422 },
      );
    }
    if (body.qtyOnHand == null || body.qtyOnHand < 0) {
      return NextResponse.json({ error: 'qtyOnHand must be >= 0' }, { status: 422 });
    }

    const lot = await prisma.partLot.create({
      data: {
        partId,
        serialNumber:     body.serialNumber ?? null,
        lotNumber:        body.lotNumber ?? null,
        batchNumber:      body.batchNumber ?? null,
        mfgDate:          body.mfgDate ? new Date(body.mfgDate) : null,
        expirationDate:   body.expirationDate ? new Date(body.expirationDate) : null,
        revision:         body.revision ?? null,
        qtyOnHand:        body.qtyOnHand,
        condition:        body.condition ?? part.condition,
        receivedPoLineId: body.receivedPoLineId ?? null,
        cocDocUrl:        body.cocDocUrl ?? null,
        form8130Url:      body.form8130Url ?? null,
        notes:            body.notes ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        orgId,
        entityType: 'PartLot',
        entityId:   lot.id,
        action:     'LOT_CREATED',
        after:      {
          serialNumber: lot.serialNumber,
          lotNumber:    lot.lotNumber,
          qtyOnHand:    lot.qtyOnHand,
          condition:    lot.condition,
        },
      },
    }).catch(() => {/* non-critical */});

    return NextResponse.json({ data: lot }, { status: 201 });
  } catch (e) {
    console.error('[PART LOTS] Create failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
