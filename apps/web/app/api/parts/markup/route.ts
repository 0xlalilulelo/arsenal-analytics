import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { getMarkupBreakdown, type MarkupTier } from '@mro/core';

/**
 * POST /api/parts/markup
 * Body: { unitCost: number }
 * Returns: markup breakdown using org-level MarkupRule table.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { unitCost } = body;

    if (typeof unitCost !== 'number' || unitCost < 0) {
      return NextResponse.json({ error: 'unitCost must be a non-negative number' }, { status: 422 });
    }

    const org = await prisma.organization.findFirst({ select: { id: true } });
    if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

    const rules = await prisma.markupRule.findMany({
      where: { orgId: org.id },
      orderBy: { sortOrder: 'asc' },
    });

    const orgTiers: MarkupTier[] = rules.map(r => ({
      label: r.label,
      minCost: r.minCost,
      maxCost: r.maxCost,
      markupPct: r.markupPct,
    }));

    const breakdown = getMarkupBreakdown(unitCost, orgTiers.length > 0 ? orgTiers : undefined);
    return NextResponse.json({ data: breakdown });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
