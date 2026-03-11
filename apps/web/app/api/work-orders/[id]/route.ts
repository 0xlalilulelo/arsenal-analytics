import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const wo = await prisma.workOrder.findUnique({
    where: { id: params.id },
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
    const body = await request.json();
    const { notes, internalNotes, estimatedClose, estimatedTotal, status } = body;
    const wo = await prisma.workOrder.update({
      where: { id: params.id },
      data: {
        ...(notes !== undefined ? { notes } : {}),
        ...(internalNotes !== undefined ? { internalNotes } : {}),
        ...(estimatedClose !== undefined ? { estimatedClose: estimatedClose ? new Date(estimatedClose) : null } : {}),
        ...(estimatedTotal !== undefined ? { estimatedTotal } : {}),
        ...(status !== undefined ? { status, ...(status === 'CLOSED' ? { closedAt: new Date() } : {}) } : {}),
      },
    });
    return NextResponse.json({ data: wo });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
