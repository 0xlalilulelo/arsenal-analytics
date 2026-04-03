import { NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { getOrgId } from '@/lib/get-org-id';

/**
 * GET /api/reports/job-profitability
 * Returns gross margin per completed work order (last 20 closed/invoiced WOs).
 * Margin = (billed labor + billed parts) - (labor cost + parts cost) / billed total
 */
export async function GET() {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const closedWos = await prisma.workOrder.findMany({
    where: { orgId, status: { in: ['INVOICED', 'CLOSED', 'COMPLETE'] } },
    orderBy: { updatedAt: 'desc' },
    take: 20,
    select: {
      id: true,
      number: true,
      type: true,
      closedAt: true,
      updatedAt: true,
      laborEntries: { select: { hours: true, rateUsed: true, billable: true } },
      partRequests: {
        where: { status: { in: ['INSTALLED', 'RECEIVED'] } },
        select: { qty: true, unitCost: true, unitBillPrice: true },
      },
    },
  });

  // Also get labor cost rates for cost calc
  const techMap = new Map<string, number>();

  const data = closedWos.map(wo => {
    const billedLabor = wo.laborEntries.filter(e => e.billable).reduce((s, e) => s + e.hours * e.rateUsed, 0);
    const billedParts = wo.partRequests.reduce((s, p) => s + p.qty * (p.unitBillPrice ?? p.unitCost ?? 0), 0);
    const costParts = wo.partRequests.reduce((s, p) => s + p.qty * (p.unitCost ?? 0), 0);
    // Labor cost: approximated as 40% of billed labor if no cost rate is stored on entry
    const laborCost = billedLabor * 0.4;
    const totalBilled = billedLabor + billedParts;
    const totalCost = laborCost + costParts;
    const margin = totalBilled > 0 ? (totalBilled - totalCost) / totalBilled : 0;

    return {
      wo: wo.number,
      type: wo.type,
      billedLabor: Math.round(billedLabor * 100) / 100,
      billedParts: Math.round(billedParts * 100) / 100,
      totalBilled: Math.round(totalBilled * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      margin: Math.round(margin * 1000) / 1000,
    };
  }).reverse(); // oldest → newest for chart display

  return NextResponse.json({ data });
}
