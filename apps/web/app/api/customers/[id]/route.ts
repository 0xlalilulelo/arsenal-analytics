import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      aircraft: {
        orderBy: { nNumber: 'asc' },
        select: { id: true, nNumber: true, make: true, model: true, year: true, serial: true, ttsn: true, engineTtsn: true },
      },
      workOrders: {
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          id: true, number: true, status: true, type: true,
          description: true, estimatedTotal: true, createdAt: true, closedAt: true,
          aircraft: { select: { nNumber: true } },
        },
      },
      invoices: {
        orderBy: { issueDate: 'desc' },
        take: 20,
        select: {
          id: true, invoiceNumber: true, status: true,
          issueDate: true, dueDate: true, total: true, balance: true, amountPaid: true,
        },
      },
    },
  });
  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: customer });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, phone, billingTerms, notes } = body;

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(name?.trim() ? { name: name.trim() } : {}),
        ...(email !== undefined ? { email: email?.trim() || null } : {}),
        ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
        ...(billingTerms ? { billingTerms } : {}),
        ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
      },
      include: { _count: { select: { workOrders: true, aircraft: true } } },
    });

    return NextResponse.json({ data: customer });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
