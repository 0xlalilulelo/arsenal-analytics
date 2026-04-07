import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { getSessionUser } from '@/lib/get-org-id';
import { hasRole } from '@/lib/rbac';
import type { CommDirection, CommStatus } from '@prisma/client';

type Params = { params: Promise<{ id: string; comId: string }> };

const VALID_DIRECTIONS = new Set<string>(['INBOUND', 'OUTBOUND']);
const VALID_STATUSES = new Set<string>(['AWAITING_REPLY', 'REPLIED', 'RESOLVED', 'INFO_ONLY']);
const NOTES_MAX_LENGTH = 2000;

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: workOrderId, comId } = await params;
    const body = await request.json();
    const { subject, direction, status, contactName, contactEmail, notes, occurredAt } = body;

    // Verify ownership via org
    const existing = await prisma.workOrderCommunication.findUnique({
      where: { id: comId },
      select: { id: true, orgId: true, workOrderId: true },
    });
    if (!existing || existing.orgId !== user.orgId || existing.workOrderId !== workOrderId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Validate changed fields
    if (direction && !VALID_DIRECTIONS.has(direction)) {
      return NextResponse.json({ error: 'Invalid direction' }, { status: 422 });
    }
    if (status && !VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 422 });
    }
    if (notes && notes.length > NOTES_MAX_LENGTH) {
      return NextResponse.json({ error: `Notes must be ${NOTES_MAX_LENGTH} characters or fewer` }, { status: 422 });
    }

    const updated = await prisma.workOrderCommunication.update({
      where: { id: comId },
      data: {
        ...(subject !== undefined ? { subject: subject.trim() } : {}),
        ...(direction !== undefined ? { direction: direction as CommDirection } : {}),
        ...(status !== undefined ? { status: status as CommStatus } : {}),
        ...(contactName !== undefined ? { contactName: contactName?.trim() || null } : {}),
        ...(contactEmail !== undefined ? { contactEmail: contactEmail?.trim() || null } : {}),
        ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
        ...(occurredAt !== undefined ? { occurredAt: new Date(occurredAt) } : {}),
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error('[COMMS PATCH]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser();
    if (!user || !hasRole(user.role, 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: workOrderId, comId } = await params;

    const existing = await prisma.workOrderCommunication.findUnique({
      where: { id: comId },
      select: { id: true, orgId: true, workOrderId: true },
    });
    if (!existing || existing.orgId !== user.orgId || existing.workOrderId !== workOrderId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.workOrderCommunication.delete({ where: { id: comId } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (e) {
    console.error('[COMMS DELETE]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
