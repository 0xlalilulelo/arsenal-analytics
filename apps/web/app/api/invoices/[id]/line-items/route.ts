import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { description, category = 'OTHER', qty = 1, unitPrice, taxable = false } = body;

    if (!description?.trim()) {
      return NextResponse.json({ error: 'description is required' }, { status: 422 });
    }
    if (typeof unitPrice !== 'number') {
      return NextResponse.json({ error: 'unitPrice is required' }, { status: 422 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { lineItems: { select: { id: true } } },
    });
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    if (['PAID', 'VOID'].includes(invoice.status)) {
      return NextResponse.json({ error: 'Cannot modify a paid or void invoice' }, { status: 409 });
    }

    const total = qty * unitPrice;
    const sortOrder = invoice.lineItems.length;

    const lineItem = await prisma.invoiceLineItem.create({
      data: {
        invoiceId: id,
        description: description.trim(),
        category,
        qty,
        unitPrice,
        total,
        taxable,
        sortOrder,
      },
    });

    // Recalculate invoice totals
    const allItems = await prisma.invoiceLineItem.findMany({ where: { invoiceId: id } });
    const subtotal = allItems.reduce((s, li) => s + li.total, 0);
    const taxAmount = allItems.filter(li => li.taxable).reduce((s, li) => s + li.total, 0) * (invoice.taxRate ?? 0);
    const newTotal = subtotal + taxAmount;

    await prisma.invoice.update({
      where: { id },
      data: { subtotal, total: newTotal, balance: newTotal - invoice.amountPaid },
    });

    return NextResponse.json({ data: lineItem }, { status: 201 });
  } catch (e) {
    console.error('[INVOICE_LINE_ITEM_POST]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
