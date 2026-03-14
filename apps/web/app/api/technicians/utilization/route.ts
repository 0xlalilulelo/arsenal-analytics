import { NextResponse } from 'next/server';
import { prisma } from '@mro/db';

/**
 * GET /api/technicians/utilization
 * Returns current-month labor stats per technician.
 * Available hours assumption: 8h/day × workdays in month.
 */
export async function GET() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Count weekdays in current month for available hours calc
  let weekdays = 0;
  for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) weekdays++;
  }
  const availableHours = weekdays * 8;

  const technicians = await prisma.technician.findMany({
    select: {
      id: true, name: true, certifications: true, billRate: true, costRate: true,
      laborEntries: {
        where: { date: { gte: startOfMonth, lte: endOfMonth } },
        select: { hours: true, billable: true, rateUsed: true },
      },
    },
  });

  const data = technicians.map(tech => {
    const totalHours = tech.laborEntries.reduce((s, e) => s + e.hours, 0);
    const billableHours = tech.laborEntries.filter(e => e.billable).reduce((s, e) => s + e.hours, 0);
    const billedRevenue = tech.laborEntries.filter(e => e.billable).reduce((s, e) => s + e.hours * e.rateUsed, 0);
    const utilizationPct = availableHours > 0 ? (billableHours / availableHours) * 100 : 0;
    const laborCost = totalHours * (tech.costRate ?? 0);
    const margin = billedRevenue > 0 ? ((billedRevenue - laborCost) / billedRevenue) * 100 : null;

    return {
      id: tech.id,
      name: tech.name,
      certifications: tech.certifications,
      billRate: tech.billRate,
      costRate: tech.costRate,
      totalHours: Math.round(totalHours * 10) / 10,
      billableHours: Math.round(billableHours * 10) / 10,
      billedRevenue: Math.round(billedRevenue * 100) / 100,
      utilizationPct: Math.round(utilizationPct * 10) / 10,
      margin: margin != null ? Math.round(margin * 10) / 10 : null,
      availableHours,
    };
  });

  // Sort by billable hours desc
  data.sort((a, b) => b.billableHours - a.billableHours);

  return NextResponse.json({ data, month: startOfMonth.toISOString().slice(0, 7) });
}
