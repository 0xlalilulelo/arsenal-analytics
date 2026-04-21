import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@mro/db';
import type { DocumentType } from '@prisma/client';
import { getSessionUser } from '@/lib/get-org-id';
import { renderDocumentPdf } from '@/lib/faa-documents/render-pdf';
import {
  buildForm337Payload,
  buildCert8130Payload,
  buildMaintenanceReleasePayload,
  buildLogbookEntryPayload,
  buildPartsTagPayload,
} from '@mro/core';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function nextDocumentNumber(orgId: string, type: DocumentType): Promise<string> {
  const prefixMap: Record<DocumentType, string> = {
    FORM_337:      '337',
    CERT_8130_3:   '8130',
    MAINT_RELEASE: 'MR',
    LOGBOOK_ENTRY: 'LE',
    PARTS_TAG:     'PT',
  };
  const prefix = prefixMap[type];
  const year = new Date().getFullYear();
  const count = await prisma.generatedDocument.count({ where: { orgId, type } });
  return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
}

async function uploadPdf(buffer: Buffer, docNumber: string): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    const stub = `https://blob.vercel-storage.com/stub/faa-docs/${docNumber.replace(/\//g, '-')}.pdf`;
    console.log(`[DOC STUB] Would upload PDF → ${stub}`);
    return stub;
  }
  const { put } = await import('@vercel/blob');
  const blob = await put(
    `faa-docs/${docNumber.replace(/\//g, '-')}-${Date.now()}.pdf`,
    buffer,
    { access: 'public', contentType: 'application/pdf' },
  );
  return blob.url;
}

// ─── GET — list documents for a work order ────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const docs = await prisma.generatedDocument.findMany({
    where: { workOrderId: id },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, type: true, documentNumber: true, status: true,
      pdfUrl: true, issuedAt: true, voidedAt: true, voidReason: true,
      issuedBy: { select: { name: true } },
    },
  });
  return NextResponse.json({ data: docs });
}

// ─── POST — generate a document ───────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { orgId, userId } = sessionUser;

    const { id: workOrderId } = await params;
    const body = await request.json() as {
      type: DocumentType;
      complianceItemId?: string;
      partRequestId?: string;
      additionalNotes?: string;
    };
    const { type, complianceItemId, partRequestId, additionalNotes } = body;

    if (!type) return NextResponse.json({ error: 'type is required' }, { status: 422 });

    // Fetch the work order and all possible context in one round-trip
    const wo = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: {
        orgId: true, number: true, type: true, status: true, closedAt: true, notes: true,
        org: {
          select: { name: true, faaRepairStationNumber: true, address: true },
        },
        aircraft: {
          select: { nNumber: true, make: true, model: true, serial: true, year: true, ttsn: true },
        },
        customer: { select: { name: true, address: true } },
        complianceItems: complianceItemId
          ? { where: { id: complianceItemId } }
          : undefined,
        squawks: {
          select: { description: true, status: true },
          where: { status: 'APPROVED' },
        },
        laborEntries: {
          select: {
            hours: true,
            technician: { select: { name: true, certifications: true } },
          },
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!wo || wo.orgId !== orgId) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    // Fetch compliance item separately when needed
    const complianceItem = complianceItemId
      ? await prisma.complianceItem.findUnique({ where: { id: complianceItemId } })
      : null;

    // Fetch part request + lot when needed
    const partRequest = partRequestId
      ? await prisma.partRequest.findUnique({
          where: { id: partRequestId },
          include: { partLot: true },
        })
      : null;

    // Leading technician for sign-off (last labor entry)
    const leadTech = wo.laborEntries.length > 0
      ? wo.laborEntries[wo.laborEntries.length - 1].technician
      : null;

    const now = new Date();
    const documentNumber = await nextDocumentNumber(orgId, type);

    // ── Build typed payload ───────────────────────────────────────────────────

    let payloadJson: Record<string, unknown>;

    switch (type) {
      case 'FORM_337': {
        if (!complianceItem) {
          return NextResponse.json({ error: 'complianceItemId is required for FORM_337' }, { status: 422 });
        }
        payloadJson = buildForm337Payload({
          documentNumber,
          issuedAt:        now,
          workOrder:       { number: wo.number, closedAt: wo.closedAt },
          complianceItem,
          aircraft:        wo.aircraft,
          customer:        wo.customer,
          organization:    wo.org,
          certifyingTechnician: leadTech,
        }) as unknown as Record<string, unknown>;
        break;
      }

      case 'CERT_8130_3': {
        if (!partRequest) {
          return NextResponse.json({ error: 'partRequestId is required for CERT_8130_3' }, { status: 422 });
        }
        payloadJson = buildCert8130Payload({
          documentNumber,
          issuedAt:    now,
          partRequest: {
            partNumber:  partRequest.partNumber,
            description: partRequest.description,
            qty:         partRequest.qty,
            condition:   partRequest.condition,
          },
          partLot:     partRequest.partLot ?? null,
          workOrder:   { number: wo.number },
          aircraft:    wo.aircraft,
          organization: wo.org,
          certifyingTechnician: leadTech,
          remarks:     additionalNotes,
        }) as unknown as Record<string, unknown>;
        break;
      }

      case 'MAINT_RELEASE': {
        payloadJson = buildMaintenanceReleasePayload({
          documentNumber,
          issuedAt:     now,
          workOrder:    { number: wo.number, type: wo.type, closedAt: wo.closedAt, notes: wo.notes },
          aircraft:     wo.aircraft,
          organization: wo.org,
          squawks:      wo.squawks.map(s => ({ description: s.description })),
          laborEntries: wo.laborEntries,
        }) as unknown as Record<string, unknown>;
        break;
      }

      case 'LOGBOOK_ENTRY': {
        payloadJson = buildLogbookEntryPayload({
          documentNumber,
          issuedAt:     now,
          workOrder:    { number: wo.number, closedAt: wo.closedAt },
          aircraft:     { ...wo.aircraft, ttsn: wo.aircraft.ttsn ?? null },
          organization: wo.org,
          description:  additionalNotes ?? wo.notes ?? 'See work order for details.',
          hoursLabored: wo.laborEntries.reduce((s, e) => s + e.hours, 0),
          technician:   leadTech,
        }) as unknown as Record<string, unknown>;
        break;
      }

      case 'PARTS_TAG': {
        if (!partRequest) {
          return NextResponse.json({ error: 'partRequestId is required for PARTS_TAG' }, { status: 422 });
        }
        payloadJson = buildPartsTagPayload({
          documentNumber,
          issuedAt:     now,
          partRequest:  {
            partNumber:  partRequest.partNumber,
            description: partRequest.description,
            qty:         partRequest.qty,
            condition:   partRequest.condition,
          },
          partLot:     partRequest.partLot ?? null,
          workOrder:   { number: wo.number },
          organization: wo.org,
          taggedBy:    leadTech?.name,
          notes:       additionalNotes,
        }) as unknown as Record<string, unknown>;
        break;
      }

      default:
        return NextResponse.json({ error: `Unsupported document type: ${type}` }, { status: 422 });
    }

    // ── Render PDF ────────────────────────────────────────────────────────────
    const pdfBuffer = await renderDocumentPdf(type, payloadJson);
    const pdfUrl = await uploadPdf(pdfBuffer, documentNumber);

    // ── Persist document record ───────────────────────────────────────────────
    const doc = await prisma.generatedDocument.create({
      data: {
        orgId,
        type,
        workOrderId,
        complianceItemId: complianceItemId ?? null,
        partRequestId:    partRequestId ?? null,
        documentNumber,
        status:           'ISSUED',
        pdfUrl,
        // Prisma accepts plain objects for Json fields
        payloadJson:      payloadJson as object,
        issuedAt:         now,
        issuedByUserId:   userId || null,
      },
    });

    // ── Audit log ─────────────────────────────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        orgId,
        entityType: 'GeneratedDocument',
        entityId:   doc.id,
        action:     'DOCUMENT_ISSUED',
        after:      { documentNumber, type, pdfUrl },
      },
    }).catch(() => {/* non-critical */});

    return NextResponse.json({ data: doc }, { status: 201 });
  } catch (err) {
    console.error('[DOCUMENTS] Generate error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
