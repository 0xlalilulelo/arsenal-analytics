export interface Form337Payload {
  documentNumber: string;
  issuedAt: string;
  // Aircraft
  nNumber: string;
  make: string;
  model: string;
  serial: string;
  year?: number;
  // Owner
  ownerName: string;
  ownerAddress?: string;
  // Repair station
  stationName: string;
  stationCertNumber?: string;
  stationAddress?: string;
  // Work
  workOrderNumber: string;
  workType: 'MAJOR_REPAIR' | 'MAJOR_ALTERATION';
  systemCategory: 'AIRFRAME' | 'POWERPLANT' | 'PROPELLER' | 'RADIO' | 'OTHER';
  complianceType: string;
  referenceId: string;
  description: string;
  completedAt: string;
  derFee?: number;
  stcFee?: number;
  // Certifying
  certifyingTechnician?: string;
  mechanicCertNumber?: string;
}

export interface Cert8130Payload {
  documentNumber: string;
  issuedAt: string;
  // Part
  partNumber: string;
  partDescription: string;
  serialNumber?: string;
  lotNumber?: string;
  batchNumber?: string;
  quantity: number;
  condition: string;
  // Work context
  workOrderNumber: string;
  workDescription?: string;
  // Aircraft context (optional — part may be a stock item)
  nNumber?: string;
  make?: string;
  model?: string;
  // Station
  stationName: string;
  stationCertNumber?: string;
  stationAddress?: string;
  // Certifying
  certifyingTechnician?: string;
  mechanicCertNumber?: string;
  remarks?: string;
}

export interface MaintenanceReleasePayload {
  documentNumber: string;
  issuedAt: string;
  // Aircraft
  nNumber: string;
  make: string;
  model: string;
  serial: string;
  // Work order
  workOrderNumber: string;
  workOrderType: string;
  workDescription: string;
  squawksAddressed: Array<{ description: string; correctiveAction?: string }>;
  hoursTotal: number;
  dateCompleted: string;
  // Station
  stationName: string;
  stationCertNumber?: string;
  stationAddress?: string;
  // Technicians
  technicians: Array<{ name: string; certifications?: string[] }>;
}

export interface LogbookEntryPayload {
  documentNumber: string;
  issuedAt: string;
  // Aircraft
  nNumber: string;
  make: string;
  model: string;
  serial: string;
  ttsn?: number;
  // Work
  workOrderNumber: string;
  dateCompleted: string;
  description: string;
  hoursLabored: number;
  // Technician
  technicianName?: string;
  certifications?: string[];
  // Station
  stationName: string;
  stationCertNumber?: string;
}

export interface PartsTagPayload {
  documentNumber: string;
  issuedAt: string;
  // Part
  partNumber: string;
  partDescription: string;
  serialNumber?: string;
  lotNumber?: string;
  batchNumber?: string;
  condition: string;
  quantity: number;
  // Station
  stationName: string;
  stationCertNumber?: string;
  // Reference
  workOrderNumber?: string;
  taggedBy?: string;
  taggedAt: string;
  notes?: string;
}
