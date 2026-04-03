import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { getOrgId } from '@/lib/get-org-id';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const customerId = searchParams.get('customerId');

  const orgId = await getOrgId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const aircraft = await prisma.aircraft.findMany({
    where: {
      customer: { orgId },
      ...(customerId ? { customerId } : {}),
      ...(search ? { OR: [
        { nNumber: { contains: search, mode: 'insensitive' } },
        { make: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { serial: { contains: search, mode: 'insensitive' } },
      ]} : {}),
    },
    include: {
      customer: { select: { id: true, name: true, accountNumber: true } },
      _count: { select: { workOrders: true } },
    },
    orderBy: { nNumber: 'asc' },
  });

  return NextResponse.json({ data: aircraft });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nNumber, customerId, make, model, serial, year, ttsn, engineTtsn, propTtsn } = body;

    if (!nNumber?.trim() || !customerId || !make?.trim() || !model?.trim() || !serial?.trim()) {
      return NextResponse.json({ error: 'nNumber, customerId, make, model, and serial are required' }, { status: 422 });
    }

    const aircraft = await prisma.aircraft.create({
      data: {
        nNumber: nNumber.trim().toUpperCase(),
        customerId,
        make: make.trim(),
        model: model.trim(),
        serial: serial.trim(),
        year: year ? parseInt(year) : null,
        ttsn: ttsn !== '' && ttsn != null ? parseFloat(ttsn) : null,
        engineTtsn: engineTtsn !== '' && engineTtsn != null ? parseFloat(engineTtsn) : null,
        propTtsn: propTtsn !== '' && propTtsn != null ? parseFloat(propTtsn) : null,
      },
      include: {
        customer: { select: { id: true, name: true, accountNumber: true } },
        _count: { select: { workOrders: true } },
      },
    });

    return NextResponse.json({ data: aircraft }, { status: 201 });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'An aircraft with this N-Number already exists' }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
