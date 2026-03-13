import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import type { QuoteStatus, BillingModel } from '@prisma/client';

async function resolveOrgId() {
  const org = await prisma.organization.findFirst({ select: { id: true } });
  return org?.id ?? null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as QuoteStatus | null;
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);

  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  const where = {
    orgId,
    ...(status ? { status } : {}),
    ...(search ? {
      OR: [
        { quoteNumber: { contains: search, mode: 'insensitive' as const } },
        { customer: { name: { contains: search, mode: 'insensitive' as const } } },
        { aircraft: { nNumber: { contains: search, mode: 'insensitive' as const } } },
        { notes: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {}),
  };

  const [quotes, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, accountNumber: true } },
        aircraft: { select: { id: true, nNumber: true, make: true, model: true } },
        laborRate: { select: { id: true, name: true, rate: true } },
        _count: { select: { lines: true, workOrders: true } },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.quote.count({ where }),
  ]);

  return NextResponse.json({ data: quotes, total, page, limit });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerId,
      aircraftId,
      billingModel = 'TIME_AND_MATERIALS',
      nteAmount,
      laborRateId,
      depositPct = 0,
      validDays = 30,
      notes,
      internalNotes,
      lines = [],
    } = body;

    if (!customerId) return NextResponse.json({ error: 'customerId required' }, { status: 422 });

    const orgId = await resolveOrgId();
    if (!orgId) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

    // Resolve labor rate — use provided or fall back to default
    let resolvedLaborRateId = laborRateId;
    if (!resolvedLaborRateId) {
      const defaultRate = await prisma.laborRate.findFirst({ where: { orgId, isDefault: true }, select: { id: true } });
      resolvedLaborRateId = defaultRate?.id;
    }

    const count = await prisma.quote.count({ where: { orgId } });
    const quoteNumber = `QT-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Compute totals from lines
    type LineInput = { category: string; description: string; qty: number; unitPrice: number; sortOrder?: number };
    const lineData = (lines as LineInput[]).map((l, idx) => ({
      category: l.category as any,
      description: l.description,
      qty: l.qty,
      unitPrice: l.unitPrice,
      total: l.qty * l.unitPrice,
      sortOrder: l.sortOrder ?? idx,
    }));
    const subtotal = lineData.reduce((s, l) => s + l.total, 0);
    const depositAmount = subtotal * depositPct;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validDays);

    const quote = await prisma.quote.create({
      data: {
        orgId,
        quoteNumber,
        customerId,
        aircraftId: aircraftId || null,
        billingModel: billingModel as BillingModel,
        nteAmount: nteAmount || null,
        laborRateId: resolvedLaborRateId || null,
        subtotal,
        total: subtotal,
        depositPct,
        depositAmount,
        validDays,
        expiresAt,
        notes: notes || null,
        internalNotes: internalNotes || null,
        lines: { create: lineData },
      },
      include: {
        customer: { select: { id: true, name: true } },
        aircraft: { select: { id: true, nNumber: true, make: true, model: true } },
        lines: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return NextResponse.json({ data: quote }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
