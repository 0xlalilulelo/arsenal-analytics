import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const squawks = await prisma.squawk.findMany({
    where: { workOrderId: params.id },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json({ data: squawks });
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();
    const { description, isAirworthiness = false, estLaborHours, estPartsTotal } = body;

    const estTotal =
      estLaborHours && estPartsTotal ? estLaborHours * 115 + estPartsTotal
      : estPartsTotal ?? null;

    const squawk = await prisma.squawk.create({
      data: {
        workOrderId: params.id,
        description,
        isAirworthiness,
        estLaborHours: estLaborHours ?? null,
        estPartsTotal: estPartsTotal ?? null,
        estTotal,
        status: 'PENDING_APPROVAL',
      },
    });

    return NextResponse.json({ data: squawk }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/work-orders/[id]/squawks — approve/decline a squawk
// Body: { squawkId, status: 'APPROVED' | 'DECLINED' | 'DEFERRED', approvedBy?, declineReason? }
export async function PATCH(request: NextRequest, _ctx: Params) {
  try {
    const body = await request.json();
    const { squawkId, status, approvedBy, declineReason } = body;

    const squawk = await prisma.squawk.update({
      where: { id: squawkId },
      data: {
        status,
        ...(status === 'APPROVED' ? { approvedBy, approvedAt: new Date() } : {}),
        ...(status === 'DECLINED' ? { declinedAt: new Date(), declineReason } : {}),
      },
    });

    return NextResponse.json({ data: squawk });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
