import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

type Params = { params: { id: string; itemId: string } };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();
    const { description, qty, unitPrice, taxable } = body;

    const item = await prisma.invoiceLineItem.findFirst({
      where: { id: params.itemId, invoiceId: params.id },
    });
    if (!item) return NextResponse.json({ error: 'Line item not found' }, { status: 404 });

    const invoice = await prisma.invoice.findUnique({ where: { id: params.id } });
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    if (['PAID', 'VOID'].includes(invoice.status)) {
      return NextResponse.json({ error: 'Cannot modify a paid or void invoice' }, { status: 409 });
    }

    const newQty = qty !== undefined ? qty : item.qty;
    const newUnitPrice = unitPrice !== undefined ? unitPrice : item.unitPrice;
    const newTotal = newQty * newUnitPrice;

    await prisma.invoiceLineItem.update({
      where: { id: params.itemId },
      data: {
        ...(description !== undefined ? { description } : {}),
        ...(qty !== undefined ? { qty } : {}),
        ...(unitPrice !== undefined ? { unitPrice } : {}),
        ...(taxable !== undefined ? { taxable } : {}),
        total: newTotal,
      },
    });

    // Recalculate invoice totals
    const allItems = await prisma.invoiceLineItem.findMany({ where: { invoiceId: params.id } });
    const subtotal = allItems.reduce((s, li) => s + li.total, 0);
    const taxAmount = allItems.filter(li => li.taxable).reduce((s, li) => s + li.total, 0) * (invoice.taxRate ?? 0);
    const newInvoiceTotal = subtotal + taxAmount;

    const updatedInvoice = await prisma.invoice.update({
      where: { id: params.id },
      data: { subtotal, total: newInvoiceTotal, balance: newInvoiceTotal - invoice.amountPaid },
      include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
    });

    return NextResponse.json({ data: updatedInvoice });
  } catch (e) {
    console.error('[INVOICE_LINE_ITEM_PATCH]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const item = await prisma.invoiceLineItem.findFirst({
      where: { id: params.itemId, invoiceId: params.id },
    });
    if (!item) return NextResponse.json({ error: 'Line item not found' }, { status: 404 });

    const invoice = await prisma.invoice.findUnique({ where: { id: params.id } });
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    if (['PAID', 'VOID'].includes(invoice.status)) {
      return NextResponse.json({ error: 'Cannot modify a paid or void invoice' }, { status: 409 });
    }

    await prisma.invoiceLineItem.delete({ where: { id: params.itemId } });

    // Recalculate invoice totals
    const allItems = await prisma.invoiceLineItem.findMany({ where: { invoiceId: params.id } });
    const subtotal = allItems.reduce((s, li) => s + li.total, 0);
    const taxAmount = allItems.filter(li => li.taxable).reduce((s, li) => s + li.total, 0) * (invoice.taxRate ?? 0);
    const newTotal = subtotal + taxAmount;

    await prisma.invoice.update({
      where: { id: params.id },
      data: { subtotal, total: newTotal, balance: newTotal - invoice.amountPaid },
    });

    return NextResponse.json({ data: { deleted: true } });
  } catch (e) {
    console.error('[INVOICE_LINE_ITEM_DELETE]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
