import { NextRequest, NextResponse } from 'next/server';
import { getOrgId } from '@/lib/get-org-id';
import { prisma } from '@mro/db';

/** GET /api/work-orders/calendar?year=2025&month=3 */
export async function GET(req: NextRequest) {
  const resolvedOrgId = await getOrgId();
  if (!resolvedOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year = parseInt(searchParams.get('year') ?? String(now.getFullYear()), 10);
  const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1), 10); // 1-indexed

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  // Fetch WOs that overlap the requested month:
  // opened before month end AND (no close date OR estimated close >= month start)
  const wos = await prisma.workOrder.findMany({
    where: {
      orgId: resolvedOrgId,
      dateOpened: { lte: monthEnd },
      OR: [
        { estimatedClose: null },
        { estimatedClose: { gte: monthStart } },
        { closedAt: { gte: monthStart } },
      ],
    },
    select: {
      id: true,
      number: true,
      type: true,
      status: true,
      dateOpened: true,
      estimatedClose: true,
      closedAt: true,
      customer: { select: { name: true } },
      aircraft: { select: { nNumber: true } },
    },
    orderBy: { dateOpened: 'asc' },
  });

  return NextResponse.json({ data: wos, year, month });
}
