import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { sendPushToUsers } from '@/lib/push-notify';

// GET|POST /api/cron/cert-expiry
// Daily pass that:
//  1. Flips TechnicianCertification.status to EXPIRED where expiresAt <= now.
//  2. Sends push notifications at 60d, 30d, and 7d warn windows to the
//     technician's linked userId and their org managers/owners.
async function handle(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  // ── 1. Flip expired certs ─────────────────────────────────────────────────
  const flipped = await prisma.technicianCertification.updateMany({
    where: {
      status:    'ACTIVE',
      expiresAt: { lte: now },
    },
    data: { status: 'EXPIRED' },
  });

  // ── 2. Notify approaching expiry (60 / 30 / 7 days) ──────────────────────
  const WARN_WINDOWS = [
    { days: 7,  label: '7 days' },
    { days: 30, label: '30 days' },
    { days: 60, label: '60 days' },
  ];

  let notified = 0;

  for (const { days, label } of WARN_WINDOWS) {
    const from = new Date(now);
    from.setDate(from.getDate() + days - 1); // within ±1-day band around the threshold
    const to   = new Date(now);
    to.setDate(to.getDate() + days);

    const expiring = await prisma.technicianCertification.findMany({
      where: {
        status:    'ACTIVE',
        expiresAt: { gte: from, lt: to },
      },
      include: {
        certification: { select: { code: true, name: true } },
        technician: {
          select: {
            name: true,
            orgId: true,
            userId: true,
          },
        },
      },
    });

    for (const tc of expiring) {
      const orgId = tc.technician.orgId;
      const managers = await prisma.user.findMany({
        where: { orgId, role: { in: ['OWNER', 'MANAGER'] } },
        select: { id: true },
      });

      const targetIds = Array.from(
        new Set([
          ...managers.map(m => m.id),
          ...(tc.technician.userId ? [tc.technician.userId] : []),
        ]),
      );

      if (!targetIds.length) continue;

      await sendPushToUsers(targetIds, {
        title: `Certification expiring in ${label}`,
        body:  `${tc.technician.name} — ${tc.certification.code} (${tc.certification.name})`,
        data:  {
          type:           'CERT_EXPIRY',
          tcId:           tc.id,
          certCode:       tc.certification.code,
          technicianName: tc.technician.name,
          daysWindow:     days,
        },
      });

      notified++;
    }
  }

  return NextResponse.json({
    data: { flippedToExpired: flipped.count, notificationsSent: notified },
  });
}

export async function POST(req: NextRequest) { return handle(req); }
export async function GET(req: NextRequest)  { return handle(req); }
