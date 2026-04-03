import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/get-org-id';
import { hasRole } from '@/lib/rbac';
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
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const org = await prisma.organization.findUnique({ where: { id: sessionUser.orgId }, select: ORG_SELECT });
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });
  return NextResponse.json({ data: org });
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || !hasRole(sessionUser.role, 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const org = await prisma.organization.findUnique({ where: { id: sessionUser.orgId }, select: { id: true } });
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
    if (laborRoundingMinutes !== undefined) {
      const validRounding = [1, 5, 6, 10, 15, 30, 60];
      const val = Number(laborRoundingMinutes);
      if (!validRounding.includes(val)) {
        return NextResponse.json({ error: `laborRoundingMinutes must be one of: ${validRounding.join(', ')}` }, { status: 422 });
      }
      data.laborRoundingMinutes = val;
    }

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
