import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const quote = await prisma.quote.findFirst({
    where: { internalNotes: { contains: `approvalToken:${token}` } },
    select: { id: true, status: true },
  });
  if (!quote || quote.status !== 'SENT') return NextResponse.json({ ok: true });
  await prisma.quote.update({ where: { id: quote.id }, data: { status: 'VIEWED' } });
  return NextResponse.json({ ok: true });
}
