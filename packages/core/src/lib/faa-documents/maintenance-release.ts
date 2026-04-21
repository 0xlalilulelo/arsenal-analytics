import type { MaintenanceReleasePayload } from './types';

interface MaintenanceReleaseContext {
  documentNumber: string;
  issuedAt: Date;
  workOrder: {
    number: string;
    type: string;
    closedAt?: Date | null;
    notes?: string | null;
  };
  aircraft: { nNumber: string; make: string; model: string; serial: string };
  organization: {
    name: string;
    faaRepairStationNumber?: string | null;
    address?: string | null;
  };
  squawks: Array<{ description: string; correctiveAction?: string | null }>;
  laborEntries: Array<{ hours: number; technician: { name: string; certifications?: string[] } }>;
}

export function buildMaintenanceReleasePayload(ctx: MaintenanceReleaseContext): MaintenanceReleasePayload {
  const { workOrder: wo, aircraft: ac, organization: org } = ctx;

  const techMap = new Map<string, string[]>();
  let totalHours = 0;
  for (const le of ctx.laborEntries) {
    totalHours += le.hours;
    const existing = techMap.get(le.technician.name) ?? [];
    techMap.set(le.technician.name, le.technician.certifications?.length ? le.technician.certifications : existing);
  }

  return {
    documentNumber:  ctx.documentNumber,
    issuedAt:        ctx.issuedAt.toISOString(),
    nNumber:         ac.nNumber,
    make:            ac.make,
    model:           ac.model,
    serial:          ac.serial,
    workOrderNumber: wo.number,
    workOrderType:   wo.type,
    workDescription: wo.notes ?? 'See squawk details below.',
    squawksAddressed: ctx.squawks.map(s => ({
      description:      s.description,
      correctiveAction: s.correctiveAction ?? undefined,
    })),
    hoursTotal:     Math.round(totalHours * 10) / 10,
    dateCompleted:  (wo.closedAt ?? ctx.issuedAt).toISOString(),
    stationName:    org.name,
    stationCertNumber: org.faaRepairStationNumber ?? undefined,
    stationAddress: org.address ?? undefined,
    technicians: Array.from(techMap.entries()).map(([name, certs]) => ({
      name,
      certifications: certs.length ? certs : undefined,
    })),
  };
}
