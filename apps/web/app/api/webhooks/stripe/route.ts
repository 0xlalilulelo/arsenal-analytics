import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

/**
 * POST /api/webhooks/stripe
 * Handles Stripe checkout.session.completed events.
 * Set STRIPE_WEBHOOK_SECRET in .env and point Stripe webhook to this URL.
 */
export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' as any });

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e: any) {
    console.error('[STRIPE WEBHOOK] Signature verification failed:', e.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const invoiceId = session.metadata?.invoiceId;
    if (!invoiceId) return NextResponse.json({ received: true });

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return NextResponse.json({ received: true });

    const existingPayment = await prisma.payment.findFirst({
      where: { reference: session.id },
    });
    if (existingPayment) {
      console.log(`[STRIPE WEBHOOK] Duplicate event for session ${session.id}, skipping`);
      return NextResponse.json({ received: true });
    }

    const amountPaid = session.amount_total / 100; // cents → dollars
    const newAmountPaid = invoice.amountPaid + amountPaid;
    const newBalance = Math.max(0, invoice.total - newAmountPaid);
    const newStatus = newBalance === 0 ? 'PAID' : 'PARTIAL';

    await prisma.$transaction([
      prisma.payment.create({
        data: {
          invoiceId,
          amount: amountPaid,
          method: 'STRIPE',
          reference: session.id,
          memo: `Stripe online payment — ${session.payment_intent ?? ''}`,
        },
      }),
      prisma.invoice.update({
        where: { id: invoiceId },
        data: { amountPaid: newAmountPaid, balance: newBalance, status: newStatus },
      }),
    ]);

    console.log(`[STRIPE WEBHOOK] Invoice ${invoice.invoiceNumber} payment: $${amountPaid} — status: ${newStatus}`);
  }

  return NextResponse.json({ received: true });
}
