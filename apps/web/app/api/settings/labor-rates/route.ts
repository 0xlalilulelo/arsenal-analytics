import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { getOrgId } from '@/lib/get-org-id';

export async function GET() {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rates = await prisma.laborRate.findMany({
    where: { orgId },
    select: { id: true, name: true, rate: true, multiplier: true, isDefault: true },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });

  return NextResponse.json({ data: rates });
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, rate, multiplier = 1.0 } = body;

    if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    if (!rate || rate <= 0) return NextResponse.json({ error: 'rate must be positive' }, { status: 400 });

    const created = await prisma.laborRate.create({
      data: { orgId, name: name.trim(), rate: Number(rate), multiplier: Number(multiplier), isDefault: false },
      select: { id: true, name: true, rate: true, multiplier: true, isDefault: true },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
