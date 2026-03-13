import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: purchaseOrderId } = await params;
  const body = await request.json();
  const { partNumber, description, qty, unitCost, condition, requires8130 } = body;

  if (!partNumber?.trim()) return NextResponse.json({ error: 'partNumber required' }, { status: 422 });
  if (!description?.trim()) return NextResponse.json({ error: 'description required' }, { status: 422 });
  if (!qty || qty < 1) return NextResponse.json({ error: 'qty must be >= 1' }, { status: 422 });
  if (unitCost == null || unitCost < 0) return NextResponse.json({ error: 'unitCost required' }, { status: 422 });

  const lineItem = await prisma.pOLineItem.create({
    data: {
      purchaseOrderId,
      partNumber: partNumber.trim(),
      description: description.trim(),
      qty: parseInt(qty),
      unitCost: parseFloat(unitCost),
      condition: condition ?? 'NEW',
      requires8130: requires8130 ?? false,
    },
  });

  return NextResponse.json({ data: lineItem }, { status: 201 });
}
