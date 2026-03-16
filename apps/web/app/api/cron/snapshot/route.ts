import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { classifyAgingBucket } from '@mro/core';

// POST /api/cron/snapshot
// Captures FPASnapshot and CashFlowSnapshot for the current month.
// Run once per month (or on-demand) to populate historical trend data.
export async function POST(_req: NextRequest) {
  try {
    const org = await prisma.organization.findFirst({ select: { id: true } });
    if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });
    const orgId = org.id;

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // --- FPA Snapshot ---
    const [invoicesThisMonth, laborThisMonth, partsThisMonth, techCount, woCount, aogCount] =
      await Promise.all([
        prisma.invoice.findMany({
          where: { orgId, status: { in: ['SENT', 'VIEWED', 'PARTIAL', 'PAID'] }, issueDate: { gte: startOfMonth, lte: endOfMonth } },
          select: { total: true },
        }),
        prisma.laborEntry.findMany({
          where: { workOrder: { orgId }, createdAt: { gte: startOfMonth, lte: endOfMonth } },
          select: { hours: true, billable: true, rateUsed: true },
        }),
        prisma.partRequest.findMany({
          where: { workOrder: { orgId }, status: { in: ['RECEIVED', 'INSTALLED'] }, createdAt: { gte: startOfMonth, lte: endOfMonth } },
          select: { unitCost: true, unitBillPrice: true, qty: true },
        }),
        prisma.technician.count({ where: { org: { id: orgId } } }),
        prisma.workOrder.count({ where: { orgId, createdAt: { gte: startOfMonth, lte: endOfMonth } } }),
        prisma.workOrder.count({ where: { orgId, type: 'AOG', createdAt: { gte: startOfMonth, lte: endOfMonth } } }),
      ]);

    const revenue = invoicesThisMonth.reduce((s, i) => s + i.total, 0);
    const totalHours = laborThisMonth.reduce((s, e) => s + e.hours, 0);
    const billableHours = laborThisMonth.filter(e => e.billable).reduce((s, e) => s + e.hours, 0);
    const laborBilled = laborThisMonth.filter(e => e.billable).reduce((s, e) => s + e.hours * e.rateUsed, 0);
    const laborCost = laborBilled * 0.42; // estimated labor cost ratio

    let partsBilled = 0, partsCost = 0;
    for (const p of partsThisMonth) {
      partsCost += (p.unitCost ?? 0) * p.qty;
      partsBilled += (p.unitBillPrice ?? p.unitCost ?? 0) * p.qty;
    }

    const grossProfit = revenue - laborCost - partsCost;
    const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const availableHours = techCount * 160;
    const utilizationPct = availableHours > 0 ? (billableHours / availableHours) * 100 : 0;

    const fpa = await prisma.fPASnapshot.upsert({
      where: { orgId_month: { orgId, month } },
      create: {
        orgId, month, revenue, laborBilled, laborCost,
        partsBilled, partsCost, grossProfit, grossMarginPct,
        billableHours, totalHours, utilizationPct,
        aogCount, woCount,
      },
      update: {
        revenue, laborBilled, laborCost,
        partsBilled, partsCost, grossProfit, grossMarginPct,
        billableHours, totalHours, utilizationPct,
        aogCount, woCount,
      },
    });

    // --- Cash Flow Snapshot ---
    const arInvoices = await prisma.invoice.findMany({
      where: { orgId, status: { in: ['SENT', 'VIEWED', 'PARTIAL', 'OVERDUE'] } },
      select: { balance: true, dueDate: true, issueDate: true },
    });

    const buckets = { CURRENT: 0, '1_30': 0, '31_60': 0, '61_90': 0, '90_PLUS': 0 };
    for (const inv of arInvoices) {
      buckets[classifyAgingBucket(inv.dueDate, now)] += inv.balance;
    }

    const wipValue = (await prisma.workOrder.aggregate({
      _sum: { estimatedTotal: true },
      where: { orgId, status: { in: ['OPEN', 'IN_PROGRESS', 'AWAITING_PARTS', 'AWAITING_APPROVAL'] } },
    }))._sum.estimatedTotal ?? 0;

    const cashFlow = await prisma.cashFlowSnapshot.create({
      data: {
        orgId,
        arCurrent: buckets.CURRENT,
        ar1to30: buckets['1_30'],
        ar31to60: buckets['31_60'],
        ar61to90: buckets['61_90'],
        ar90plus: buckets['90_PLUS'],
        arExpected30d: buckets.CURRENT + buckets['1_30'],
        arExpected60d: buckets.CURRENT + buckets['1_30'] + buckets['31_60'],
        arExpected90d: buckets.CURRENT + buckets['1_30'] + buckets['31_60'] + buckets['61_90'],
        wipValue: Number(wipValue),
      },
    });

    return NextResponse.json({ data: { fpa, cashFlow } });
  } catch (e) {
    console.error('[CRON_SNAPSHOT]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
