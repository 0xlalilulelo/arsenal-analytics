import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

// GET /api/technicians
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') ?? 'demo-org';

    const technicians = await prisma.technician.findMany({
      where: { orgId, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        certifications: true,
        billingRate: true,
        costRate: true,
        aogBillingRate: true,
        certificateNumber: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return NextResponse.json({ data: technicians });
  } catch (error) {
    console.error('GET /api/technicians error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
