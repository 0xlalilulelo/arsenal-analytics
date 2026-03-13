import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Token is stored as "approvalToken:{uuid}" in internalNotes
  const quote = await prisma.quote.findFirst({
    where: { internalNotes: { contains: `approvalToken:${token}` } },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      aircraft: { select: { nNumber: true, make: true, model: true, year: true, serial: true, ttsn: true } },
      lines: { orderBy: { sortOrder: 'asc' } },
      org: { select: { name: true } },
    },
  });

  if (!quote) return NextResponse.json({ error: 'Quote not found or link expired' }, { status: 404 });

  // Don't expose internal notes or org internals to the portal
  const { internalNotes: _internal, ...safeQuote } = quote as any;

  return NextResponse.json({ data: safeQuote });
}
