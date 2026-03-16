import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

async function resolveOrgId() {
  const org = await prisma.organization.findFirst({ select: { id: true } });
  return org?.id ?? null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const orgId = await resolveOrgId();
    if (!orgId) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

    const rate = await prisma.laborRate.findFirst({ where: { id, orgId }, select: { id: true } });
    if (!rate) return NextResponse.json({ error: 'Rate not found' }, { status: 404 });

    const body = await request.json();
    const { name, rate: rateValue, multiplier } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (rateValue !== undefined) data.rate = Number(rateValue);
    if (multiplier !== undefined) data.multiplier = Number(multiplier);

    const updated = await prisma.laborRate.update({
      where: { id },
      data,
      select: { id: true, name: true, rate: true, multiplier: true, isDefault: true },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const orgId = await resolveOrgId();
    if (!orgId) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

    const rate = await prisma.laborRate.findFirst({ where: { id, orgId }, select: { id: true, isDefault: true } });
    if (!rate) return NextResponse.json({ error: 'Rate not found' }, { status: 404 });
    if (rate.isDefault) return NextResponse.json({ error: 'Cannot delete the default labor rate' }, { status: 400 });

    await prisma.laborRate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
