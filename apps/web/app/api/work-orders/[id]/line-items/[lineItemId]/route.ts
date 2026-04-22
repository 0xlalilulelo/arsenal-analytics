import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import type { LineItemStatus, Prisma } from '@prisma/client';
import { getOrgId, getSessionUser } from '@/lib/get-org-id';
import { canTechnicianWorkTask, type TaskRequirement } from '@mro/core';
import { hasRole } from '@/lib/rbac';

type Params = { params: Promise<{ id: string; lineItemId: string }> };

const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETE', 'AWAITING_INSPECTION', 'SIGNED_OFF'];

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id, lineItemId } = await params;
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as {
      status?: string;
      technicianId?: string | null;
    };
    const { status, technicianId } = body;

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 422 },
      );
    }

    const lineItem = await prisma.workOrderLineItem.findFirst({
      where: { id: lineItemId, workOrderId: id },
      include: { workOrder: { select: { orgId: true, type: true } } },
    });
    if (!lineItem) {
      return NextResponse.json({ error: 'Line item not found' }, { status: 404 });
    }
    if (lineItem.workOrder.orgId !== orgId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Certification gate: only runs when a technicianId is being set.
    if (technicianId && technicianId !== lineItem.technicianId) {
      const tech = await prisma.technician.findFirst({ where: { id: technicianId, orgId } });
      if (!tech) return NextResponse.json({ error: 'Technician not found' }, { status: 404 });

      // Find cert requirements matching this line item (by WO type or task pattern).
      const reqs = await prisma.taskCertificationRequirement.findMany({
        where: {
          orgId,
          required: true,
          OR: [
            { workOrderType: lineItem.workOrder.type },
            // Simple substring match on taskPattern against description/taskNumber.
            ...(lineItem.description
              ? [{ taskPattern: { not: null } }]
              : []),
          ],
        },
        include: { certification: { select: { id: true, code: true, name: true } } },
      });

      // Narrow to task-pattern matches (case-insensitive substring).
      const applicable: TaskRequirement[] = reqs
        .filter(r => {
          if (r.workOrderType === lineItem.workOrder.type) return true;
          if (r.taskPattern) {
            const pat = r.taskPattern.toLowerCase();
            return (
              lineItem.description.toLowerCase().includes(pat) ||
              lineItem.taskNumber.toLowerCase().includes(pat)
            );
          }
          return false;
        })
        .map(r => ({
          certificationId: r.certificationId,
          code: r.certification.code,
          name: r.certification.name,
        }));

      if (applicable.length > 0) {
        // Load the technician's active certs.
        const techCerts = await prisma.technicianCertification.findMany({
          where: { technicianId, status: 'ACTIVE' },
          include: { certification: { select: { code: true, name: true } } },
        });

        const verdict = canTechnicianWorkTask(
          techCerts.map(tc => ({
            id:              tc.id,
            certificationId: tc.certificationId,
            code:            tc.certification.code,
            name:            tc.certification.name,
            status:          tc.status as 'ACTIVE',
            expiresAt:       tc.expiresAt,
          })),
          applicable,
        );

        if (!verdict.ok) {
          // Managers and owners can override the cert gate.
          const caller = await getSessionUser();
          if (!hasRole(caller?.role, 'MANAGER')) {
            return NextResponse.json(
              {
                error: `Technician is missing required certifications: ${verdict.missing.map(m => m.code).join(', ')}`,
                missing: verdict.missing,
              },
              { status: 403 },
            );
          }
        }
      }
    }

    const updateData: Prisma.WorkOrderLineItemUncheckedUpdateInput = {
      ...(status ? { status: status as LineItemStatus } : {}),
      ...(status === 'COMPLETE' || status === 'SIGNED_OFF'
        ? { completedAt: lineItem.completedAt ?? new Date() }
        : {}),
      ...(technicianId !== undefined ? { technicianId } : {}),
    };

    const updated = await prisma.workOrderLineItem.update({
      where: { id: lineItemId },
      data:  updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error('[LINE_ITEM_PATCH]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: Params,
) {
  try {
    const { id, lineItemId } = await params;
    const lineItem = await prisma.workOrderLineItem.findFirst({
      where: { id: lineItemId, workOrderId: id },
    });
    if (!lineItem) {
      return NextResponse.json({ error: 'Line item not found' }, { status: 404 });
    }

    await prisma.workOrderLineItem.delete({ where: { id: lineItemId } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (e) {
    console.error('[LINE_ITEM_DELETE]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
