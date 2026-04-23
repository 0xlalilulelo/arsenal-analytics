import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { getOrgId } from '@/lib/get-org-id';
import type { WorkOrderType } from '@prisma/client';

export async function GET(_req: NextRequest) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const templates = await prisma.taskCardTemplate.findMany({
      where: { orgId },
      include: { steps: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ data: templates });
  } catch (e) {
    console.error('[TASK_CARD_TEMPLATES_GET]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as {
      name: string;
      description?: string;
      category?: string;
      workOrderType?: string;
      steps?: Array<{ taskNumber: string; description: string; referenceDoc?: string; estHours?: number; sortOrder?: number }>;
    };

    const { name, description, category, workOrderType, steps = [] } = body;
    if (!name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 422 });
    }

    const template = await prisma.taskCardTemplate.create({
      data: {
        orgId,
        name: name.trim(),
        description: description?.trim() || null,
        category: category?.trim() || null,
        workOrderType: (workOrderType as WorkOrderType) || null,
        steps: {
          create: steps.map((s, i) => ({
            taskNumber:  s.taskNumber,
            description: s.description,
            referenceDoc: s.referenceDoc ?? null,
            estHours: s.estHours ?? 0,
            sortOrder: s.sortOrder ?? i,
          })),
        },
      },
      include: { steps: { orderBy: { sortOrder: 'asc' } } },
    });

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (e) {
    console.error('[TASK_CARD_TEMPLATES_POST]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
