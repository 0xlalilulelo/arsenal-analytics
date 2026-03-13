import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

async function resolveOrgId() {
  const org = await prisma.organization.findFirst({ select: { id: true } });
  return org?.id ?? null;
}

export async function GET() {
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  const defaultRate = await prisma.laborRate.findFirst({
    where: { orgId, isDefault: true },
    select: { id: true, name: true, rate: true, multiplier: true },
  });

  return NextResponse.json({ data: { laborRate: defaultRate } });
}

/**
 * PATCH /api/settings/defaults
 * Body: { laborRate?: number; aogMultiplier?: number }
 */
export async function PATCH(request: NextRequest) {
  try {
    const orgId = await resolveOrgId();
    if (!orgId) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

    const body = await request.json();
    const { laborRate, aogMultiplier } = body;

    const defaultLaborRate = await prisma.laborRate.findFirst({
      where: { orgId, isDefault: true },
    });

    if (!defaultLaborRate) {
      return NextResponse.json({ error: 'No default labor rate found' }, { status: 404 });
    }

    const updated = await prisma.laborRate.update({
      where: { id: defaultLaborRate.id },
      data: {
        ...(laborRate != null ? { rate: laborRate } : {}),
        ...(aogMultiplier != null ? { multiplier: aogMultiplier } : {}),
      },
      select: { id: true, name: true, rate: true, multiplier: true },
    });

    return NextResponse.json({ data: { laborRate: updated } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
