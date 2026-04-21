import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import type { ToolOwnership, ToolStatus } from '@prisma/client';
import { getOrgId } from '@/lib/get-org-id';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const tool = await prisma.tool.findFirst({
    where: { id, orgId },
    include: {
      ownerTechnician: { select: { id: true, name: true } },
      checkouts: {
        orderBy: { checkedOutAt: 'desc' },
        take: 25,
        include: {
          technician: { select: { id: true, name: true } },
          workOrder:  { select: { id: true, number: true } },
        },
      },
      calibrationEvents: {
        orderBy: { performedAt: 'desc' },
        take: 25,
      },
    },
  });

  if (!tool) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: tool });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.tool.findFirst({ where: { id, orgId } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json() as {
    name?: string;
    manufacturer?: string | null;
    modelNumber?: string | null;
    serialNumber?: string | null;
    ownership?: ToolOwnership;
    ownerTechnicianId?: string | null;
    calibrationRequired?: boolean;
    calibrationIntervalMonths?: number | null;
    bin?: string | null;
    notes?: string | null;
    status?: ToolStatus;
  };

  const updated = await prisma.tool.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.manufacturer !== undefined ? { manufacturer: body.manufacturer } : {}),
      ...(body.modelNumber !== undefined ? { modelNumber: body.modelNumber } : {}),
      ...(body.serialNumber !== undefined ? { serialNumber: body.serialNumber } : {}),
      ...(body.ownership !== undefined ? { ownership: body.ownership } : {}),
      ...(body.ownerTechnicianId !== undefined ? { ownerTechnicianId: body.ownerTechnicianId } : {}),
      ...(body.calibrationRequired !== undefined ? { calibrationRequired: body.calibrationRequired } : {}),
      ...(body.calibrationIntervalMonths !== undefined ? { calibrationIntervalMonths: body.calibrationIntervalMonths } : {}),
      ...(body.bin !== undefined ? { bin: body.bin } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    },
  });

  await prisma.auditLog.create({
    data: {
      orgId,
      entityType: 'Tool',
      entityId:   id,
      action:     'TOOL_UPDATED',
      before:     { status: existing.status },
      after:      { status: updated.status },
    },
  }).catch(() => {});

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.tool.findFirst({
    where: { id, orgId },
    include: { _count: { select: { checkouts: true } } },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const activeCheckout = await prisma.toolCheckout.findFirst({
    where: { toolId: id, returnedAt: null },
    select: { id: true },
  });
  if (activeCheckout) {
    return NextResponse.json(
      { error: 'Tool has an active checkout and cannot be deleted' },
      { status: 409 },
    );
  }

  await prisma.tool.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      orgId,
      entityType: 'Tool',
      entityId:   id,
      action:     'TOOL_DELETED',
      before:     { assetTag: existing.assetTag, name: existing.name },
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
