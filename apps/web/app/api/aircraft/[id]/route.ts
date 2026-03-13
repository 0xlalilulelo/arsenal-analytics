import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const aircraft = await prisma.aircraft.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, accountNumber: true } },
      workOrders: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true, number: true, status: true, type: true,
          description: true, estimatedTotal: true, createdAt: true, closedAt: true,
          complianceItems: { select: { id: true, type: true, referenceId: true, completedAt: true } },
        },
      },
    },
  });
  if (!aircraft) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: aircraft });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { ttsn, engineTtsn, propTtsn, make, model, year, serial } = body;

  const aircraft = await prisma.aircraft.update({
    where: { id },
    data: {
      ...(make ? { make } : {}),
      ...(model ? { model } : {}),
      ...(serial ? { serial } : {}),
      ...(year !== undefined ? { year } : {}),
      ...(ttsn !== undefined ? { ttsn } : {}),
      ...(engineTtsn !== undefined ? { engineTtsn } : {}),
      ...(propTtsn !== undefined ? { propTtsn } : {}),
    },
    include: { customer: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ data: aircraft });
}
