import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json();
  const { action, approvedBy, declineReason } = body; // action: 'approve' | 'decline'

  if (!['approve', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 422 });
  }

  const quote = await prisma.quote.findFirst({
    where: { internalNotes: { contains: `approvalToken:${token}` } },
  });

  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  if (!['SENT', 'VIEWED'].includes(quote.status)) {
    return NextResponse.json({ error: `Quote is already ${quote.status}` }, { status: 422 });
  }

  const updated = await prisma.quote.update({
    where: { id: quote.id },
    data: action === 'approve'
      ? { status: 'APPROVED', approvedAt: new Date(), approvedBy: approvedBy?.trim() || null }
      : { status: 'DECLINED', declinedAt: new Date(), declineReason: declineReason?.trim() || null },
  });

  // Mark as VIEWED if it was just SENT (first open)
  if (action === 'approve' && quote.status === 'SENT') {
    // already updated above
  }

  return NextResponse.json({ data: { status: updated.status } });
}
