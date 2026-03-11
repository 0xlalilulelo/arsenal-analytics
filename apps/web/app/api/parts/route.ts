import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

// GET /api/parts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') ?? 'demo-org';
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);

    const parts = await prisma.part.findMany({
      where: {
        orgId,
        ...(search
          ? {
              OR: [
                { partNumber: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { manufacturer: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ partNumber: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.part.count({ where: { orgId } });

    return NextResponse.json({ data: parts, total, page, limit });
  } catch (error) {
    console.error('GET /api/parts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/parts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orgId = 'demo-org',
      partNumber,
      description,
      manufacturer,
      condition = 'NEW',
      unitCost = 0,
      defaultMarkupPct = 30,
      qtyOnHand = 0,
      reorderPoint,
      location,
      isTraceable = false,
      isSerialized = false,
    } = body;

    const part = await prisma.part.create({
      data: {
        orgId,
        partNumber,
        description,
        manufacturer,
        condition,
        unitCost,
        defaultMarkupPct,
        qtyOnHand,
        reorderPoint,
        location,
        isTraceable,
        isSerialized,
      },
    });

    return NextResponse.json({ data: part }, { status: 201 });
  } catch (error) {
    console.error('POST /api/parts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
