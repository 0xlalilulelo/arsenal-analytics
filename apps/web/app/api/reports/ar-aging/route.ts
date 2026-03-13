import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { classifyAgingBucket } from '@mro/core';

export async function GET(_req: NextRequest) {
  const org = await prisma.organization.findFirst({ select: { id: true } });
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  const now = new Date();

  const invoices = await prisma.invoice.findMany({
    where: {
      orgId: org.id,
      status: { in: ['SENT', 'VIEWED', 'PARTIAL', 'OVERDUE'] },
    },
    include: {
      customer: { select: { id: true, name: true, accountNumber: true } },
    },
    orderBy: { dueDate: 'asc' },
  });

  // Build per-customer rows
  const byCustomer: Record<string, {
    customerId: string;
    customerName: string;
    accountNumber: string | null;
    current: number;
    days1_30: number;
    days31_60: number;
    days61_90: number;
    days90plus: number;
    total: number;
    invoiceCount: number;
  }> = {};

  const rows: {
    id: string;
    invoiceNumber: string;
    customerName: string;
    accountNumber: string | null;
    issueDate: Date;
    dueDate: Date | null;
    total: number;
    balance: number;
    bucket: string;
    daysOutstanding: number;
  }[] = [];

  for (const inv of invoices) {
    const bucket = classifyAgingBucket(inv.dueDate, now);
    const days = Math.floor((now.getTime() - new Date(inv.issueDate).getTime()) / 86400000);
    const cid = inv.customerId;

    rows.push({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customer?.name ?? 'Unknown',
      accountNumber: inv.customer?.accountNumber ?? null,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      total: inv.totalAmount,
      balance: inv.balance,
      bucket,
      daysOutstanding: days,
    });

    if (!byCustomer[cid]) {
      byCustomer[cid] = {
        customerId: cid,
        customerName: inv.customer?.name ?? 'Unknown',
        accountNumber: inv.customer?.accountNumber ?? null,
        current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days90plus: 0, total: 0, invoiceCount: 0,
      };
    }
    const row = byCustomer[cid];
    row.total += inv.balance;
    row.invoiceCount++;
    if (bucket === 'CURRENT') row.current += inv.balance;
    else if (bucket === '1_30') row.days1_30 += inv.balance;
    else if (bucket === '31_60') row.days31_60 += inv.balance;
    else if (bucket === '61_90') row.days61_90 += inv.balance;
    else row.days90plus += inv.balance;
  }

  const summary = {
    current: 0, days1_30: 0, days31_60: 0, days61_90: 0, days90plus: 0, total: 0,
  };
  for (const c of Object.values(byCustomer)) {
    summary.current += c.current;
    summary.days1_30 += c.days1_30;
    summary.days31_60 += c.days31_60;
    summary.days61_90 += c.days61_90;
    summary.days90plus += c.days90plus;
    summary.total += c.total;
  }

  return NextResponse.json({
    data: { rows, byCustomer: Object.values(byCustomer).sort((a, b) => b.total - a.total), summary },
  });
}
