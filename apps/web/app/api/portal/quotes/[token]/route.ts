import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { prisma } from '@mro/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = _req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`portal-quote:${ip}`, 30, 300); // 30 per 5 min
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const { token } = await params;

  const quote = await prisma.quote.findFirst({
    where: { portalToken: token },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      aircraft: { select: { nNumber: true, make: true, model: true, year: true, serial: true, ttsn: true } },
      lines: { orderBy: { sortOrder: 'asc' } },
      org: { select: { name: true } },
    },
  });

  if (!quote) return NextResponse.json({ error: 'Quote not found or link expired' }, { status: 404 });

  // Don't expose internal fields or org internals to the portal
  const { portalToken: _token, internalNotes: _internal, ...safeQuote } = quote as any;

  return NextResponse.json({ data: safeQuote });
}
