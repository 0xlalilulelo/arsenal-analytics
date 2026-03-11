import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

async function resolveOrgId() {
  const org = await prisma.organization.findFirst({ where: { slug: 'arsenal-aviation' }, select: { id: true } });
  return org?.id ?? null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);

  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  const [parts, total] = await Promise.all([
    prisma.part.findMany({
      where: { orgId, ...(search ? { OR: [
        { partNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } },
      ]} : {}) },
      orderBy: { partNumber: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.part.count({ where: { orgId } }),
  ]);

  return NextResponse.json({ data: parts, total, page, limit });
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await resolveOrgId();
    if (!orgId) return NextResponse.json({ error: 'Org not found' }, { status: 404 });
    const body = await request.json();
    const part = await prisma.part.create({ data: { orgId, ...body } });
    return NextResponse.json({ data: part }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
