import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { getOrgId } from '@/lib/get-org-id';
import { canCheckoutTool } from '@mro/core';

const REASON_MESSAGES: Record<string, string> = {
  ALREADY_CHECKED_OUT: 'Tool is already checked out',
  OUT_OF_SERVICE:      'Tool is out of service',
  LOST:                'Tool is marked as lost',
  CALIBRATION_OVERDUE: 'Tool calibration is overdue — recalibrate before use',
};

// POST /api/tools/[id]/checkout
// Body: { technicianId, workOrderId?, dueBackAt?, conditionNote? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const body = await req.json() as {
    technicianId:   string;
    workOrderId?:   string;
    dueBackAt?:     string;
    conditionNote?: string;
  };

  if (!body.technicianId) {
    return NextResponse.json({ error: 'technicianId required' }, { status: 422 });
  }

  const tool = await prisma.tool.findFirst({ where: { id, orgId } });
  if (!tool) return NextResponse.json({ error: 'Tool not found' }, { status: 404 });

  const verdict = canCheckoutTool(tool);
  if (!verdict.ok) {
    return NextResponse.json(
      { error: REASON_MESSAGES[verdict.reason!] ?? 'Tool is not available', reason: verdict.reason },
      { status: 409 },
    );
  }

  const tech = await prisma.technician.findFirst({ where: { id: body.technicianId, orgId } });
  if (!tech) return NextResponse.json({ error: 'Technician not found' }, { status: 404 });

  if (body.workOrderId) {
    const wo = await prisma.workOrder.findFirst({ where: { id: body.workOrderId, orgId } });
    if (!wo) return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
  }

  const result = await prisma.$transaction(async tx => {
    const checkout = await tx.toolCheckout.create({
      data: {
        toolId:        id,
        technicianId:  body.technicianId,
        workOrderId:   body.workOrderId ?? null,
        dueBackAt:     body.dueBackAt ? new Date(body.dueBackAt) : null,
        conditionNote: body.conditionNote ?? null,
      },
      include: {
        technician: { select: { id: true, name: true } },
        workOrder:  { select: { id: true, number: true } },
      },
    });
    await tx.tool.update({
      where: { id },
      data: { status: 'CHECKED_OUT' },
    });
    return checkout;
  });

  await prisma.auditLog.create({
    data: {
      orgId,
      entityType: 'Tool',
      entityId:   id,
      action:     'TOOL_CHECKED_OUT',
      after: {
        checkoutId:   result.id,
        technicianId: result.technicianId,
        workOrderId:  result.workOrderId,
      },
    },
  }).catch(() => {});

  return NextResponse.json({ data: result }, { status: 201 });
}
