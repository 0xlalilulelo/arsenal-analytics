import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { WorkOrderStatus, WorkOrderType } from '@prisma/client';

// GET /api/work-orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') ?? 'demo-org';
    const status = searchParams.get('status') as WorkOrderStatus | null;
    const type = searchParams.get('type') as WorkOrderType | null;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);

    const workOrders = await prisma.workOrder.findMany({
      where: {
        orgId,
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
        ...(search
          ? {
              OR: [
                { woNumber: { contains: search, mode: 'insensitive' } },
                { title: { contains: search, mode: 'insensitive' } },
                { customer: { name: { contains: search, mode: 'insensitive' } } },
                { aircraft: { nNumber: { contains: search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        customer: { select: { name: true, accountNumber: true } },
        aircraft: { select: { nNumber: true, make: true, model: true } },
        _count: { select: { laborEntries: true, squawks: true, partUsages: true } },
      },
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.workOrder.count({
      where: { orgId, ...(status ? { status } : {}), ...(type ? { type } : {}) },
    });

    return NextResponse.json({ data: workOrders, total, page, limit });
  } catch (error) {
    console.error('GET /api/work-orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/work-orders
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orgId = 'demo-org',
      customerId,
      aircraftId,
      type = 'SCHEDULED',
      title,
      description,
      inDate,
      estimatedCompletion,
      lineItems = [],
    } = body;

    // Generate WO number
    const year = new Date().getFullYear();
    const count = await prisma.workOrder.count({ where: { orgId } });
    const woNumber = `WO-${year}-${String(count + 1).padStart(4, '0')}`;

    const workOrder = await prisma.workOrder.create({
      data: {
        orgId,
        woNumber,
        customerId,
        aircraftId,
        type,
        title,
        description,
        inDate: inDate ? new Date(inDate) : null,
        estimatedCompletion: estimatedCompletion ? new Date(estimatedCompletion) : null,
        priority: type === 'AOG' ? 10 : 0,
        lineItems: {
          create: lineItems.map((li: { title: string; description?: string; ataChapter?: string; estimatedHours?: number }, idx: number) => ({
            sortOrder: idx,
            title: li.title,
            description: li.description,
            ataChapter: li.ataChapter,
            estimatedHours: li.estimatedHours ?? 0,
          })),
        },
        statusHistory: {
          create: {
            toStatus: 'ESTIMATE',
            changedBy: 'system',
          },
        },
      },
      include: {
        customer: true,
        aircraft: true,
        lineItems: true,
      },
    });

    return NextResponse.json({ data: workOrder }, { status: 201 });
  } catch (error) {
    console.error('POST /api/work-orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
