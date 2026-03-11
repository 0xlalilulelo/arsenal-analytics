import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { classifyAgingBucket } from '@mro/core';

// GET /api/analytics?orgId=xxx — dashboard KPI metrics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') ?? 'demo-org';

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Revenue this month
    const revenueThisMonth = await prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      where: {
        orgId,
        status: { in: ['SENT', 'PARTIALLY_PAID', 'PAID'] },
        invoiceDate: { gte: startOfMonth },
      },
    });

    // Revenue last month
    const revenueLastMonth = await prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      where: {
        orgId,
        status: { in: ['SENT', 'PARTIALLY_PAID', 'PAID'] },
        invoiceDate: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    });

    // WIP value (sum of actual cost for in-progress work orders)
    const wipValue = await prisma.workOrder.aggregate({
      _sum: { totalActualCost: true },
      where: {
        orgId,
        status: { in: ['IN_PROGRESS', 'QC_REVIEW', 'CUSTOMER_HOLD', 'PARTS_ON_ORDER'] },
      },
    });

    // AR balance (open invoices)
    const arInvoices = await prisma.invoice.findMany({
      where: {
        orgId,
        status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      select: { balanceDue: true, dueDate: true },
    });

    const arTotal = arInvoices.reduce((sum, inv) => sum + Number(inv.balanceDue), 0);

    // AR aging buckets
    const agingBuckets = { CURRENT: 0, '1_30': 0, '31_60': 0, '61_90': 0, '90_PLUS': 0 };
    for (const inv of arInvoices) {
      if (!inv.dueDate) {
        agingBuckets.CURRENT += Number(inv.balanceDue);
        continue;
      }
      const bucket = classifyAgingBucket(inv.dueDate, now);
      agingBuckets[bucket] += Number(inv.balanceDue);
    }

    // Active work orders count
    const activeWoCount = await prisma.workOrder.count({
      where: {
        orgId,
        status: { in: ['IN_PROGRESS', 'QC_REVIEW', 'CUSTOMER_HOLD', 'PARTS_ON_ORDER'] },
      },
    });

    const aogCount = await prisma.workOrder.count({
      where: {
        orgId,
        type: 'AOG',
        status: { in: ['APPROVED', 'SCHEDULED', 'IN_PROGRESS', 'CUSTOMER_HOLD'] },
      },
    });

    // Monthly revenue for last 12 months
    const monthlyRevenue: { month: string; revenue: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const result = await prisma.invoice.aggregate({
        _sum: { totalAmount: true },
        where: {
          orgId,
          status: { in: ['SENT', 'PARTIALLY_PAID', 'PAID'] },
          invoiceDate: { gte: start, lte: end },
        },
      });
      monthlyRevenue.push({
        month: start.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: Number(result._sum.totalAmount ?? 0),
      });
    }

    const revenueNow = Number(revenueThisMonth._sum.totalAmount ?? 0);
    const revenuePrev = Number(revenueLastMonth._sum.totalAmount ?? 0);
    const revenueDelta = revenuePrev > 0 ? ((revenueNow - revenuePrev) / revenuePrev) * 100 : 0;

    return NextResponse.json({
      data: {
        revenueThisMonth: revenueNow,
        revenueLastMonth: revenuePrev,
        revenueDelta,
        wipValue: Number(wipValue._sum.totalActualCost ?? 0),
        arTotal,
        agingBuckets,
        activeWoCount,
        aogCount,
        monthlyRevenue,
      },
    });
  } catch (error) {
    console.error('GET /api/analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
