import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { portalToken: token },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      workOrder: { select: { number: true, aircraft: { select: { nNumber: true, make: true, model: true } } } },
      lineItems: { orderBy: { sortOrder: 'asc' } },
      payments: { orderBy: { paidAt: 'desc' }, select: { id: true, amount: true, method: true, paidAt: true, reference: true } },
      org: { select: { name: true } },
    },
  });

  if (!invoice) return NextResponse.json({ error: 'Invoice not found or link expired' }, { status: 404 });

  // Don't expose internal fields
  const { portalToken: _tok, stripePaymentIntentId: _stripe, stripeCheckoutUrl: _checkout, orgId: _oid, ...safe } = invoice as any;

  return NextResponse.json({ data: safe });
}
