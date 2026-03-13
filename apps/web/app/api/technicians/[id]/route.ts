import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, certifications, billRate, costRate } = body;

    const technician = await prisma.technician.update({
      where: { id },
      data: {
        ...(name?.trim() ? { name: name.trim() } : {}),
        ...(Array.isArray(certifications) ? { certifications } : {}),
        ...(typeof billRate === 'number' && billRate > 0 ? { billRate } : {}),
        ...(typeof costRate === 'number' && costRate >= 0 ? { costRate } : {}),
      },
      select: { id: true, name: true, certifications: true, billRate: true, costRate: true },
    });

    return NextResponse.json({ data: technician });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
