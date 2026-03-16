import { NextResponse } from 'next/server';
import { prisma } from '@mro/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;

  const wo = await prisma.workOrder.findUnique({ where: { id }, select: { orgId: true } });
  if (!wo) return NextResponse.json({ error: 'Work order not found' }, { status: 404 });

  const logs = await prisma.auditLog.findMany({
    where: { entityType: 'WorkOrder', entityId: id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({ data: logs });
}
