import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

// GET /api/customers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') ?? 'demo-org';
    const search = searchParams.get('search');

    const customers = await prisma.customer.findMany({
      where: {
        orgId,
        isActive: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { accountNumber: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        _count: { select: { workOrders: true, aircraft: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: customers });
  } catch (error) {
    console.error('GET /api/customers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
