import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

const ORG_SELECT = {
  id: true,
  name: true,
  slug: true,
  faaRepairStationNumber: true,
  phone: true,
  email: true,
  address: true,
  shopSuppliesPct: true,
  defaultTaxRatePct: true,
  defaultBillingTerms: true,
  laborRoundingMinutes: true,
} as const;

export async function GET() {
  const org = await prisma.organization.findFirst({ select: ORG_SELECT });
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });
  return NextResponse.json({ data: org });
}

export async function PATCH(request: NextRequest) {
  try {
    const org = await prisma.organization.findFirst({ select: { id: true } });
    if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

    const body = await request.json();
    const {
      name,
      faaRepairStationNumber,
      phone,
      email,
      address,
      shopSuppliesPct,
      defaultTaxRatePct,
      defaultBillingTerms,
      laborRoundingMinutes,
    } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (faaRepairStationNumber !== undefined) data.faaRepairStationNumber = faaRepairStationNumber || null;
    if (phone !== undefined) data.phone = phone || null;
    if (email !== undefined) data.email = email || null;
    if (address !== undefined) data.address = address || null;
    if (shopSuppliesPct !== undefined) data.shopSuppliesPct = Math.max(0, Math.min(1, Number(shopSuppliesPct)));
    if (defaultTaxRatePct !== undefined) data.defaultTaxRatePct = Math.max(0, Math.min(1, Number(defaultTaxRatePct)));
    if (defaultBillingTerms !== undefined) data.defaultBillingTerms = defaultBillingTerms;
    if (laborRoundingMinutes !== undefined) data.laborRoundingMinutes = Number(laborRoundingMinutes);

    const updated = await prisma.organization.update({
      where: { id: org.id },
      data,
      select: ORG_SELECT,
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
