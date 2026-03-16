import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

// POST /api/cron/mark-overdue
// Marks SENT/VIEWED invoices as OVERDUE when dueDate has passed.
// Can be triggered by Vercel Cron, an external scheduler, or the invoices GET handler.
export async function POST(_req: NextRequest) {
  try {
    const now = new Date();

    const result = await prisma.invoice.updateMany({
      where: {
        status: { in: ['SENT', 'VIEWED'] },
        dueDate: { lt: now },
      },
      data: { status: 'OVERDUE' },
    });

    return NextResponse.json({ data: { marked: result.count } });
  } catch (e) {
    console.error('[CRON_MARK_OVERDUE]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Also expose as GET so Vercel Cron (which uses GET) can call it
export async function GET(req: NextRequest) {
  return POST(req);
}
