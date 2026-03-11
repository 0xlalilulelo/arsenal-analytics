import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import type { PaymentMethod } from '@prisma/client';

type Params = { params: { id: string } };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();
    const { amount, method, reference, memo, paidAt } = body;

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      select: { total: true, amountPaid: true },
    });
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const newPaid = invoice.amountPaid + amount;
    const newBalance = Math.max(0, invoice.total - newPaid);
    const isPaid = newBalance <= 0;

    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: { invoiceId: params.id, amount, method: method as PaymentMethod, reference, memo, paidAt: paidAt ? new Date(paidAt) : new Date() },
      }),
      prisma.invoice.update({
        where: { id: params.id },
        data: { amountPaid: newPaid, balance: newBalance, status: isPaid ? 'PAID' : 'PARTIAL', paidAt: isPaid ? new Date() : undefined },
      }),
    ]);

    return NextResponse.json({ data: payment }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
