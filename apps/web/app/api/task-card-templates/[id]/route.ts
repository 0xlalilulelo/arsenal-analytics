import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { getOrgId } from '@/lib/get-org-id';
import type { WorkOrderType } from '@prisma/client';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const template = await prisma.taskCardTemplate.findFirst({
      where: { id, orgId },
      include: { steps: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ data: template });
  } catch (e) {
    console.error('[TASK_CARD_TEMPLATE_GET]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.taskCardTemplate.findFirst({ where: { id, orgId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json() as {
      name?: string;
      description?: string | null;
      category?: string | null;
      workOrderType?: string | null;
    };

    const updated = await prisma.taskCardTemplate.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description?.trim() || null } : {}),
        ...(body.category !== undefined ? { category: body.category?.trim() || null } : {}),
        ...(body.workOrderType !== undefined ? { workOrderType: (body.workOrderType as WorkOrderType) || null } : {}),
      },
      include: { steps: { orderBy: { sortOrder: 'asc' } } },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error('[TASK_CARD_TEMPLATE_PATCH]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.taskCardTemplate.findFirst({ where: { id, orgId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.taskCardTemplate.delete({ where: { id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (e) {
    console.error('[TASK_CARD_TEMPLATE_DELETE]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
