import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const type = searchParams.get('type');
  const status = searchParams.get('status'); // 'open' | 'completed' | 'all'

  const org = await prisma.organization.findFirst({ where: { slug: 'arsenal-aviation' }, select: { id: true } });
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  const items = await prisma.complianceItem.findMany({
    where: {
      workOrder: { orgId: org.id },
      ...(type && type !== 'ALL' ? { type: type as any } : {}),
      ...(status === 'open' ? { completedAt: null } : {}),
      ...(status === 'completed' ? { completedAt: { not: null } } : {}),
      ...(search ? { OR: [
        { referenceId: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]} : {}),
    },
    include: {
      workOrder: {
        select: {
          id: true,
          number: true,
          aircraft: { select: { nNumber: true, make: true, model: true, ttsn: true } },
        },
      },
    },
    orderBy: [{ completedAt: 'asc' }, { createdAt: 'desc' }],
    take: 100,
  });

  return NextResponse.json({ data: items });
}
