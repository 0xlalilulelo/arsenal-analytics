import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const wo = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      customer: true,
      aircraft: true,
      laborRate: true,
      lineItems: { orderBy: { sortOrder: 'asc' } },
      squawks: { orderBy: { createdAt: 'asc' } },
      laborEntries: {
        include: { technician: { select: { name: true } } },
        orderBy: { date: 'desc' },
      },
      partRequests: { orderBy: { createdAt: 'desc' } },
      invoices: { orderBy: { createdAt: 'desc' } },
      milestones: { orderBy: { sortOrder: 'asc' } },
      complianceItems: { orderBy: { createdAt: 'asc' } },
      purchaseOrders: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!wo) return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
  return NextResponse.json({ data: wo });
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { notes, internalNotes, estimatedClose, estimatedTotal, status, actorName } = body;

    // Read current state before update (for audit log before snapshot)
    const current = await prisma.workOrder.findUnique({
      where: { id },
      select: { orgId: true, status: true, notes: true, estimatedTotal: true },
    });
    if (!current) return NextResponse.json({ error: 'Work order not found' }, { status: 404 });

    const wo = await prisma.workOrder.update({
      where: { id },
      data: {
        ...(notes !== undefined ? { notes } : {}),
        ...(internalNotes !== undefined ? { internalNotes } : {}),
        ...(estimatedClose !== undefined ? { estimatedClose: estimatedClose ? new Date(estimatedClose) : null } : {}),
        ...(estimatedTotal !== undefined ? { estimatedTotal } : {}),
        ...(status !== undefined ? { status, ...(status === 'CLOSED' ? { closedAt: new Date() } : {}) } : {}),
      },
    });

    // Write audit log for status changes
    if (status !== undefined && status !== current.status) {
      await prisma.auditLog.create({
        data: {
          orgId: current.orgId,
          entityType: 'WorkOrder',
          entityId: id,
          action: 'STATUS_CHANGED',
          actorName: actorName ?? null,
          before: { status: current.status },
          after: { status },
        },
      }).catch(() => {/* non-critical */});
    }

    return NextResponse.json({ data: wo });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
