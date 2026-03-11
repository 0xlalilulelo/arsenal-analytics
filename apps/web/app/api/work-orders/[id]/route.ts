import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { STAGE_TRANSITIONS } from '@mro/core';
import { WorkOrderStatus } from '@prisma/client';

type Params = { params: { id: string } };

// GET /api/work-orders/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        aircraft: true,
        lineItems: { orderBy: { sortOrder: 'asc' } },
        squawks: { include: { photos: true }, orderBy: { number: 'asc' } },
        laborEntries: {
          include: { technician: { select: { firstName: true, lastName: true } } },
          orderBy: { clockIn: 'desc' },
        },
        partUsages: { include: { part: true }, orderBy: { usedAt: 'desc' } },
        invoices: { orderBy: { createdAt: 'desc' } },
        milestones: { orderBy: { sortOrder: 'asc' } },
        statusHistory: { orderBy: { changedAt: 'desc' } },
        purchaseOrders: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    return NextResponse.json({ data: workOrder });
  } catch (error) {
    console.error('GET /api/work-orders/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/work-orders/[id]
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();
    const { title, description, estimatedCompletion, internalNotes, notes } = body;

    const workOrder = await prisma.workOrder.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(estimatedCompletion !== undefined
          ? { estimatedCompletion: estimatedCompletion ? new Date(estimatedCompletion) : null }
          : {}),
        ...(internalNotes !== undefined ? { internalNotes } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    });

    return NextResponse.json({ data: workOrder });
  } catch (error) {
    console.error('PUT /api/work-orders/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/work-orders/[id] — status transition
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();
    const { status, note, changedBy = 'system' } = body;

    const existing = await prisma.workOrder.findUnique({
      where: { id: params.id },
      select: { status: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    const allowed = STAGE_TRANSITIONS[existing.status as WorkOrderStatus] ?? [];
    if (!allowed.includes(status as WorkOrderStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${existing.status} to ${status}` },
        { status: 422 }
      );
    }

    const workOrder = await prisma.workOrder.update({
      where: { id: params.id },
      data: {
        status,
        ...(status === 'CLOSED' ? { closedAt: new Date() } : {}),
        statusHistory: {
          create: {
            fromStatus: existing.status,
            toStatus: status,
            changedBy,
            note,
          },
        },
      },
    });

    return NextResponse.json({ data: workOrder });
  } catch (error) {
    console.error('PATCH /api/work-orders/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
