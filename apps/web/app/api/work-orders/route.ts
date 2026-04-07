import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import type { WorkOrderStatus, WorkOrderType } from '@prisma/client';
import { calculateAOGCallout, AOG_MULTIPLIER, AOG_MINIMUM_HOURS, AOG_DEFAULT_MILEAGE_RATE, AOG_DEFAULT_DRIVE_RATE } from '@mro/core';
import { getOrgId, getSessionUser } from '@/lib/get-org-id';
import { hasRole } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as WorkOrderStatus | null;
  const type = searchParams.get('type') as WorkOrderType | null;
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);

  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
        _count: {
          select: {
            laborEntries: true,
            squawks: true,
            partRequests: true,
            communications: { where: { status: 'AWAITING_REPLY' } },
          },
        },
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
    const {
      customerId, aircraftId, nNumber,
      type = 'SCHEDULED', notes, internalNotes, estimatedClose,
      billingModel = 'TIME_AND_MATERIALS', nteAmount,
      quoteId, quotedAmount, depositCollected, billingStage,
      lineItems = [],
      // AOG-specific fields
      aogLocation, aogMileage = 0, aogDriveHours = 0, aogTechCount = 1,
      estHours,
    } = body;

    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sessionUser = await getSessionUser();
    if (!sessionUser || !hasRole(sessionUser.role, 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Numeric bounds validation
    if (typeof aogMileage === 'number' && (aogMileage < 0 || aogMileage > 10000)) {
      return NextResponse.json({ error: 'aogMileage must be between 0 and 10000' }, { status: 422 });
    }
    if (typeof aogDriveHours === 'number' && (aogDriveHours < 0 || aogDriveHours > 24)) {
      return NextResponse.json({ error: 'aogDriveHours must be between 0 and 24' }, { status: 422 });
    }
    if (typeof aogTechCount === 'number' && (aogTechCount < 1 || aogTechCount > 20)) {
      return NextResponse.json({ error: 'aogTechCount must be between 1 and 20' }, { status: 422 });
    }
    if (estHours !== undefined && (typeof estHours !== 'number' || estHours < 0 || estHours > 999)) {
      return NextResponse.json({ error: 'estHours must be between 0 and 999' }, { status: 422 });
    }

    // Resolve aircraft
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

    // Resolve labor rate — for AOG, prefer a rate with multiplier=1.5, else use default and scale
    let laborRate = await prisma.laborRate.findFirst({
      where: { orgId, ...(type === 'AOG' ? { multiplier: AOG_MULTIPLIER } : { isDefault: true }) },
      select: { id: true, rate: true, multiplier: true },
    });
    // If no dedicated AOG rate found, fall back to default
    if (!laborRate) {
      laborRate = await prisma.laborRate.findFirst({ where: { orgId, isDefault: true }, select: { id: true, rate: true, multiplier: true } });
    }
    if (!laborRate) return NextResponse.json({ error: 'No default labor rate configured' }, { status: 422 });

    const effectiveRate = type === 'AOG'
      ? laborRate.rate * (laborRate.multiplier === AOG_MULTIPLIER ? 1 : AOG_MULTIPLIER)
      : laborRate.rate;

    const count = await prisma.workOrder.count({ where: { orgId } });
    const number = `WO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // For AOG: build auto-generated callout line items
    type LIInput = { description: string; referenceDoc?: string; estHours?: number };
    let autoLineItems: { taskNumber: string; description: string; estHours: number; laborRate: number; sortOrder: number }[] = [];

    let aogEventId: string | undefined;

    if (type === 'AOG') {
      // Create AOGEvent record
      const callout = calculateAOGCallout({
        baseRate: laborRate.rate,
        laborHours: 0, // actual hours start at 0; minimum will be billed
        mileage: aogMileage,
        driveHours: aogDriveHours,
        techCount: aogTechCount,
      });

      const aogEvent = await prisma.aOGEvent.create({
        data: {
          orgId,
          location: aogLocation || null,
          calloutFee: callout.calloutFee > 0 ? callout.calloutFee : effectiveRate * AOG_MINIMUM_HOURS,
          mileage: aogMileage,
          mileageRate: AOG_DEFAULT_MILEAGE_RATE,
          driveHours: aogDriveHours,
          driveRate: AOG_DEFAULT_DRIVE_RATE,
          techCount: aogTechCount,
          minimumHours: AOG_MINIMUM_HOURS,
        },
      });
      aogEventId = aogEvent.id;

      // Auto-generate callout line items
      autoLineItems = [
        {
          taskNumber: 'TASK-001',
          description: `AOG Callout — ${AOG_MINIMUM_HOURS}hr minimum @ $${effectiveRate.toFixed(2)}/hr (1.5× standard)`,
          estHours: AOG_MINIMUM_HOURS,
          laborRate: effectiveRate,
          sortOrder: 0,
        },
      ];
      if (aogMileage > 0) {
        autoLineItems.push({
          taskNumber: 'TASK-002',
          description: `Mileage — ${aogMileage} miles @ $${AOG_DEFAULT_MILEAGE_RATE.toFixed(2)}/mile`,
          estHours: 0,
          laborRate: 0,
          sortOrder: 1,
        });
      }
      if (aogDriveHours > 0) {
        autoLineItems.push({
          taskNumber: 'TASK-003',
          description: `Drive Time — ${aogDriveHours}h × ${aogTechCount} tech${aogTechCount > 1 ? 's' : ''} @ $${AOG_DEFAULT_DRIVE_RATE.toFixed(2)}/hr`,
          estHours: aogDriveHours * aogTechCount,
          laborRate: AOG_DEFAULT_DRIVE_RATE,
          sortOrder: 2,
        });
      }
    }

    // Merge auto line items with any explicitly passed ones
    const userLineItems = (lineItems as LIInput[]).map((li, idx) => ({
      taskNumber: `TASK-${String(autoLineItems.length + idx + 1).padStart(3, '0')}`,
      description: li.description,
      referenceDoc: li.referenceDoc,
      estHours: li.estHours ?? 0,
      laborRate: effectiveRate,
      sortOrder: autoLineItems.length + idx,
    }));

    // Compute per-line totals up front so estimatedTotal sums them all correctly
    const autoLineItemsWithTotal = autoLineItems.map(li => {
      let total: number;
      if (li.taskNumber === 'TASK-002') {
        // Mileage line: estHours=0, laborRate=0 — actual cost is miles * mileageRate
        total = aogMileage * AOG_DEFAULT_MILEAGE_RATE;
      } else {
        total = li.estHours * li.laborRate;
      }
      return { ...li, total };
    });

    const estimatedTotal = type === 'AOG'
      ? autoLineItemsWithTotal.reduce((s, li) => s + li.total, 0)
      : undefined;

    const wo = await prisma.workOrder.create({
      data: {
        orgId, number, type: type as WorkOrderType, customerId,
        aircraftId: resolvedAircraftId,
        laborRateId: laborRate.id,
        billingModel, nteAmount: nteAmount ?? null,
        notes: notes ?? null, internalNotes: internalNotes ?? null,
        estimatedClose: estimatedClose ? new Date(estimatedClose) : null,
        estimatedTotal: estimatedTotal ?? null,
        quoteId: quoteId ?? null,
        quotedAmount: quotedAmount ?? null,
        depositCollected: depositCollected ?? null,
        billingStage: billingStage ?? (type === 'AOG' ? 'Stage3_Authorized' : null),
        aogEventId: aogEventId ?? null,
        lineItems: { create: [...autoLineItems, ...userLineItems] },
      },
      include: {
        customer: true,
        aircraft: true,
        lineItems: true,
        aogEvent: true,
      },
    });

    return NextResponse.json({ data: wo }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
