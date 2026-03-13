import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

export async function GET() {
  const org = await prisma.organization.findFirst({
    select: { id: true, name: true, slug: true },
  });
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });
  return NextResponse.json({ data: org });
}

export async function PATCH(request: NextRequest) {
  try {
    const org = await prisma.organization.findFirst({ select: { id: true } });
    if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

    const body = await request.json();
    const { name } = body;

    const updated = await prisma.organization.update({
      where: { id: org.id },
      data: { ...(name ? { name } : {}) },
      select: { id: true, name: true, slug: true },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
