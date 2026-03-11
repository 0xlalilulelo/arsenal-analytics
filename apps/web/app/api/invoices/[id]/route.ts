import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

type Params = { params: { id: string } };

// GET /api/invoices/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        workOrder: { select: { woNumber: true, title: true, aircraft: true } },
        lineItems: { orderBy: { sortOrder: 'asc' } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ data: invoice });
  } catch (error) {
    console.error('GET /api/invoices/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
