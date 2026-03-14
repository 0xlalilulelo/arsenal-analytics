import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { randomUUID } from 'crypto';
import { sendQuoteEmail, APP_URL } from '@/lib/email';

/**
 * POST /api/quotes/[id]/send
 *
 * Marks the quote as SENT, generates a portalToken, and emails the customer.
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

    const approvalToken = randomUUID();
    const approvalUrl = `${APP_URL}/portal/quotes/${approvalToken}`;

    const updated = await prisma.quote.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        portalToken: approvalToken,
      },
      include: {
        customer: { select: { name: true, email: true } },
        aircraft: { select: { nNumber: true } },
        lines: { orderBy: { sortOrder: 'asc' } },
      },
    });

    // Send email to customer
    let emailSent = false;
    if (quote.customer.email) {
      const result = await sendQuoteEmail({
        to: quote.customer.email,
        customerName: quote.customer.name,
        quoteNumber: quote.quoteNumber,
        total: quote.total,
        aircraftNNumber: quote.aircraft?.nNumber,
        approvalUrl,
        validDays: quote.validDays,
      });
      emailSent = result.sent;
    }

    console.log(`[QUOTE SEND] Quote ${quote.quoteNumber} — approval URL: ${approvalUrl}`);

    return NextResponse.json({
      data: updated,
      approvalUrl,
      emailSent,
      message: quote.customer.email
        ? emailSent
          ? `Quote emailed to ${quote.customer.email}`
          : `Quote marked as sent — copy the approval link (email delivery requires RESEND_API_KEY)`
        : 'Quote marked as sent (no email on file — copy the approval link manually)',
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

