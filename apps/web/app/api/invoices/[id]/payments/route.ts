import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { sendPaymentConfirmationEmail, APP_URL } from '@/lib/email';
import { getSessionUser } from '@/lib/get-org-id';
import { hasRole } from '@/lib/rbac';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user || !hasRole(user.role, 'ACCOUNTANT')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: invoiceId } = await params;
    const body = await request.json();
    const { amount, method, reference, memo } = body;

    if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 1000000) {
      return NextResponse.json({ error: 'Valid amount required (must be > 0 and <= 1000000)' }, { status: 422 });
    }
    if (!method) {
      return NextResponse.json({ error: 'Payment method required' }, { status: 422 });
    }

    // Capture customer info for email before transaction (read outside is fine; email sent after)
    const invoiceForEmail = await prisma.invoice.findUnique({
      where: { id: invoiceId, orgId: user.orgId },
      select: { customer: { select: { name: true, email: true } }, invoiceNumber: true, total: true, portalToken: true },
    });
    if (!invoiceForEmail) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    let payment: Awaited<ReturnType<typeof prisma.payment.create>>;
    let remaining: number;

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { payments: true },
      });
      if (!invoice) throw new Error('INVOICE_NOT_FOUND');

      const alreadyPaid = invoice.payments.reduce((s, p) => s + p.amount, 0);
      const rem = invoice.total - alreadyPaid;
      if (amount > rem + 0.01) {
        throw Object.assign(new Error('OVERPAYMENT'), { remaining: rem });
      }

      const pmt = await tx.payment.create({
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
        await tx.invoice.update({
          where: { id: invoiceId },
          data: { status: 'PAID', paidAt: new Date() },
        });
      }

      return { pmt, rem };
    });

    payment = result.pmt;
    remaining = result.rem;

    // Send payment confirmation email (non-blocking, outside transaction)
    if (invoiceForEmail.customer.email && invoiceForEmail.portalToken) {
      const newBalance = Math.max(0, remaining - amount);
      sendPaymentConfirmationEmail({
        to: invoiceForEmail.customer.email,
        customerName: invoiceForEmail.customer.name,
        invoiceNumber: invoiceForEmail.invoiceNumber,
        amountPaid: amount,
        balance: newBalance,
        method,
        portalUrl: `${APP_URL}/portal/invoices/${invoiceForEmail.portalToken}`,
      }).catch(console.error);
    }

    return NextResponse.json({ data: payment }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'INVOICE_NOT_FOUND') {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      if (e.message === 'OVERPAYMENT') {
        const rem = (e as Error & { remaining?: number }).remaining;
        return NextResponse.json({ error: `Amount exceeds balance due (${rem !== undefined ? rem.toFixed(2) : '?'})` }, { status: 422 });
      }
    }
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
