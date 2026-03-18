import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { randomUUID } from 'crypto';
import { sendInvoiceEmail, APP_URL } from '@/lib/email';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
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
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { customer: { select: { name: true, email: true } } },
    });
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    // When transitioning to SENT: generate portalToken and email customer
    let portalToken = invoice.portalToken;
    let emailSent = false;
    let portalUrl: string | null = null;

    if (status === 'SENT' && invoice.status !== 'SENT') {
      portalToken = portalToken ?? randomUUID();
      portalUrl = `${APP_URL}/portal/invoices/${portalToken}`;

      if (invoice.customer.email) {
        const result = await sendInvoiceEmail({
          to: invoice.customer.email,
          customerName: invoice.customer.name,
          invoiceNumber: invoice.invoiceNumber,
          total: invoice.total,
          balance: invoice.balance,
          dueDate: invoice.dueDate?.toISOString() ?? null,
          portalUrl,
        });
        emailSent = result.sent;
      }

      console.log(`[INVOICE SEND] Invoice ${invoice.invoiceNumber} — portal URL: ${portalUrl}`);
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(portalToken ? { portalToken } : {}),
      },
      include: {
        customer: true,
        workOrder: { select: { id: true, number: true } },
        lineItems: { orderBy: { sortOrder: 'asc' } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    });

    return NextResponse.json({ data: updated, portalUrl, emailSent });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

