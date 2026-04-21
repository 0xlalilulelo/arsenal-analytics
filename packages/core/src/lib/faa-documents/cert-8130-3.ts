import type { Cert8130Payload } from './types';

interface Cert8130Context {
  documentNumber: string;
  issuedAt: Date;
  partRequest: {
    partNumber: string;
    description: string;
    qty: number;
    condition: string;
    has8130?: boolean;
  };
  partLot?: {
    serialNumber?: string | null;
    lotNumber?: string | null;
    batchNumber?: string | null;
  } | null;
  workOrder: { number: string };
  aircraft?: { nNumber: string; make: string; model: string } | null;
  organization: {
    name: string;
    faaRepairStationNumber?: string | null;
    address?: string | null;
  };
  certifyingTechnician?: { name: string; certifications?: string[] } | null;
  remarks?: string;
}

export function buildCert8130Payload(ctx: Cert8130Context): Cert8130Payload {
  const { partRequest: pr, partLot, aircraft: ac, organization: org } = ctx;
  return {
    documentNumber:      ctx.documentNumber,
    issuedAt:            ctx.issuedAt.toISOString(),
    partNumber:          pr.partNumber,
    partDescription:     pr.description,
    serialNumber:        partLot?.serialNumber ?? undefined,
    lotNumber:           partLot?.lotNumber ?? undefined,
    batchNumber:         partLot?.batchNumber ?? undefined,
    quantity:            pr.qty,
    condition:           pr.condition,
    workOrderNumber:     ctx.workOrder.number,
    workDescription:     undefined,
    nNumber:             ac?.nNumber,
    make:                ac?.make,
    model:               ac?.model,
    stationName:         org.name,
    stationCertNumber:   org.faaRepairStationNumber ?? undefined,
    stationAddress:      org.address ?? undefined,
    certifyingTechnician: ctx.certifyingTechnician?.name,
    mechanicCertNumber:  ctx.certifyingTechnician?.certifications?.[0],
    remarks:             ctx.remarks,
  };
}
