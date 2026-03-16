import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const squawks = await prisma.squawk.findMany({
    where: { workOrderId: id },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json({ data: squawks });
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { description, isAirworthiness = false, estLaborHours, estPartsTotal } = body;

    const estTotal =
      estLaborHours && estPartsTotal ? estLaborHours * 115 + estPartsTotal
      : estPartsTotal ?? null;

    const squawk = await prisma.squawk.create({
      data: {
        workOrderId: id,
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
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { squawkId, status, approvedBy, declineReason, photoUrls } = body;

    const prevSquawk = await prisma.squawk.findUnique({
      where: { id: squawkId },
      select: { status: true, workOrderId: true, description: true },
    });

    const squawk = await prisma.squawk.update({
      where: { id: squawkId },
      data: {
        ...(status ? { status } : {}),
        ...(status === 'APPROVED' ? { approvedBy, approvedAt: new Date() } : {}),
        ...(status === 'DECLINED' ? { declinedAt: new Date(), declineReason } : {}),
        ...(Array.isArray(photoUrls) ? { photoUrls } : {}),
      },
    });

    // Audit log for squawk status changes
    if (status && prevSquawk && status !== prevSquawk.status) {
      const wo = await prisma.workOrder.findUnique({ where: { id }, select: { orgId: true } });
      if (wo) {
        await prisma.auditLog.create({
          data: {
            orgId: wo.orgId,
            entityType: 'WorkOrder',
            entityId: id,
            action: 'SQUAWK_STATUS_CHANGED',
            actorName: approvedBy ?? null,
            before: { squawkStatus: prevSquawk.status },
            after: { squawkStatus: status },
            meta: { squawkId, description: prevSquawk.description },
          },
        }).catch(() => {/* non-critical */});
      }
    }

    return NextResponse.json({ data: squawk });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
