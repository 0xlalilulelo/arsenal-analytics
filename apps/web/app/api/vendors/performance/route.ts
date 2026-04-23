import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { getOrgId } from '@/lib/get-org-id';

export interface VendorMetric {
  vendor: string;
  totalOrders: number;
  openOrders: number;
  totalSpend: number;
  avgLeadTimeDays: number | null;
  onTimePercent: number | null;
  fillRate: number | null; // % of ordered qty received
}

export async function GET(_req: NextRequest) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const pos = await prisma.purchaseOrder.findMany({
      where: { orgId },
      include: {
        lineItems: { select: { qty: true, unitCost: true, receivedQty: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by vendor
    const byVendor = new Map<string, typeof pos>();
    for (const po of pos) {
      const list = byVendor.get(po.vendor) ?? [];
      list.push(po);
      byVendor.set(po.vendor, list);
    }

    const metrics: VendorMetric[] = [];
    for (const [vendor, vendorPos] of byVendor.entries()) {
      const totalOrders = vendorPos.length;
      const openOrders = vendorPos.filter(p => !['RECEIVED', 'CANCELLED'].includes(p.status)).length;

      let totalSpend = 0;
      let totalQty = 0;
      let totalReceivedQty = 0;
      for (const po of vendorPos) {
        for (const li of po.lineItems) {
          totalSpend += li.qty * li.unitCost;
          totalQty += li.qty;
          totalReceivedQty += li.receivedQty;
        }
        totalSpend += po.shippingCost;
      }

      // Lead time: createdAt → receivedAt (only fully-received POs)
      const received = vendorPos.filter(p => p.receivedAt);
      let avgLeadTimeDays: number | null = null;
      if (received.length > 0) {
        const totalDays = received.reduce((sum, p) => {
          const days = (p.receivedAt!.getTime() - p.createdAt.getTime()) / 86400000;
          return sum + days;
        }, 0);
        avgLeadTimeDays = Math.round((totalDays / received.length) * 10) / 10;
      }

      // On-time: received by expectedDate
      const withExpected = received.filter(p => p.expectedDate);
      let onTimePercent: number | null = null;
      if (withExpected.length > 0) {
        const onTime = withExpected.filter(p => p.receivedAt! <= p.expectedDate!).length;
        onTimePercent = Math.round((onTime / withExpected.length) * 100);
      }

      const fillRate = totalQty > 0 ? Math.round((totalReceivedQty / totalQty) * 1000) / 10 : null;

      metrics.push({ vendor, totalOrders, openOrders, totalSpend, avgLeadTimeDays, onTimePercent, fillRate });
    }

    // Sort by total spend desc
    metrics.sort((a, b) => b.totalSpend - a.totalSpend);

    return NextResponse.json({ data: metrics });
  } catch (e) {
    console.error('[VENDOR_PERFORMANCE_GET]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
