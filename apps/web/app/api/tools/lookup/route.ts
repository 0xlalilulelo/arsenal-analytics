import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { getOrgId } from '@/lib/get-org-id';

// GET /api/tools/lookup?assetTag=XYZ-001
// Intended for the mobile barcode scanner. Returns the tool with its
// active checkout (if any) so the UI can pick checkout vs. return.
export async function GET(req: NextRequest) {
  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const assetTag = new URL(req.url).searchParams.get('assetTag')?.trim();
  if (!assetTag) return NextResponse.json({ error: 'assetTag required' }, { status: 422 });

  const tool = await prisma.tool.findUnique({
    where: { orgId_assetTag: { orgId, assetTag } },
    include: {
      ownerTechnician: { select: { id: true, name: true } },
      checkouts: {
        where: { returnedAt: null },
        take: 1,
        include: {
          technician: { select: { id: true, name: true } },
          workOrder:  { select: { id: true, number: true } },
        },
      },
    },
  });

  if (!tool) return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
  return NextResponse.json({ data: tool });
}
