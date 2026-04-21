import { z } from 'zod';

export const DocumentTypeEnum = z.enum([
  'FORM_337',
  'CERT_8130_3',
  'MAINT_RELEASE',
  'LOGBOOK_ENTRY',
  'PARTS_TAG',
]);

export const DocumentStatusEnum = z.enum(['DRAFT', 'ISSUED', 'VOID']);

export const GenerateDocumentSchema = z.object({
  type:             DocumentTypeEnum,
  workOrderId:      z.string().optional(),
  complianceItemId: z.string().optional(),
  partRequestId:    z.string().optional(),
  // Free-form payload validated per-type by the renderer.
  payloadJson:      z.record(z.unknown()),
  signatureImageUrl: z.string().url().optional(),
}).refine(
  (v) => !!(v.workOrderId || v.complianceItemId || v.partRequestId),
  { message: 'At least one of workOrderId, complianceItemId, or partRequestId is required' },
);

export const VoidDocumentSchema = z.object({
  voidReason: z.string().min(1, 'A reason is required to void a document').max(500),
});

export type GenerateDocumentInput = z.infer<typeof GenerateDocumentSchema>;
export type VoidDocumentInput = z.infer<typeof VoidDocumentSchema>;
