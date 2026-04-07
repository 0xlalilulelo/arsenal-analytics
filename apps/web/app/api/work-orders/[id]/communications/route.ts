import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { getSessionUser } from '@/lib/get-org-id';
import type { CommDirection, CommStatus } from '@prisma/client';

type Params = { params: Promise<{ id: string }> };

const VALID_DIRECTIONS = new Set<string>(['INBOUND', 'OUTBOUND']);
const VALID_STATUSES = new Set<string>(['AWAITING_REPLY', 'REPLIED', 'RESOLVED', 'INFO_ONLY']);
const NOTES_MAX_LENGTH = 2000;

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: workOrderId } = await params;

  // Verify WO belongs to user's org
  const wo = await prisma.workOrder.findUnique({
    where: { id: workOrderId, orgId: user.orgId },
    select: { id: true, number: true },
  });
  if (!wo) return NextResponse.json({ error: 'Work order not found' }, { status: 404 });

  const comms = await prisma.workOrderCommunication.findMany({
    where: { workOrderId },
    orderBy: { occurredAt: 'desc' },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  const pendingCount = comms.filter(c => c.status === 'AWAITING_REPLY').length;

  return NextResponse.json({ data: comms, pendingCount, workOrderNumber: wo.number });
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: workOrderId } = await params;
    const body = await request.json();
    const { subject, direction, status, contactName, contactEmail, notes, occurredAt } = body;

    // Validation
    if (!subject?.trim()) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 422 });
    }
    if (!VALID_DIRECTIONS.has(direction)) {
      return NextResponse.json({ error: 'direction must be INBOUND or OUTBOUND' }, { status: 422 });
    }
    if (!VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 422 });
    }
    if (notes && notes.length > NOTES_MAX_LENGTH) {
      return NextResponse.json({ error: `Notes must be ${NOTES_MAX_LENGTH} characters or fewer` }, { status: 422 });
    }

    // Verify WO belongs to user's org
    const wo = await prisma.workOrder.findUnique({
      where: { id: workOrderId, orgId: user.orgId },
      select: { id: true },
    });
    if (!wo) return NextResponse.json({ error: 'Work order not found' }, { status: 404 });

    const comm = await prisma.workOrderCommunication.create({
      data: {
        orgId: user.orgId,
        workOrderId,
        subject: subject.trim(),
        direction: direction as CommDirection,
        status: status as CommStatus,
        contactName: contactName?.trim() || null,
        contactEmail: contactEmail?.trim() || null,
        notes: notes?.trim() || null,
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
        createdById: user.userId,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ data: comm }, { status: 201 });
  } catch (e) {
    console.error('[COMMS POST]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
