import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { startOfMonth, subMonths, startOfYear } from 'date-fns';
import { getOrgId } from '@/lib/get-org-id';

/** Map date range label → start date */
function resolveStartDate(range: string): Date {
  const now = new Date();
  switch (range) {
    case 'last-month':   return startOfMonth(subMonths(now, 1));
    case 'last-3-months': return startOfMonth(subMonths(now, 3));
    case 'ytd':          return startOfYear(now);
    case 'last-12-months': return startOfMonth(subMonths(now, 12));
    case 'this-month':
    default:             return startOfMonth(now);
  }
}

function resolveEndDate(range: string): Date | null {
  const now = new Date();
  if (range === 'last-month') {
    // end = last day of last month = start of this month
    return startOfMonth(now);
  }
  return null; // open-ended (up to now)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') ?? 'this-month';

  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const startDate = resolveStartDate(range);
  const endDate = resolveEndDate(range);

  const technicians = await prisma.technician.findMany({
    where: { orgId },
    select: {
      id: true, name: true, certifications: true,
      laborEntries: {
        where: {
          billable: true,
          date: {
            gte: startDate,
            ...(endDate ? { lt: endDate } : {}),
          },
        },
        select: { hours: true, rateUsed: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Estimate available hours based on range
  const rangeMonths: Record<string, number> = {
    'this-month': 1, 'last-month': 1,
    'last-3-months': 3, 'ytd': new Date().getMonth() + 1,
    'last-12-months': 12,
  };
  const months = rangeMonths[range] ?? 1;
  const availableHoursPerMonth = 160;
  const availableHours = months * availableHoursPerMonth;

  const stats = technicians.map(tech => {
    const billedHours = tech.laborEntries.reduce((s, e) => s + e.hours, 0);
    const revenueGenerated = tech.laborEntries.reduce((s, e) => s + e.hours * e.rateUsed, 0);
    const revenuePerHour = billedHours > 0 ? revenueGenerated / billedHours : 0;
    return {
      id: tech.id,
      name: tech.name,
      certifications: tech.certifications,
      billedHours,
      availableHours,
      revenueGenerated,
      revenuePerHour,
    };
  });

  const totals = {
    billedHours: stats.reduce((s, t) => s + t.billedHours, 0),
    availableHours: stats.reduce((s, t) => s + t.availableHours, 0),
    revenueGenerated: stats.reduce((s, t) => s + t.revenueGenerated, 0),
  };

  return NextResponse.json({ data: stats, totals, range, startDate, endDate });
}
