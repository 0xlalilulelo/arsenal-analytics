import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  type WORow = {
    id: string; number: string; status: string; type: string;
    notes: string | null; estimatedTotal: number | null; createdAt: Date; closedAt: Date | null;
    complianceItems: { id: string; type: string; referenceId: string; description: string; completedAt: Date | null }[];
    invoices: { total: number; amountPaid: number; status: string }[];
    laborEntries: { hours: number; rateUsed: number; billable: boolean }[];
  };

  const [aircraft, wos] = await Promise.all([
    prisma.aircraft.findUnique({
      where: { id },
      select: {
        id: true, nNumber: true, make: true, model: true, serial: true,
        year: true, ttsn: true, engineTtsn: true, propTtsn: true,
        customer: { select: { id: true, name: true, accountNumber: true } },
      },
    }),
    prisma.$queryRaw<WORow[]>`
      SELECT
        wo.id, wo.number, wo.status, wo.type, wo.notes,
        wo."estimatedTotal", wo."createdAt", wo."closedAt"
      FROM "WorkOrder" wo
      WHERE wo."aircraftId" = ${id}
      ORDER BY wo."createdAt" DESC
      LIMIT 30
    `.then(async (rows) => {
      // Enrich with sub-relations
      const woIds = rows.map(r => r.id);
      if (woIds.length === 0) return [];

      const [compliance, invoices, labor] = await Promise.all([
        prisma.complianceItem.findMany({
          where: { workOrderId: { in: woIds } },
          select: { id: true, workOrderId: true, type: true, referenceId: true, description: true, completedAt: true },
        }),
        prisma.invoice.findMany({
          where: { workOrderId: { in: woIds } },
          select: { workOrderId: true, total: true, amountPaid: true, status: true },
        }),
        prisma.laborEntry.findMany({
          where: { workOrderId: { in: woIds } },
          select: { workOrderId: true, hours: true, rateUsed: true, billable: true },
        }),
      ]);

      return rows.map(wo => ({
        ...wo,
        complianceItems: compliance.filter(c => c.workOrderId === wo.id),
        invoices: invoices.filter(inv => inv.workOrderId === wo.id),
        laborEntries: labor.filter(le => le.workOrderId === wo.id),
      }));
    }),
  ]);

  if (!aircraft) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Compute lifetime maintenance stats
  const lifetimeBilled = wos.reduce((sum: number, wo) => sum + wo.invoices.reduce((s: number, inv) => s + inv.total, 0), 0);
  const lifetimePaid = wos.reduce((sum: number, wo) => sum + wo.invoices.reduce((s: number, inv) => s + inv.amountPaid, 0), 0);
  const lifetimeLaborHours = wos.reduce(
    (sum: number, wo) => sum + wo.laborEntries.filter(e => e.billable).reduce((s: number, e) => s + e.hours, 0), 0,
  );

  // Strip raw sub-records from WO payload
  const workOrders = wos.map(({ invoices: _inv, laborEntries: _le, ...wo }) => ({
    ...wo,
    description: wo.notes ?? '',
  }));

  return NextResponse.json({
    data: {
      ...aircraft,
      workOrders,
      stats: {
        lifetimeBilled: Math.round(lifetimeBilled * 100) / 100,
        lifetimePaid: Math.round(lifetimePaid * 100) / 100,
        lifetimeLaborHours: Math.round(lifetimeLaborHours * 10) / 10,
        woCount: wos.length,
      },
    },
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { ttsn, engineTtsn, propTtsn, make, model, year, serial } = body;

  const aircraft = await prisma.aircraft.update({
    where: { id },
    data: {
      ...(make ? { make } : {}),
      ...(model ? { model } : {}),
      ...(serial ? { serial } : {}),
      ...(year !== undefined ? { year } : {}),
      ...(ttsn !== undefined ? { ttsn } : {}),
      ...(engineTtsn !== undefined ? { engineTtsn } : {}),
      ...(propTtsn !== undefined ? { propTtsn } : {}),
    },
    include: { customer: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ data: aircraft });
}
