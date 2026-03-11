import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { InvoiceStatus } from '@prisma/client';

// GET /api/invoices
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') ?? 'demo-org';
    const status = searchParams.get('status') as InvoiceStatus | null;
    const customerId = searchParams.get('customerId');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);

    const invoices = await prisma.invoice.findMany({
      where: {
        orgId,
        ...(status ? { status } : {}),
        ...(customerId ? { customerId } : {}),
      },
      include: {
        customer: { select: { name: true, accountNumber: true, billingTerms: true } },
        workOrder: { select: { woNumber: true, title: true } },
        _count: { select: { payments: true } },
      },
      orderBy: [{ invoiceDate: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.invoice.count({
      where: { orgId, ...(status ? { status } : {}) },
    });

    return NextResponse.json({ data: invoices, total, page, limit });
  } catch (error) {
    console.error('GET /api/invoices error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/invoices — generate draft invoice from a work order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId = 'demo-org', workOrderId, customerId, taxRate = 0 } = body;

    // Generate invoice number
    const year = new Date().getFullYear();
    const count = await prisma.invoice.count({ where: { orgId } });
    const invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, '0')}`;

    // Pull unbilled labor and parts from work order
    let lineItemsData: {
      type: string;
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      isTaxable: boolean;
      laborEntryId?: string;
      partUsageId?: string;
    }[] = [];
    let subtotal = 0;

    if (workOrderId) {
      const laborEntries = await prisma.laborEntry.findMany({
        where: { workOrderId, isBillable: true },
        include: { technician: { select: { firstName: true, lastName: true } } },
      });

      for (const entry of laborEntries) {
        if (!entry.billedHours || !entry.totalBilled) continue;
        const hrs = Number(entry.billedHours);
        const rate = Number(entry.billingRate);
        const total = Number(entry.totalBilled);
        lineItemsData.push({
          type: 'LABOR',
          description: `Labor — ${entry.technician.firstName} ${entry.technician.lastName}${entry.isAog ? ' (AOG Rate)' : ''}`,
          quantity: hrs,
          unitPrice: rate,
          totalPrice: total,
          isTaxable: false,
          laborEntryId: entry.id,
        });
        subtotal += total;
      }

      const partUsages = await prisma.partUsage.findMany({
        where: { workOrderId, isBillable: true },
      });

      for (const usage of partUsages) {
        const total = Number(usage.totalPrice);
        lineItemsData.push({
          type: 'PARTS',
          description: `${usage.partNumber} — ${usage.description}`,
          quantity: Number(usage.quantity),
          unitPrice: Number(usage.unitPrice),
          totalPrice: total,
          isTaxable: true,
          partUsageId: usage.id,
        });
        subtotal += total;
      }
    }

    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { billingTerms: true },
    });

    const invoice = await prisma.invoice.create({
      data: {
        orgId,
        invoiceNumber,
        customerId,
        workOrderId: workOrderId ?? null,
        status: 'DRAFT',
        terms: customer?.billingTerms ?? 'NET30',
        subtotal,
        taxRate,
        taxAmount,
        totalAmount,
        balanceDue: totalAmount,
        lineItems: {
          create: lineItemsData.map((li, idx) => ({
            sortOrder: idx,
            type: li.type as 'LABOR' | 'PARTS' | 'FLAT_RATE' | 'SHOP_SUPPLIES' | 'SUBTOTAL' | 'DISCOUNT' | 'OTHER',
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            totalPrice: li.totalPrice,
            isTaxable: li.isTaxable,
            laborEntryId: li.laborEntryId,
            partUsageId: li.partUsageId,
          })),
        },
      },
      include: {
        lineItems: true,
        customer: true,
        workOrder: true,
      },
    });

    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (error) {
    console.error('POST /api/invoices error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
