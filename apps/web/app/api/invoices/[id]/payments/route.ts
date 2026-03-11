import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { PaymentMethod } from '@prisma/client';

type Params = { params: { id: string } };

// POST /api/invoices/[id]/payments — record a payment
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();
    const { amount, method, reference, note, paidAt, recordedBy = 'system' } = body;

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      select: { totalAmount: true, paidAmount: true, balanceDue: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const paymentAmount = Number(amount);
    const newPaidAmount = Number(invoice.paidAmount) + paymentAmount;
    const newBalanceDue = Number(invoice.totalAmount) - newPaidAmount;
    const isPaid = newBalanceDue <= 0;

    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          invoiceId: params.id,
          amount: paymentAmount,
          method: method as PaymentMethod,
          reference,
          note,
          paidAt: paidAt ? new Date(paidAt) : new Date(),
          recordedBy,
        },
      }),
      prisma.invoice.update({
        where: { id: params.id },
        data: {
          paidAmount: newPaidAmount,
          balanceDue: Math.max(0, newBalanceDue),
          status: isPaid ? 'PAID' : 'PARTIALLY_PAID',
          paidAt: isPaid ? new Date() : undefined,
        },
      }),
    ]);

    return NextResponse.json({ data: payment }, { status: 201 });
  } catch (error) {
    console.error('POST /api/invoices/[id]/payments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
