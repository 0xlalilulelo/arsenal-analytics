import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      lineItems: { orderBy: { id: 'asc' } },
      workOrder: { select: { id: true, number: true } },
    },
  });
  if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: po });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { status, vendor, notes, expectedDate, shippingCost } = body;

  const po = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(vendor ? { vendor } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(expectedDate !== undefined ? { expectedDate: expectedDate ? new Date(expectedDate) : null } : {}),
      ...(shippingCost !== undefined ? { shippingCost } : {}),
    },
    include: { lineItems: true, workOrder: { select: { id: true, number: true } } },
  });
  return NextResponse.json({ data: po });
}
