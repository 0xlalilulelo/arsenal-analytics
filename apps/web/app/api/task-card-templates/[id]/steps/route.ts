import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { getOrgId } from '@/lib/get-org-id';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: templateId } = await params;
    const template = await prisma.taskCardTemplate.findFirst({ where: { id: templateId, orgId } });
    if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json() as {
      taskNumber: string;
      description: string;
      referenceDoc?: string;
      estHours?: number;
    };

    if (!body.taskNumber?.trim() || !body.description?.trim()) {
      return NextResponse.json({ error: 'taskNumber and description are required' }, { status: 422 });
    }

    const maxSort = await prisma.taskCardTemplateStep.aggregate({
      where: { templateId },
      _max: { sortOrder: true },
    });

    const step = await prisma.taskCardTemplateStep.create({
      data: {
        templateId,
        taskNumber:  body.taskNumber.trim(),
        description: body.description.trim(),
        referenceDoc: body.referenceDoc?.trim() || null,
        estHours: body.estHours ?? 0,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json({ data: step }, { status: 201 });
  } catch (e) {
    console.error('[TASK_CARD_STEP_POST]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: templateId } = await params;
    const template = await prisma.taskCardTemplate.findFirst({ where: { id: templateId, orgId } });
    if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Full step replacement — accepts array of steps in sorted order
    const steps = await request.json() as Array<{
      id?: string;
      taskNumber: string;
      description: string;
      referenceDoc?: string;
      estHours?: number;
    }>;

    await prisma.$transaction([
      prisma.taskCardTemplateStep.deleteMany({ where: { templateId } }),
      prisma.taskCardTemplateStep.createMany({
        data: steps.map((s, i) => ({
          templateId,
          taskNumber:  s.taskNumber,
          description: s.description,
          referenceDoc: s.referenceDoc ?? null,
          estHours: s.estHours ?? 0,
          sortOrder: i,
        })),
      }),
    ]);

    const updated = await prisma.taskCardTemplateStep.findMany({
      where: { templateId },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error('[TASK_CARD_STEPS_PUT]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: templateId } = await params;
    const template = await prisma.taskCardTemplate.findFirst({ where: { id: templateId, orgId } });
    if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { searchParams } = new URL(_req.url);
    const stepId = searchParams.get('stepId');
    if (!stepId) return NextResponse.json({ error: 'stepId query param required' }, { status: 422 });

    await prisma.taskCardTemplateStep.delete({ where: { id: stepId } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (e) {
    console.error('[TASK_CARD_STEP_DELETE]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
