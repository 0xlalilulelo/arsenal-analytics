import { NextRequest, NextResponse } from 'next/server';
import { getOrgId } from '@/lib/get-org-id';
import { prisma } from '@mro/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const part = await prisma.part.findFirst({ where: { id, orgId } });
  if (!part) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: part });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const part = await prisma.part.findFirst({ where: { id, orgId } });
  if (!part) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json() as {
    description?: string;
    category?: string;
    manufacturer?: string;
    unitCost?: number;
    markupPct?: number;
    bin?: string;
    notes?: string;
    reorderPoint?: number | null;
    reorderQty?: number | null;
    qtyAdjust?: number;  // signed delta (positive = receive stock, negative = consume)
  };

  const { qtyAdjust, ...fields } = body;

  const updated = await prisma.part.update({
    where: { id },
    data: {
      ...fields,
      ...(qtyAdjust !== undefined
        ? { qtyOnHand: { increment: qtyAdjust } }
        : {}),
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const part = await prisma.part.findFirst({ where: { id, orgId } });
  if (!part) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.part.delete({ where: { id } });
  return NextResponse.json({ data: { deleted: true } });
}
