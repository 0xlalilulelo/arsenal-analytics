import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { randomUUID } from 'crypto';

/**
 * POST /api/quotes/[id]/send
 *
 * Marks the quote as SENT and generates a portalToken for the customer-facing
 * quote approval link. Email sending is stubbed (logs to console) — Resend
 * integration is a Phase 7 task.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true, email: true } },
        aircraft: { select: { nNumber: true } },
      },
    });

    if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });

    if (!['DRAFT', 'VIEWED'].includes(quote.status)) {
      return NextResponse.json(
        { error: `Cannot send a quote in ${quote.status} status` },
        { status: 422 },
      );
    }

    // Generate a unique approval token (used in the future customer portal URL)
    const approvalToken = randomUUID();
    const approvalUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/portal/quotes/${approvalToken}`;

    const updated = await prisma.quote.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        // Store token in notes field temporarily until Invoice portalToken pattern is mirrored for quotes
        // TODO Phase 7: add Quote.portalToken field
        internalNotes: `approvalToken:${approvalToken}`,
      },
      include: {
        customer: { select: { name: true, email: true } },
        aircraft: { select: { nNumber: true } },
        lines: { orderBy: { sortOrder: 'asc' } },
      },
    });

    // Email stub — replace with Resend in Phase 7
    console.log(`[QUOTE SEND] Quote ${quote.quoteNumber} sent to ${quote.customer.email ?? '(no email)'}`);
    console.log(`[QUOTE SEND] Approval URL: ${approvalUrl}`);

    return NextResponse.json({
      data: updated,
      approvalUrl,
      emailSent: !!quote.customer.email,
      message: quote.customer.email
        ? `Quote sent to ${quote.customer.email}`
        : 'Quote marked as sent (no email on file — copy the approval link manually)',
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
