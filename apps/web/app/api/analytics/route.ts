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

  const [revenueNow, revenuePrev, activeWos, aogWos, arInvoices] = await Promise.all([
    prisma.invoice.aggregate({ _sum: { total: true }, where: { orgId, status: { in: ['SENT', 'VIEWED', 'PARTIAL', 'PAID'] }, issueDate: { gte: startOfMonth } } }),
    prisma.invoice.aggregate({ _sum: { total: true }, where: { orgId, status: { in: ['SENT', 'VIEWED', 'PARTIAL', 'PAID'] }, issueDate: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    prisma.workOrder.count({ where: { orgId, status: { in: ['IN_PROGRESS', 'AWAITING_PARTS', 'AWAITING_APPROVAL'] } } }),
    prisma.workOrder.count({ where: { orgId, type: 'AOG', status: { in: ['OPEN', 'IN_PROGRESS', 'AWAITING_PARTS'] } } }),
    prisma.invoice.findMany({ where: { orgId, status: { in: ['SENT', 'VIEWED', 'PARTIAL', 'OVERDUE'] } }, select: { balance: true, dueDate: true } }),
  ]);

  const arTotal = arInvoices.reduce((s, i) => s + i.balance, 0);
  const agingBuckets = { CURRENT: 0, '1_30': 0, '31_60': 0, '61_90': 0, '90_PLUS': 0 };
  for (const inv of arInvoices) {
    agingBuckets[classifyAgingBucket(inv.dueDate, now)] += inv.balance;
  }

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
  }});
}
