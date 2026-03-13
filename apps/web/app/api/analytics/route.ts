import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { classifyAgingBucket } from '@mro/core';

export async function GET(_req: NextRequest) {
  const org = await prisma.organization.findFirst({ select: { id: true } });
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });
  const orgId = org.id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    revenueNow, revenuePrev, activeWos, aogWos, arInvoices,
    openWoValues, laborThisMonth, receivedPartsThisMonth, techsToday,
  ] = await Promise.all([
    prisma.invoice.aggregate({ _sum: { total: true }, where: { orgId, status: { in: ['SENT', 'VIEWED', 'PARTIAL', 'PAID'] }, issueDate: { gte: startOfMonth } } }),
    prisma.invoice.aggregate({ _sum: { total: true }, where: { orgId, status: { in: ['SENT', 'VIEWED', 'PARTIAL', 'PAID'] }, issueDate: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    prisma.workOrder.count({ where: { orgId, status: { in: ['IN_PROGRESS', 'AWAITING_PARTS', 'AWAITING_APPROVAL'] } } }),
    prisma.workOrder.count({ where: { orgId, type: 'AOG', status: { in: ['OPEN', 'IN_PROGRESS', 'AWAITING_PARTS'] } } }),
    prisma.invoice.findMany({ where: { orgId, status: { in: ['SENT', 'VIEWED', 'PARTIAL', 'OVERDUE'] } }, select: { balance: true, dueDate: true, issueDate: true } }),
    // WIP: sum of estimatedTotal on active WOs
    prisma.workOrder.aggregate({ _sum: { estimatedTotal: true }, where: { orgId, status: { in: ['OPEN', 'IN_PROGRESS', 'AWAITING_PARTS', 'AWAITING_APPROVAL'] } } }),
    // Labor utilization: billable labor entries this month
    prisma.laborEntry.findMany({
      where: { workOrder: { orgId }, createdAt: { gte: startOfMonth } },
      select: { hours: true, billable: true },
    }),
    // Parts margin: received parts this month
    prisma.partRequest.findMany({
      where: { workOrder: { orgId }, status: { in: ['RECEIVED', 'INSTALLED'] }, updatedAt: { gte: startOfMonth } },
      select: { unitCost: true, unitBillPrice: true, qty: true },
    }),
    // Techs on jobs today
    prisma.laborEntry.findMany({
      where: { workOrder: { orgId }, createdAt: { gte: startOfToday } },
      select: { technicianId: true },
      distinct: ['technicianId'],
    }),
  ]);

  const arTotal = arInvoices.reduce((s, i) => s + i.balance, 0);
  const agingBuckets = { CURRENT: 0, '1_30': 0, '31_60': 0, '61_90': 0, '90_PLUS': 0 };
  let agingDaysSum = 0;
  let agingCount = 0;
  for (const inv of arInvoices) {
    agingBuckets[classifyAgingBucket(inv.dueDate, now)] += inv.balance;
    const days = Math.floor((now.getTime() - new Date(inv.issueDate).getTime()) / 86400000);
    agingDaysSum += days;
    agingCount++;
  }

  const wipValue = Number(openWoValues._sum.estimatedTotal ?? 0);

  const totalHoursThisMonth = laborThisMonth.reduce((s, e) => s + e.hours, 0);
  const billableHoursThisMonth = laborThisMonth.filter(e => e.billable).reduce((s, e) => s + e.hours, 0);
  // Assume 160h/month available per tech (already used in tech efficiency report)
  const techCount = await prisma.technician.count({ where: { org: { id: orgId } } });
  const availableHours = techCount * 160;
  const laborUtilizationPct = availableHours > 0 ? (billableHoursThisMonth / availableHours) * 100 : null;

  let partsMarginPct: number | null = null;
  if (receivedPartsThisMonth.length > 0) {
    let costTotal = 0, revenueTotal = 0;
    for (const p of receivedPartsThisMonth) {
      const cost = (p.unitCost ?? 0) * p.qty;
      const bill = (p.unitBillPrice ?? p.unitCost ?? 0) * p.qty;
      costTotal += cost;
      revenueTotal += bill;
    }
    partsMarginPct = revenueTotal > 0 ? ((revenueTotal - costTotal) / revenueTotal) * 100 : null;
  }

  const avgInvoiceAgeDays = agingCount > 0 ? Math.round(agingDaysSum / agingCount) : null;
  const techsOnJobsCount = techsToday.length;

  // 12-month revenue sparkline
  const monthlyRevenue: { month: string; revenue: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const r = await prisma.invoice.aggregate({
      _sum: { total: true },
      where: { orgId, status: { in: ['SENT', 'VIEWED', 'PARTIAL', 'PAID'] }, issueDate: { gte: start, lte: end } },
    });
    monthlyRevenue.push({ month: start.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), revenue: Number(r._sum.total ?? 0) });
  }

  const rev = Number(revenueNow._sum.total ?? 0);
  const revPrev = Number(revenuePrev._sum.total ?? 0);

  return NextResponse.json({ data: {
    revenueThisMonth: rev,
    revenueLastMonth: revPrev,
    revenueDelta: revPrev > 0 ? ((rev - revPrev) / revPrev) * 100 : 0,
    arTotal,
    agingBuckets,
    activeWoCount: activeWos,
    aogCount: aogWos,
    monthlyRevenue,
    wipValue,
    laborUtilizationPct,
    partsMarginPct,
    avgInvoiceAgeDays,
    techsOnJobsCount,
  }});
}
