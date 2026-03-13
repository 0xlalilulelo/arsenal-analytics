import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

export async function GET() {
  const org = await prisma.organization.findFirst({ select: { id: true } });
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  const technicians = await prisma.technician.findMany({
    where: { orgId: org.id, active: true },
    select: { id: true, name: true, certifications: true, billRate: true, costRate: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ data: technicians });
}

export async function POST(request: NextRequest) {
  try {
    const org = await prisma.organization.findFirst({ select: { id: true } });
    if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

    const body = await request.json();
    const { name, certifications = [], billRate, costRate } = body;
    if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 422 });
    if (typeof billRate !== 'number' || billRate <= 0) return NextResponse.json({ error: 'billRate required' }, { status: 422 });
    if (typeof costRate !== 'number' || costRate < 0) return NextResponse.json({ error: 'costRate required' }, { status: 422 });

    const technician = await prisma.technician.create({
      data: {
        orgId: org.id,
        name: name.trim(),
        certifications: Array.isArray(certifications) ? certifications : [],
        billRate,
        costRate,
      },
      select: { id: true, name: true, certifications: true, billRate: true, costRate: true },
    });

    return NextResponse.json({ data: technician }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
