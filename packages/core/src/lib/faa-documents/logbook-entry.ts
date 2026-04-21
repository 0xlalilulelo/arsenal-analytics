import type { LogbookEntryPayload } from './types';

interface LogbookEntryContext {
  documentNumber: string;
  issuedAt: Date;
  workOrder: { number: string; closedAt?: Date | null };
  aircraft: { nNumber: string; make: string; model: string; serial: string; ttsn?: number | null };
  organization: { name: string; faaRepairStationNumber?: string | null };
  description: string;
  hoursLabored: number;
  technician?: { name: string; certifications?: string[] } | null;
}

export function buildLogbookEntryPayload(ctx: LogbookEntryContext): LogbookEntryPayload {
  const { workOrder: wo, aircraft: ac, organization: org } = ctx;
  return {
    documentNumber:    ctx.documentNumber,
    issuedAt:          ctx.issuedAt.toISOString(),
    nNumber:           ac.nNumber,
    make:              ac.make,
    model:             ac.model,
    serial:            ac.serial,
    ttsn:              ac.ttsn ?? undefined,
    workOrderNumber:   wo.number,
    dateCompleted:     (wo.closedAt ?? ctx.issuedAt).toISOString(),
    description:       ctx.description,
    hoursLabored:      ctx.hoursLabored,
    technicianName:    ctx.technician?.name,
    certifications:    ctx.technician?.certifications,
    stationName:       org.name,
    stationCertNumber: org.faaRepairStationNumber ?? undefined,
  };
}
