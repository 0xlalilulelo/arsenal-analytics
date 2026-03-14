import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: invoiceId } = await params;
    const body = await request.json();
    const { amount, method, reference, memo } = body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount required' }, { status: 422 });
    }
    if (!method) {
      return NextResponse.json({ error: 'Payment method required' }, { status: 422 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const alreadyPaid = invoice.payments.reduce((s, p) => s + p.amount, 0);
    const remaining = invoice.total - alreadyPaid;
    if (amount > remaining + 0.01) {
      return NextResponse.json({ error: `Amount exceeds balance due (${remaining.toFixed(2)})` }, { status: 422 });
    }

    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        amount,
        method,
        reference: reference || null,
        memo: memo || null,
      },
    });

    // Auto-mark invoice as PAID if fully paid
    const newTotal = alreadyPaid + amount;
    if (newTotal >= invoice.total - 0.01) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'PAID', paidAt: new Date() },
      });
    }

    return NextResponse.json({ data: payment }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
