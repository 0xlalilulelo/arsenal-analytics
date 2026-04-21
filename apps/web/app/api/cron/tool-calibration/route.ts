import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { sendPushToUsers } from '@/lib/push-notify';

// GET|POST /api/cron/tool-calibration
// Daily pass that flips tools with expired calibration into CALIBRATION_DUE
// and notifies owners + managers via Expo push.
//
// Selection: calibrationRequired = true, nextCalibrationDue <= now,
// status in (AVAILABLE, CHECKED_OUT). We don't override OUT_OF_SERVICE / LOST.
// CHECKED_OUT tools keep CHECKED_OUT here — they'll transition to CALIBRATION_DUE
// when returned (handled by statusAfterReturn).
async function handle(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const dueTools = await prisma.tool.findMany({
    where: {
      calibrationRequired: true,
      nextCalibrationDue:  { lte: now },
      status:              { in: ['AVAILABLE', 'CHECKED_OUT'] },
    },
    select: {
      id: true, orgId: true, assetTag: true, name: true, status: true,
      ownerTechnicianId: true, nextCalibrationDue: true,
    },
  });

  const flippedIds: string[] = [];
  for (const tool of dueTools) {
    if (tool.status === 'AVAILABLE') {
      await prisma.tool.update({
        where: { id: tool.id },
        data:  { status: 'CALIBRATION_DUE' },
      });
      flippedIds.push(tool.id);
    }
  }

  // Notify once per org per run — group tools by orgId, notify managers + owners
  // and tool owners.
  const toolsByOrg = new Map<string, typeof dueTools>();
  for (const t of dueTools) {
    const arr = toolsByOrg.get(t.orgId) ?? [];
    arr.push(t);
    toolsByOrg.set(t.orgId, arr);
  }

  for (const [orgId, tools] of toolsByOrg) {
    const managers = await prisma.user.findMany({
      where: { orgId, role: { in: ['OWNER', 'MANAGER'] } },
      select: { id: true },
    });
    const ownerUserIds = await prisma.technician.findMany({
      where: {
        orgId,
        id:     { in: tools.map(t => t.ownerTechnicianId).filter((v): v is string => !!v) },
        userId: { not: null },
      },
      select: { userId: true },
    });

    const targetIds = Array.from(new Set([
      ...managers.map(m => m.id),
      ...ownerUserIds.map(o => o.userId!).filter(Boolean),
    ]));

    if (!targetIds.length) continue;

    const first = tools[0];
    const headline = tools.length === 1
      ? `${first.assetTag} — ${first.name} calibration is due`
      : `${tools.length} tools need recalibration`;

    await sendPushToUsers(targetIds, {
      title: 'Calibration due',
      body:  headline,
      data:  { type: 'TOOL_CALIBRATION_DUE', toolIds: tools.map(t => t.id) },
    });
  }

  return NextResponse.json({
    data: {
      scanned: dueTools.length,
      flipped: flippedIds.length,
      notifiedOrgs: toolsByOrg.size,
    },
  });
}

export async function POST(req: NextRequest) { return handle(req); }
export async function GET(req: NextRequest)  { return handle(req); }
