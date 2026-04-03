import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import type { QuoteStatus, BillingModel, QuoteLineCategory } from '@prisma/client';

const VALID_LINE_CATEGORIES = new Set<string>(['LABOR', 'PARTS', 'MATERIALS', 'SUBCONTRACT', 'OTHER']);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true, accountNumber: true, billingTerms: true } },
      aircraft: { select: { id: true, nNumber: true, make: true, model: true, serial: true, ttsn: true, year: true } },
      laborRate: { select: { id: true, name: true, rate: true, multiplier: true } },
      lines: { orderBy: { sortOrder: 'asc' } },
      workOrders: { select: { id: true, number: true, status: true, createdAt: true } },
    },
  });
  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  return NextResponse.json({ data: quote });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      status,
      billingModel,
      nteAmount,
      depositPct,
      validDays,
      notes,
      internalNotes,
      approvedBy,
      declineReason,
      lines,
    } = body;

    const existing = await prisma.quote.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!existing) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });

    // Build status-specific timestamps
    const statusTimestamps: Record<string, Date | null> = {};
    if (status === 'SENT' && existing.status === 'DRAFT') {
      statusTimestamps.sentAt = new Date();
    }
    if (status === 'APPROVED') {
      statusTimestamps.approvedAt = new Date();
    }
    if (status === 'DECLINED') {
      statusTimestamps.declinedAt = new Date();
    }

    // Recompute totals if lines provided
    type LineInput = { id?: string; category: string; description: string; qty: number; unitPrice: number; sortOrder?: number };
    let subtotal: number | undefined;
    let depositAmount: number | undefined;

    if (lines) {
      subtotal = (lines as LineInput[]).reduce((s: number, l: LineInput) => s + l.qty * l.unitPrice, 0);
      const pct = depositPct ?? (await prisma.quote.findUnique({ where: { id }, select: { depositPct: true } }))?.depositPct ?? 0;
      depositAmount = subtotal * pct;
    }

    const updated = await prisma.quote.update({
      where: { id },
      data: {
        ...(status ? { status: status as QuoteStatus, ...statusTimestamps } : {}),
        ...(billingModel ? { billingModel: billingModel as BillingModel } : {}),
        ...(nteAmount !== undefined ? { nteAmount } : {}),
        ...(depositPct !== undefined ? { depositPct } : {}),
        ...(validDays !== undefined ? { validDays } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(internalNotes !== undefined ? { internalNotes } : {}),
        ...(approvedBy !== undefined ? { approvedBy } : {}),
        ...(declineReason !== undefined ? { declineReason } : {}),
        ...(subtotal !== undefined ? { subtotal, total: subtotal } : {}),
        ...(depositAmount !== undefined ? { depositAmount } : {}),
        ...(lines ? {
          lines: {
            deleteMany: {},
            create: (lines as LineInput[]).map((l, idx) => ({
              category: (VALID_LINE_CATEGORIES.has(l.category) ? l.category : 'OTHER') as QuoteLineCategory,
              description: l.description,
              qty: l.qty,
              unitPrice: l.unitPrice,
              total: l.qty * l.unitPrice,
              sortOrder: l.sortOrder ?? idx,
            })),
          },
        } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        aircraft: { select: { id: true, nNumber: true, make: true, model: true } },
        laborRate: { select: { id: true, name: true, rate: true } },
        lines: { orderBy: { sortOrder: 'asc' } },
        workOrders: { select: { id: true, number: true, status: true } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
