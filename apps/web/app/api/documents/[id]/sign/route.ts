import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import { getSessionUser } from '@/lib/get-org-id';
import { renderDocumentPdf } from '@/lib/faa-documents/render-pdf';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { orgId } = sessionUser;

    const { id } = await params;
    const body = await request.json() as {
      signatureImageUrl?: string;
      signerName?: string;
    };

    const { signatureImageUrl, signerName } = body;

    if (!signatureImageUrl) {
      return NextResponse.json({ error: 'signatureImageUrl is required' }, { status: 422 });
    }

    const doc = await prisma.generatedDocument.findUnique({
      where: { id },
      select: {
        id: true,
        orgId: true,
        status: true,
        type: true,
        documentNumber: true,
        payloadJson: true,
      },
    });

    if (!doc || doc.orgId !== orgId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    if (doc.status !== 'DRAFT') {
      return NextResponse.json(
        { error: `Document is already ${doc.status} and cannot be signed` },
        { status: 422 },
      );
    }

    const signedAt = new Date().toISOString();
    const updatedPayload = {
      ...(doc.payloadJson as Record<string, unknown>),
      signatureImageUrl,
      ...(signerName ? { certifyingTechnician: signerName, technicianName: signerName } : {}),
      issuedAt: signedAt,
    };

    // Re-render the PDF with the signature embedded
    const buffer = await renderDocumentPdf(doc.type, updatedPayload);

    // Upload re-rendered PDF
    let pdfUrl: string;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import('@vercel/blob');
      const blob = await put(
        `faa-docs/${doc.documentNumber.replace(/\//g, '-')}-signed-${Date.now()}.pdf`,
        buffer,
        { access: 'public', contentType: 'application/pdf' },
      );
      pdfUrl = blob.url;
    } else {
      pdfUrl = `/api/documents/${id}/pdf-stub`;
    }

    const updated = await prisma.generatedDocument.update({
      where: { id },
      data: {
        status: 'ISSUED',
        signatureImageUrl,
        pdfUrl,
        payloadJson: updatedPayload,
        issuedAt: new Date(signedAt),
        issuedByUserId: sessionUser.userId,
      },
    });

    prisma.auditLog.create({
      data: {
        orgId,
        entityType: 'GeneratedDocument',
        entityId: id,
        action: 'DOCUMENT_SIGNED',
        after: { documentNumber: doc.documentNumber, signerName },
      },
    }).catch(() => {});

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error('[DOCUMENT_SIGN_POST]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
