import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import type { WorkOrderType } from '@prisma/client';
import { getOrgId } from '@/lib/get-org-id';

// GET /api/task-cert-requirements
export async function GET(_req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const reqs = await prisma.taskCertificationRequirement.findMany({
    where: { orgId },
    include: { certification: true },
    orderBy: [{ workOrderType: 'asc' }, { taskPattern: 'asc' }],
  });
  return NextResponse.json({ data: reqs });
}

// POST /api/task-cert-requirements
// Body: { certificationId, workOrderType?, taskPattern?, required? }
// At least one of workOrderType or taskPattern is required.
export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    certificationId: string;
    workOrderType?:  WorkOrderType;
    taskPattern?:    string;
    required?:       boolean;
  };

  if (!body.certificationId) {
    return NextResponse.json({ error: 'certificationId is required' }, { status: 422 });
  }
  if (!body.workOrderType && !body.taskPattern?.trim()) {
    return NextResponse.json(
      { error: 'At least one of workOrderType or taskPattern is required' },
      { status: 422 },
    );
  }

  const cert = await prisma.certification.findFirst({ where: { id: body.certificationId, orgId } });
  if (!cert) return NextResponse.json({ error: 'Certification not found' }, { status: 404 });

  const req2 = await prisma.taskCertificationRequirement.create({
    data: {
      orgId,
      certificationId: body.certificationId,
      workOrderType:   body.workOrderType ?? null,
      taskPattern:     body.taskPattern?.trim() ?? null,
      required:        body.required ?? true,
    },
    include: { certification: true },
  });
  return NextResponse.json({ data: req2 }, { status: 201 });
}
