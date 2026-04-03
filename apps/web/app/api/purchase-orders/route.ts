import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import type { POStatus } from '@prisma/client';
import { getOrgId } from '@/lib/get-org-id';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as POStatus | null;
  const workOrderId = searchParams.get('workOrderId');
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);

  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const where = {
    orgId,
    ...(status ? { status } : {}),
    ...(workOrderId ? { workOrderId } : {}),
  };

  const [pos, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        workOrder: { select: { id: true, number: true } },
        lineItems: true,
        _count: { select: { lineItems: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  // Compute totalCost per PO from lineItems
  const data = pos.map(po => ({
    ...po,
    totalCost: po.lineItems.reduce((s, li) => s + li.qty * li.unitCost, 0) + po.shippingCost,
  }));

  return NextResponse.json({ data, total, page, limit });
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { vendor, workOrderId, notes, expedited = false, priority, expectedDate, lineItems = [] } = body;

    if (!vendor) return NextResponse.json({ error: 'vendor is required' }, { status: 422 });

    const count = await prisma.purchaseOrder.count({ where: { orgId } });
    const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const po = await prisma.purchaseOrder.create({
      data: {
        orgId,
        poNumber,
        vendor,
        workOrderId: workOrderId ?? null,
        expedited,
        priority: priority ?? null,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        notes: notes ?? null,
        lineItems: {
          create: (lineItems as {
            partNumber: string; description: string; qty: number;
            unitCost: number; condition?: string; requires8130?: boolean;
          }[]).map(li => ({
            partNumber: li.partNumber,
            description: li.description,
            qty: li.qty,
            unitCost: li.unitCost,
            condition: (li.condition ?? 'NEW') as any,
            requires8130: li.requires8130 ?? false,
          })),
        },
      },
      include: {
        workOrder: { select: { id: true, number: true } },
        lineItems: true,
      },
    });

    return NextResponse.json({ data: po }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
