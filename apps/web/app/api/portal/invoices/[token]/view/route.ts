import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invoice = await prisma.invoice.findFirst({ where: { portalToken: token }, select: { id: true, status: true } });
  if (!invoice || invoice.status !== 'SENT') return NextResponse.json({ ok: true });
  await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'VIEWED' } });
  return NextResponse.json({ ok: true });
}
