import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

type Params = { params: { id: string } };

// GET /api/work-orders/[id]/squawks
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const squawks = await prisma.squawk.findMany({
      where: { workOrderId: params.id },
      include: { photos: true },
      orderBy: { number: 'asc' },
    });
    return NextResponse.json({ data: squawks });
  } catch (error) {
    console.error('GET squawks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/work-orders/[id]/squawks
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();
    const { description, foundBy, estimatedCost, isAirworthiness } = body;

    const count = await prisma.squawk.count({ where: { workOrderId: params.id } });

    const squawk = await prisma.squawk.create({
      data: {
        workOrderId: params.id,
        number: count + 1,
        description,
        foundBy,
        estimatedCost: estimatedCost ?? null,
        status: 'OPEN',
        approvalStatus: 'PENDING_CUSTOMER',
      },
    });

    return NextResponse.json({ data: squawk }, { status: 201 });
  } catch (error) {
    console.error('POST squawks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
