import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');

  const org = await prisma.organization.findFirst({ where: { slug: 'arsenal-aviation' }, select: { id: true } });
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  const customers = await prisma.customer.findMany({
    where: { orgId: org.id, ...(search ? { OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { accountNumber: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]} : {}) },
    include: { _count: { select: { workOrders: true, aircraft: true } } },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ data: customers });
}
