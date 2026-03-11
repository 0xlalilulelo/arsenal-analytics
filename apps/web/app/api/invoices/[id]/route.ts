import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      workOrder: { select: { number: true, aircraft: { select: { nNumber: true, make: true, model: true } } } },
      lineItems: { orderBy: { sortOrder: 'asc' } },
      payments: { orderBy: { paidAt: 'desc' } },
    },
  });

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  return NextResponse.json({ data: invoice });
}
