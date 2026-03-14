import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@mro/db';

/** GET /api/parts/low-stock — parts at or below their reorder point */
export async function GET() {
  const session = await auth();
  const orgId = (session?.user as { orgId?: string })?.orgId
    ?? (await prisma.organization.findFirst({ select: { id: true } }))?.id;

  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch all parts that have a reorderPoint set
  const parts = await prisma.part.findMany({
    where: {
      orgId,
      reorderPoint: { not: null },
    },
    orderBy: { qtyOnHand: 'asc' },
  });

  // Filter those at or below reorder point
  const lowStock = parts.filter(p => p.reorderPoint !== null && p.qtyOnHand <= p.reorderPoint);

  return NextResponse.json({
    data: lowStock,
    count: lowStock.length,
  });
}
