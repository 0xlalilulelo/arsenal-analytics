import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

type Params = { params: Promise<{ id: string; partId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { partId } = await params;
  const record = await prisma.coreReturn.findUnique({
    where: { partRequestId: partId },
  });
  return NextResponse.json({ data: record });
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id, partId } = await params;
    const body = await request.json();
    const {
      corePartNumber, coreDescription, coreValue, vendor,
      returnDueDate, returnedAt, trackingNumber, creditReceived, creditApplied, notes,
    } = body;

    if (!corePartNumber?.trim()) {
      return NextResponse.json({ error: 'corePartNumber is required' }, { status: 422 });
    }
    if (!vendor?.trim()) {
      return NextResponse.json({ error: 'vendor is required' }, { status: 422 });
    }
    if (typeof coreValue !== 'number') {
      return NextResponse.json({ error: 'coreValue is required' }, { status: 422 });
    }

    // Verify part belongs to this work order
    const part = await prisma.partRequest.findFirst({
      where: { id: partId, workOrderId: id },
    });
    if (!part) return NextResponse.json({ error: 'Part request not found' }, { status: 404 });

    const record = await prisma.coreReturn.upsert({
      where: { partRequestId: partId },
      create: {
        partRequestId: partId,
        corePartNumber: corePartNumber.trim(),
        coreDescription: coreDescription?.trim() || null,
        coreValue,
        vendor: vendor.trim(),
        returnDueDate: returnDueDate ? new Date(returnDueDate) : null,
        returnedAt: returnedAt ? new Date(returnedAt) : null,
        trackingNumber: trackingNumber?.trim() || null,
        creditReceived: creditReceived ?? null,
        creditApplied: creditApplied ?? false,
        notes: notes?.trim() || null,
      },
      update: {
        corePartNumber: corePartNumber.trim(),
        coreDescription: coreDescription?.trim() || null,
        coreValue,
        vendor: vendor.trim(),
        returnDueDate: returnDueDate ? new Date(returnDueDate) : null,
        returnedAt: returnedAt ? new Date(returnedAt) : null,
        trackingNumber: trackingNumber?.trim() || null,
        creditReceived: creditReceived ?? null,
        creditApplied: creditApplied ?? false,
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json({ data: record }, { status: 201 });
  } catch (e) {
    console.error('[CORE_RETURN_POST]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
