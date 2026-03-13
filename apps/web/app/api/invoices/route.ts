import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import type { InvoiceStatus } from '@prisma/client';
import { addDays } from 'date-fns';

const TERMS_DAYS: Record<string, number> = { NET_15: 15, NET_30: 30, NET_45: 45, COD: 0, PREPAY: 0 };

async function resolveOrgId() {
  const org = await prisma.organization.findFirst({ select: { id: true } });
  return org?.id ?? null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as InvoiceStatus | null;
  const customerId = searchParams.get('customerId');
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);

  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where: { orgId, ...(status ? { status } : {}), ...(customerId ? { customerId } : {}) },
      include: {
        customer: { select: { name: true, accountNumber: true, billingTerms: true } },
        workOrder: { select: { number: true } },
        _count: { select: { payments: true } },
      },
      orderBy: { issueDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.invoice.count({ where: { orgId, ...(status ? { status } : {}) } }),
  ]);

  return NextResponse.json({ data: invoices, total, page, limit });
}

const SHOP_SUPPLIES_PCT = 0.035;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workOrderId, customerId, taxRate = 0, includeShopSupplies = false } = body;

    const orgId = await resolveOrgId();
    if (!orgId) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { billingTerms: true } });
    const terms = customer?.billingTerms ?? 'NET_30';
    const issueDate = new Date();
    const dueDate = addDays(issueDate, TERMS_DAYS[terms] ?? 30);

    const count = await prisma.invoice.count({ where: { orgId } });
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    let lineItemsData: { category: string; description: string; qty: number; unitPrice: number; total: number; taxable: boolean }[] = [];
    let subtotal = 0;
    let laborTotal = 0;

    if (workOrderId) {
      const entries = await prisma.laborEntry.findMany({
        where: { workOrderId, billable: true },
        include: { technician: { select: { name: true } } },
      });

      for (const e of entries) {
        const t = e.hours * e.rateUsed;
        lineItemsData.push({ category: 'LABOR', description: `Labor — ${e.technician.name}`, qty: e.hours, unitPrice: e.rateUsed, total: t, taxable: false });
        subtotal += t;
        laborTotal += t;
      }

      const partReqs = await prisma.partRequest.findMany({
        where: { workOrderId, status: { in: ['INSTALLED', 'RECEIVED'] }, unitBillPrice: { not: null } },
      });
      for (const p of partReqs) {
        const t = p.qty * (p.unitBillPrice ?? 0);
        lineItemsData.push({ category: 'PARTS', description: `${p.partNumber} — ${p.description}`, qty: p.qty, unitPrice: p.unitBillPrice ?? 0, total: t, taxable: true });
        subtotal += t;
      }

      if (includeShopSupplies && laborTotal > 0) {
        const shopAmt = Math.round(laborTotal * SHOP_SUPPLIES_PCT * 100) / 100;
        lineItemsData.push({ category: 'SHOP_SUPPLIES', description: 'Shop Supplies (3.5% of labor)', qty: 1, unitPrice: shopAmt, total: shopAmt, taxable: true });
        subtotal += shopAmt;
      }
    }

    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    const invoice = await prisma.invoice.create({
      data: {
        orgId, invoiceNumber, customerId,
        workOrderId: workOrderId ?? null,
        status: 'DRAFT',
        issueDate,
        dueDate,
        subtotal,
        taxRate,
        taxAmount,
        total,
        amountPaid: 0,
        balance: total,
        lineItems: {
          create: lineItemsData.map((li, idx) => ({
            category: li.category as 'LABOR' | 'PARTS' | 'SHOP_SUPPLIES' | 'FREIGHT' | 'HANDLING' | 'SUBCONTRACT' | 'OTHER',
            description: li.description,
            qty: li.qty,
            unitPrice: li.unitPrice,
            total: li.total,
            taxable: li.taxable,
            sortOrder: idx,
          })),
        },
      },
      include: { lineItems: true, customer: true, workOrder: true },
    });

    return NextResponse.json({ data: invoice }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
