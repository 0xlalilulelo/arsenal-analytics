import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const customerId = searchParams.get('customerId');

  const org = await prisma.organization.findFirst({ select: { id: true } });
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  const aircraft = await prisma.aircraft.findMany({
    where: {
      customer: { orgId: org.id },
      ...(customerId ? { customerId } : {}),
      ...(search ? { OR: [
        { nNumber: { contains: search, mode: 'insensitive' } },
        { make: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { serial: { contains: search, mode: 'insensitive' } },
      ]} : {}),
    },
    include: {
      customer: { select: { id: true, name: true, accountNumber: true } },
      _count: { select: { workOrders: true } },
    },
    orderBy: { nNumber: 'asc' },
  });

  return NextResponse.json({ data: aircraft });
}
