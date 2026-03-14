import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { completedAt, form337Filed, notes, documentUrls } = body;

    const item = await prisma.complianceItem.update({
      where: { id },
      data: {
        ...(completedAt !== undefined ? { completedAt: completedAt ? new Date(completedAt) : null } : {}),
        ...(form337Filed !== undefined ? {
          form337Filed,
          form337FiledAt: form337Filed ? new Date() : null,
        } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(Array.isArray(documentUrls) ? { documentUrls } : {}),
      },
    });

    return NextResponse.json({ data: item });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await prisma.complianceItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
