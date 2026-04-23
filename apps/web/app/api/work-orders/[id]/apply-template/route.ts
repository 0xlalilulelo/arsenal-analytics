import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { getOrgId } from '@/lib/get-org-id';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: workOrderId } = await params;
    const body = await request.json() as { templateId: string };
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 422 });
    }

    const [workOrder, template] = await Promise.all([
      prisma.workOrder.findFirst({
        where: { id: workOrderId, orgId },
        include: { laborRate: true },
      }),
      prisma.taskCardTemplate.findFirst({
        where: { id: templateId, orgId },
        include: { steps: { orderBy: { sortOrder: 'asc' } } },
      }),
    ]);

    if (!workOrder) return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    if (template.steps.length === 0) {
      return NextResponse.json({ error: 'Template has no steps' }, { status: 422 });
    }

    const existingMax = await prisma.workOrderLineItem.aggregate({
      where: { workOrderId },
      _max: { sortOrder: true },
    });
    const baseSort = (existingMax._max.sortOrder ?? -1) + 1;

    const created = await prisma.$transaction(
      template.steps.map((step, i) =>
        prisma.workOrderLineItem.create({
          data: {
            workOrderId,
            taskNumber:   step.taskNumber,
            description:  step.description,
            referenceDoc: step.referenceDoc,
            estHours:     step.estHours,
            laborRate:    workOrder.laborRate.rate,
            sortOrder:    baseSort + i,
          },
        }),
      ),
    );

    return NextResponse.json({ data: { applied: created.length, lineItems: created } }, { status: 201 });
  } catch (e) {
    console.error('[APPLY_TEMPLATE_POST]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
