import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      workOrder: { select: { id: true, number: true, aircraft: { select: { nNumber: true, make: true, model: true } } } },
      lineItems: { orderBy: { sortOrder: 'asc' } },
      payments: { orderBy: { paidAt: 'desc' } },
    },
  });

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  return NextResponse.json({ data: invoice });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();
    const { status, notes } = body;

    const invoice = await prisma.invoice.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      include: {
        customer: true,
        workOrder: { select: { id: true, number: true } },
        lineItems: { orderBy: { sortOrder: 'asc' } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
