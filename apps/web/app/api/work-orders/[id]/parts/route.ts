import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { getMarkupPct, getBillPrice, type MarkupTier } from '@mro/core';
import type { PartCondition, PartRequestStatus } from '@prisma/client';

async function loadOrgMarkupRules(orgId: string): Promise<MarkupTier[]> {
  const rules = await prisma.markupRule.findMany({
    where: { orgId },
    orderBy: { sortOrder: 'asc' },
  });
  return rules.map(r => ({
    label: r.label,
    minCost: r.minCost,
    maxCost: r.maxCost,
    markupPct: r.markupPct,
  }));
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const partRequests = await prisma.partRequest.findMany({
    where: { workOrderId: id },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json({ data: partRequests });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      lineItemId,
      partNumber,
      description,
      qty = 1,
      condition = 'NEW',
      unitCost,
      markupPctOverride,   // optional — if provided, skips auto-calculation
      requires8130 = false,
      status = 'REQUESTED',
    } = body;

    const wo = await prisma.workOrder.findUnique({
      where: { id },
      select: { orgId: true },
    });
    if (!wo) return NextResponse.json({ error: 'Work order not found' }, { status: 404 });

    // Auto-calculate markup from org rules if unitCost provided and no override
    let markupPct = markupPctOverride ?? null;
    let unitBillPrice = null;

    if (unitCost != null) {
      const orgRules = await loadOrgMarkupRules(wo.orgId);
      markupPct = markupPctOverride ?? getMarkupPct(unitCost, orgRules);
      unitBillPrice = getBillPrice(unitCost, markupPct ?? undefined, orgRules);
    }

    const partRequest = await prisma.partRequest.create({
      data: {
        workOrderId: id,
        lineItemId: lineItemId ?? null,
        partNumber,
        description,
        qty,
        condition: condition as PartCondition,
        unitCost: unitCost ?? null,
        markupPct,
        unitBillPrice,
        requires8130,
        status: status as PartRequestStatus,
      },
    });

    return NextResponse.json({ data: partRequest }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: workOrderId } = await params;
    const body = await request.json();
    const { partRequestId, status, unitCost, markupPctOverride, receivedAt, purchaseOrderId } = body;

    if (!partRequestId) return NextResponse.json({ error: 'partRequestId required' }, { status: 422 });

    const existing = await prisma.partRequest.findFirst({
      where: { id: partRequestId, workOrderId },
    });
    if (!existing) return NextResponse.json({ error: 'Part request not found' }, { status: 404 });

    const wo = await prisma.workOrder.findUnique({ where: { id: workOrderId }, select: { orgId: true } });

    // Recalculate markup if cost updated
    let markupPct = existing.markupPct;
    let unitBillPrice = existing.unitBillPrice;
    if (unitCost != null && wo) {
      const orgRules = await loadOrgMarkupRules(wo.orgId);
      markupPct = markupPctOverride ?? getMarkupPct(unitCost, orgRules);
      unitBillPrice = getBillPrice(unitCost, markupPct ?? undefined, orgRules);
    }

    const updated = await prisma.partRequest.update({
      where: { id: partRequestId },
      data: {
        ...(status ? { status } : {}),
        ...(unitCost != null ? { unitCost, markupPct, unitBillPrice } : {}),
        ...(receivedAt ? { receivedAt: new Date(receivedAt) } : {}),
        ...(purchaseOrderId !== undefined ? { purchaseOrderId } : {}),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
