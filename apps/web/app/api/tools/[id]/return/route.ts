import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { getOrgId } from '@/lib/get-org-id';
import { statusAfterReturn } from '@mro/core';

// POST /api/tools/[id]/return
// Body: { conditionNote? }
// Resolves the active checkout and flips status back to AVAILABLE
// (or CALIBRATION_DUE if the tool's calibration expired while checked out).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => ({})) as { conditionNote?: string };

  const tool = await prisma.tool.findFirst({ where: { id, orgId } });
  if (!tool) return NextResponse.json({ error: 'Tool not found' }, { status: 404 });

  const active = await prisma.toolCheckout.findFirst({
    where: { toolId: id, returnedAt: null },
    orderBy: { checkedOutAt: 'desc' },
  });
  if (!active) return NextResponse.json({ error: 'No active checkout' }, { status: 409 });

  const nextStatus = statusAfterReturn(tool);

  const result = await prisma.$transaction(async tx => {
    const checkout = await tx.toolCheckout.update({
      where: { id: active.id },
      data: {
        returnedAt:    new Date(),
        ...(body.conditionNote ? { conditionNote: body.conditionNote } : {}),
      },
    });
    await tx.tool.update({
      where: { id },
      data: { status: nextStatus },
    });
    return checkout;
  });

  await prisma.auditLog.create({
    data: {
      orgId,
      entityType: 'Tool',
      entityId:   id,
      action:     'TOOL_RETURNED',
      after: {
        checkoutId: result.id,
        newStatus:  nextStatus,
      },
    },
  }).catch(() => {});

  return NextResponse.json({ data: { checkout: result, newStatus: nextStatus } });
}
