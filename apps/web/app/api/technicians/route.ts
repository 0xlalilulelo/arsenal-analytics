import { NextResponse } from 'next/server';
import { prisma } from '@mro/db';

export async function GET() {
  const org = await prisma.organization.findFirst({ where: { slug: 'arsenal-aviation' }, select: { id: true } });
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  const technicians = await prisma.technician.findMany({
    where: { orgId: org.id, active: true },
    select: { id: true, name: true, certifications: true, billRate: true, costRate: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ data: technicians });
}
