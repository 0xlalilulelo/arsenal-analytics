import type { Form337Payload } from './types';

interface Form337Context {
  documentNumber: string;
  issuedAt: Date;
  workOrder: { number: string; closedAt?: Date | null };
  complianceItem: {
    type: string;
    referenceId: string;
    description: string;
    form337Filed?: boolean;
    form337FiledAt?: Date | null;
    derFee?: number | null;
    stcFee?: number | null;
    completedAt?: Date | null;
  };
  aircraft: {
    nNumber: string;
    make: string;
    model: string;
    serial: string;
    year?: number | null;
  };
  customer: { name: string; address?: string | null };
  organization: {
    name: string;
    faaRepairStationNumber?: string | null;
    address?: string | null;
  };
  certifyingTechnician?: { name: string; certifications?: string[] } | null;
}

function inferWorkType(complianceType: string): 'MAJOR_REPAIR' | 'MAJOR_ALTERATION' {
  const altTypes = ['STC', 'MAJOR_ALTERATION', 'FORM_337'];
  return altTypes.includes(complianceType) ? 'MAJOR_ALTERATION' : 'MAJOR_REPAIR';
}

function inferSystemCategory(
  complianceType: string,
  description: string,
): 'AIRFRAME' | 'POWERPLANT' | 'PROPELLER' | 'RADIO' | 'OTHER' {
  const d = description.toLowerCase();
  if (d.includes('engine') || d.includes('powerplant') || d.includes('cylinder') || d.includes('magneto')) return 'POWERPLANT';
  if (d.includes('propeller') || d.includes('prop')) return 'PROPELLER';
  if (d.includes('avionics') || d.includes('radio') || d.includes('nav') || d.includes('com')) return 'RADIO';
  if (complianceType === 'STC' || complianceType === 'MAJOR_ALTERATION') return 'AIRFRAME';
  return 'AIRFRAME';
}

export function buildForm337Payload(ctx: Form337Context): Form337Payload {
  const { complianceItem: ci, aircraft: ac, customer, organization: org } = ctx;
  return {
    documentNumber:      ctx.documentNumber,
    issuedAt:            ctx.issuedAt.toISOString(),
    nNumber:             ac.nNumber,
    make:                ac.make,
    model:               ac.model,
    serial:              ac.serial,
    year:                ac.year ?? undefined,
    ownerName:           customer.name,
    ownerAddress:        customer.address ?? undefined,
    stationName:         org.name,
    stationCertNumber:   org.faaRepairStationNumber ?? undefined,
    stationAddress:      org.address ?? undefined,
    workOrderNumber:     ctx.workOrder.number,
    workType:            inferWorkType(ci.type),
    systemCategory:      inferSystemCategory(ci.type, ci.description),
    complianceType:      ci.type,
    referenceId:         ci.referenceId,
    description:         ci.description,
    completedAt:         (ci.completedAt ?? ctx.workOrder.closedAt ?? ctx.issuedAt).toISOString(),
    derFee:              ci.derFee ?? undefined,
    stcFee:              ci.stcFee ?? undefined,
    certifyingTechnician: ctx.certifyingTechnician?.name,
    mechanicCertNumber:  ctx.certifyingTechnician?.certifications?.[0],
  };
}
