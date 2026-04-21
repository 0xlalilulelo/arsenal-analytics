import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { getSessionUser } from '@/lib/get-org-id';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { orgId, role } = sessionUser;

    // Only managers and owners can void issued documents
    if (!['OWNER', 'MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions to void documents' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json() as { voidReason?: string };
    const voidReason = body.voidReason?.trim();
    if (!voidReason) return NextResponse.json({ error: 'voidReason is required' }, { status: 422 });

    const existing = await prisma.generatedDocument.findUnique({
      where: { id },
      select: { orgId: true, status: true, documentNumber: true, type: true },
    });

    if (!existing || existing.orgId !== orgId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    if (existing.status === 'VOID') {
      return NextResponse.json({ error: 'Document is already voided' }, { status: 409 });
    }

    const doc = await prisma.generatedDocument.update({
      where: { id },
      data: { status: 'VOID', voidedAt: new Date(), voidReason },
    });

    await prisma.auditLog.create({
      data: {
        orgId,
        entityType: 'GeneratedDocument',
        entityId:   id,
        action:     'DOCUMENT_VOIDED',
        before:     { status: existing.status },
        after:      { status: 'VOID', voidReason },
        meta:       { documentNumber: existing.documentNumber, type: existing.type },
      },
    }).catch(() => {/* non-critical */});

    return NextResponse.json({ data: doc });
  } catch (err) {
    console.error('[DOCUMENTS] Void error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
