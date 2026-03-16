import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

type Params = { params: { id: string; partId: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const record = await prisma.warrantyRecord.findUnique({
    where: { partRequestId: params.partId },
  });
  return NextResponse.json({ data: record });
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const body = await request.json();
    const {
      vendor, warrantyMonths, installDate, expiresAt,
      claimStatus = 'NONE', claimRef, claimDate, claimAmount, notes,
    } = body;

    if (!vendor?.trim()) {
      return NextResponse.json({ error: 'vendor is required' }, { status: 422 });
    }
    if (!warrantyMonths || warrantyMonths <= 0) {
      return NextResponse.json({ error: 'warrantyMonths must be > 0' }, { status: 422 });
    }

    // Verify part belongs to this work order
    const part = await prisma.partRequest.findFirst({
      where: { id: params.partId, workOrderId: params.id },
    });
    if (!part) return NextResponse.json({ error: 'Part request not found' }, { status: 404 });

    const record = await prisma.warrantyRecord.upsert({
      where: { partRequestId: params.partId },
      create: {
        partRequestId: params.partId,
        vendor: vendor.trim(),
        warrantyMonths,
        installDate: installDate ? new Date(installDate) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        claimStatus,
        claimRef: claimRef?.trim() || null,
        claimDate: claimDate ? new Date(claimDate) : null,
        claimAmount: claimAmount ?? null,
        notes: notes?.trim() || null,
      },
      update: {
        vendor: vendor.trim(),
        warrantyMonths,
        installDate: installDate ? new Date(installDate) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        claimStatus,
        claimRef: claimRef?.trim() || null,
        claimDate: claimDate ? new Date(claimDate) : null,
        claimAmount: claimAmount ?? null,
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json({ data: record }, { status: 201 });
  } catch (e) {
    console.error('[WARRANTY_POST]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
