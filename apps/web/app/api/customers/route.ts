import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');

  const org = await prisma.organization.findFirst({ select: { id: true } });
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

export async function POST(request: NextRequest) {
  try {
    const org = await prisma.organization.findFirst({ select: { id: true } });
    if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

    const body = await request.json();
    const { name, email, phone, address, billingTerms, notes } = body;
    if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 422 });

    // Auto-generate account number: ACCT-NNNN
    const count = await prisma.customer.count({ where: { orgId: org.id } });
    const accountNumber = `ACCT-${String(count + 1).padStart(4, '0')}`;

    const customer = await prisma.customer.create({
      data: {
        orgId: org.id,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        billingTerms: billingTerms ?? 'NET_30',
        notes: notes?.trim() || null,
        accountNumber,
      },
      include: { _count: { select: { workOrders: true, aircraft: true } } },
    });

    return NextResponse.json({ data: customer }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
