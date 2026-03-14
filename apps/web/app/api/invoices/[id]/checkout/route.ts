import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { APP_URL } from '@/lib/email';

/**
 * POST /api/invoices/[id]/checkout
 * Creates a Stripe Checkout session for invoice payment.
 * Requires STRIPE_SECRET_KEY env var.
 * Returns { checkoutUrl } — redirect customer there.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe is not configured (STRIPE_SECRET_KEY missing)' }, { status: 503 });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: { select: { name: true, email: true } } },
  });
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  if (invoice.balance <= 0) return NextResponse.json({ error: 'Invoice is already paid' }, { status: 422 });

  // Reuse existing session if still valid
  if (invoice.stripeCheckoutUrl && invoice.stripeCheckoutExpiry && invoice.stripeCheckoutExpiry > new Date()) {
    return NextResponse.json({ checkoutUrl: invoice.stripeCheckoutUrl });
  }

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' as any });

  const portalReturnUrl = invoice.portalToken
    ? `${APP_URL}/portal/invoices/${invoice.portalToken}`
    : `${APP_URL}/invoices/${id}`;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: invoice.customer.email ?? undefined,
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(invoice.balance * 100), // cents
        product_data: {
          name: `Invoice ${invoice.invoiceNumber}`,
          description: `Payment for ${invoice.customer.name}`,
        },
      },
      quantity: 1,
    }],
    metadata: { invoiceId: id, invoiceNumber: invoice.invoiceNumber },
    success_url: `${portalReturnUrl}?payment=success`,
    cancel_url: `${portalReturnUrl}?payment=cancelled`,
  });

  // Cache session URL for 23 hours
  const expiry = new Date(Date.now() + 23 * 60 * 60 * 1000);
  await prisma.invoice.update({
    where: { id },
    data: {
      stripePaymentIntentId: session.payment_intent as string ?? null,
      stripeCheckoutUrl: session.url,
      stripeCheckoutExpiry: expiry,
    },
  });

  return NextResponse.json({ checkoutUrl: session.url });
}
