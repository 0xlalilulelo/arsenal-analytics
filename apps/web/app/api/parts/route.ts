import { NextRequest, NextResponse } from 'next/server';
import { getOrgId } from '@/lib/get-org-id';
import { prisma } from '@mro/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const category = searchParams.get('category');
  const lowStock = searchParams.get('lowStock') === 'true';
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);

  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const where = {
    orgId,
    ...(category ? { category } : {}),
    ...(search ? {
      OR: [
        { partNumber: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
        { manufacturer: { contains: search, mode: 'insensitive' as const } },
        { bin: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {}),
  };

  const [parts, total, categories] = await Promise.all([
    prisma.part.findMany({
      where,
      orderBy: { partNumber: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.part.count({ where }),
    // Return distinct categories for filter dropdown
    prisma.part.findMany({
      where: { orgId, category: { not: null } },
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    }),
  ]);

  // If lowStock filter requested, apply after fetch (reorderPoint comparison)
  const filtered = lowStock
    ? parts.filter(p => p.reorderPoint !== null && p.qtyOnHand <= p.reorderPoint)
    : parts;

  return NextResponse.json({
    data: filtered,
    total,
    page,
    limit,
    categories: categories.map(c => c.category).filter(Boolean),
  });
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const {
      partNumber, description, category, manufacturer,
      qtyOnHand, unitCost, unitBillPrice, markupPct,
      bin, notes, reorderPoint, reorderQty,
    } = body;
    const part = await prisma.part.create({
      data: {
        orgId,
        ...(partNumber !== undefined ? { partNumber } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(manufacturer !== undefined ? { manufacturer } : {}),
        ...(qtyOnHand !== undefined ? { qtyOnHand } : {}),
        ...(unitCost !== undefined ? { unitCost } : {}),
        ...(unitBillPrice !== undefined ? { unitBillPrice } : {}),
        ...(markupPct !== undefined ? { markupPct } : {}),
        ...(bin !== undefined ? { bin } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(reorderPoint !== undefined ? { reorderPoint } : {}),
        ...(reorderQty !== undefined ? { reorderQty } : {}),
      },
    });
    return NextResponse.json({ data: part }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
