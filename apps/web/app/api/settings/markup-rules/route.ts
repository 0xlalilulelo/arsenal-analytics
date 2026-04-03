import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { DEFAULT_MARKUP_TIERS } from '@mro/core';
import { getOrgId } from '@/lib/get-org-id';

export async function GET() {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let rules = await prisma.markupRule.findMany({
    where: { orgId },
    orderBy: { sortOrder: 'asc' },
  });

  // If no rules exist yet, return the defaults (not persisted)
  if (rules.length === 0) {
    return NextResponse.json({
      data: DEFAULT_MARKUP_TIERS.map((t, i) => ({
        id: null,
        orgId,
        label: t.label,
        minCost: t.minCost,
        maxCost: t.maxCost,
        markupPct: t.markupPct,
        sortOrder: i,
      })),
      isDefault: true,
    });
  }

  return NextResponse.json({ data: rules, isDefault: false });
}

/**
 * PUT /api/settings/markup-rules
 * Replaces all markup rules for the org with the provided tiers.
 * Body: { rules: Array<{ label, minCost, maxCost, markupPct, sortOrder }> }
 */
export async function PUT(request: NextRequest) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { rules } = body;

    if (!Array.isArray(rules) || rules.length === 0) {
      return NextResponse.json({ error: 'rules array is required' }, { status: 422 });
    }

    // Validate no overlapping ranges and at least one unbounded top tier
    for (const rule of rules) {
      if (typeof rule.minCost !== 'number' || typeof rule.markupPct !== 'number') {
        return NextResponse.json({ error: 'Each rule needs minCost and markupPct' }, { status: 422 });
      }
      if (rule.markupPct < 0 || rule.markupPct > 10) {
        return NextResponse.json({ error: `Invalid markupPct: ${rule.markupPct}` }, { status: 422 });
      }
    }

    // Atomic replace: delete all, then create new set
    await prisma.$transaction([
      prisma.markupRule.deleteMany({ where: { orgId } }),
      prisma.markupRule.createMany({
        data: rules.map((r: any, idx: number) => ({
          orgId,
          label: r.label ?? `Tier ${idx + 1}`,
          minCost: r.minCost,
          maxCost: r.maxCost ?? null,
          markupPct: r.markupPct,
          sortOrder: r.sortOrder ?? idx,
        })),
      }),
    ]);

    const updated = await prisma.markupRule.findMany({
      where: { orgId },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
