import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import type { WorkOrderStatus, WorkOrderType } from '@prisma/client';

async function resolveOrgId() {
  const org = await prisma.organization.findFirst({ where: { slug: 'arsenal-aviation' }, select: { id: true } });
  return org?.id ?? null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as WorkOrderStatus | null;
  const type = searchParams.get('type') as WorkOrderType | null;
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);

  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  const [workOrders, total] = await Promise.all([
    prisma.workOrder.findMany({
      where: {
        orgId,
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
        ...(search ? { OR: [
          { number: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
          { aircraft: { nNumber: { contains: search, mode: 'insensitive' } } },
        ]} : {}),
      },
      include: {
        customer: { select: { name: true, accountNumber: true } },
        aircraft: { select: { nNumber: true, make: true, model: true } },
        _count: { select: { laborEntries: true, squawks: true, partRequests: true } },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.workOrder.count({ where: { orgId, ...(status ? { status } : {}), ...(type ? { type } : {}) } }),
  ]);

  return NextResponse.json({ data: workOrders, total, page, limit });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, aircraftId, nNumber, type = 'SCHEDULED', notes, estimatedClose, billingModel = 'TIME_AND_MATERIALS', lineItems = [] } = body;

    const orgId = await resolveOrgId();
    if (!orgId) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

    // Resolve aircraft: prefer explicit aircraftId, fall back to nNumber lookup/create
    let resolvedAircraftId = aircraftId;
    if (!resolvedAircraftId && nNumber) {
      const existing = await prisma.aircraft.findFirst({ where: { nNumber: nNumber.toUpperCase() } });
      if (existing) {
        resolvedAircraftId = existing.id;
      } else {
        const created = await prisma.aircraft.create({
          data: { nNumber: nNumber.toUpperCase(), make: 'Unknown', model: 'Unknown', serial: 'UNKNOWN', customerId },
        });
        resolvedAircraftId = created.id;
      }
    }
    if (!resolvedAircraftId) return NextResponse.json({ error: 'Aircraft required' }, { status: 422 });

    const laborRate = await prisma.laborRate.findFirst({ where: { orgId, isDefault: true }, select: { id: true, rate: true } });
    if (!laborRate) return NextResponse.json({ error: 'No default labor rate' }, { status: 422 });

    const count = await prisma.workOrder.count({ where: { orgId } });
    const number = `WO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const wo = await prisma.workOrder.create({
      data: {
        orgId, number, type, customerId, aircraftId: resolvedAircraftId,
        laborRateId: laborRate.id, billingModel, notes,
        estimatedClose: estimatedClose ? new Date(estimatedClose) : null,
        lineItems: {
          create: (lineItems as { description: string; referenceDoc?: string; estHours?: number }[]).map((li, idx) => ({
            taskNumber: `TASK-${String(idx + 1).padStart(3, '0')}`,
            description: li.description,
            referenceDoc: li.referenceDoc,
            estHours: li.estHours ?? 0,
            laborRate: laborRate.rate,
            sortOrder: idx,
          })),
        },
      },
      include: { customer: true, aircraft: true, lineItems: true },
    });

    return NextResponse.json({ data: wo }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
