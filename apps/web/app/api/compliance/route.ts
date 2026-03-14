import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const type = searchParams.get('type');
  const status = searchParams.get('status'); // 'open' | 'completed' | 'all'

  const org = await prisma.organization.findFirst({ select: { id: true } });
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

export async function POST(request: NextRequest) {
  try {
    const org = await prisma.organization.findFirst({ select: { id: true } });
    if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

    const body = await request.json();
    const { workOrderId, type, referenceId, description, form337Required, documentUrls } = body;

    if (!workOrderId) return NextResponse.json({ error: 'workOrderId required' }, { status: 422 });
    if (!type) return NextResponse.json({ error: 'type required' }, { status: 422 });
    if (!referenceId?.trim()) return NextResponse.json({ error: 'referenceId required' }, { status: 422 });
    if (!description?.trim()) return NextResponse.json({ error: 'description required' }, { status: 422 });

    const item = await prisma.complianceItem.create({
      data: {
        workOrderId,
        type,
        referenceId: referenceId.trim(),
        description: description.trim(),
        form337Required: form337Required ?? false,
        documentUrls: Array.isArray(documentUrls) ? documentUrls : [],
      },
      include: {
        workOrder: { select: { id: true, number: true, aircraft: { select: { nNumber: true } } } },
      },
    });

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
