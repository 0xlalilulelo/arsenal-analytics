import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import {
  getMarkupPct,
  getBillPrice,
  requiresLotTraceability,
  validateExpirationBeforeInstall,
  type MarkupTier,
} from '@mro/core';
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
    const {
      partRequestId,
      status,
      unitCost,
      markupPctOverride,
      receivedAt,
      purchaseOrderId,
      partLotId,
    } = body as {
      partRequestId: string;
      status?: PartRequestStatus;
      unitCost?: number;
      markupPctOverride?: number;
      receivedAt?: string;
      purchaseOrderId?: string | null;
      partLotId?: string | null;
    };

    if (!partRequestId) return NextResponse.json({ error: 'partRequestId required' }, { status: 422 });

    const existing = await prisma.partRequest.findFirst({
      where: { id: partRequestId, workOrderId },
    });
    if (!existing) return NextResponse.json({ error: 'Part request not found' }, { status: 404 });

    const wo = await prisma.workOrder.findUnique({ where: { id: workOrderId }, select: { orgId: true } });

    // Resolve the lot id that will be bound on this update (either new or previously attached).
    const resolvedPartLotId = partLotId !== undefined ? partLotId : existing.partLotId;

    // Gate INSTALLED transitions on traceability and lot validity.
    if (status === 'INSTALLED' && existing.status !== 'INSTALLED') {
      if (requiresLotTraceability(existing) && !resolvedPartLotId) {
        return NextResponse.json(
          { error: 'A traceable PartLot is required before installing a part that requires an 8130-3.' },
          { status: 422 },
        );
      }

      if (resolvedPartLotId) {
        const lot = await prisma.partLot.findUnique({
          where: { id: resolvedPartLotId },
          include: { part: { select: { orgId: true } } },
        });
        if (!lot || (wo && lot.part.orgId !== wo.orgId)) {
          return NextResponse.json({ error: 'Part lot not found' }, { status: 404 });
        }
        if (lot.condition !== existing.condition) {
          return NextResponse.json(
            { error: `Lot condition (${lot.condition}) does not match request condition (${existing.condition}).` },
            { status: 422 },
          );
        }
        if (lot.qtyOnHand < existing.qty) {
          return NextResponse.json(
            { error: `Lot has ${lot.qtyOnHand} on hand; request needs ${existing.qty}.` },
            { status: 422 },
          );
        }
        const verdict = validateExpirationBeforeInstall(lot);
        if (verdict.status === 'block') {
          return NextResponse.json(
            { error: verdict.reason === 'EXPIRED' ? 'Lot is expired' : 'Lot has no quantity on hand' },
            { status: 422 },
          );
        }
      }
    }

    // Recalculate markup if cost updated
    let markupPct = existing.markupPct;
    let unitBillPrice = existing.unitBillPrice;
    if (unitCost != null && wo) {
      const orgRules = await loadOrgMarkupRules(wo.orgId);
      markupPct = markupPctOverride ?? getMarkupPct(unitCost, orgRules);
      unitBillPrice = getBillPrice(unitCost, markupPct ?? undefined, orgRules);
    }

    const updated = await prisma.$transaction(async tx => {
      const next = await tx.partRequest.update({
        where: { id: partRequestId },
        data: {
          ...(status ? { status } : {}),
          ...(unitCost != null ? { unitCost, markupPct, unitBillPrice } : {}),
          ...(receivedAt ? { receivedAt: new Date(receivedAt) } : {}),
          ...(purchaseOrderId !== undefined ? { purchaseOrderId } : {}),
          ...(partLotId !== undefined ? { partLotId } : {}),
        },
      });

      // Decrement lot qty on the INSTALLED transition (one-shot; skips re-installs).
      if (status === 'INSTALLED' && existing.status !== 'INSTALLED' && resolvedPartLotId) {
        await tx.partLot.update({
          where: { id: resolvedPartLotId },
          data: { qtyOnHand: { decrement: existing.qty } },
        });
      }

      return next;
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
