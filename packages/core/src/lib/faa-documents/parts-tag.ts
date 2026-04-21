import type { PartsTagPayload } from './types';

interface PartsTagContext {
  documentNumber: string;
  issuedAt: Date;
  partRequest: {
    partNumber: string;
    description: string;
    qty: number;
    condition: string;
  };
  partLot?: {
    serialNumber?: string | null;
    lotNumber?: string | null;
    batchNumber?: string | null;
  } | null;
  workOrder?: { number: string } | null;
  organization: { name: string; faaRepairStationNumber?: string | null };
  taggedBy?: string;
  notes?: string;
}

export function buildPartsTagPayload(ctx: PartsTagContext): PartsTagPayload {
  const { partRequest: pr, partLot, organization: org } = ctx;
  return {
    documentNumber:  ctx.documentNumber,
    issuedAt:        ctx.issuedAt.toISOString(),
    partNumber:      pr.partNumber,
    partDescription: pr.description,
    serialNumber:    partLot?.serialNumber ?? undefined,
    lotNumber:       partLot?.lotNumber ?? undefined,
    batchNumber:     partLot?.batchNumber ?? undefined,
    condition:       pr.condition,
    quantity:        pr.qty,
    stationName:     org.name,
    stationCertNumber: org.faaRepairStationNumber ?? undefined,
    workOrderNumber: ctx.workOrder?.number,
    taggedBy:        ctx.taggedBy,
    taggedAt:        ctx.issuedAt.toISOString(),
    notes:           ctx.notes,
  };
}
