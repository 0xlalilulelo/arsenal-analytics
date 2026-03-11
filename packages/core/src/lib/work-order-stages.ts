export type WorkOrderStatus =
  | 'ESTIMATE'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'CUSTOMER_HOLD'
  | 'PARTS_ON_ORDER'
  | 'QC_REVIEW'
  | 'INVOICED'
  | 'CLOSED';

export const STAGE_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  ESTIMATE:        ['APPROVED', 'CLOSED'],
  APPROVED:        ['SCHEDULED', 'CLOSED'],
  SCHEDULED:       ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS:     ['CUSTOMER_HOLD', 'PARTS_ON_ORDER', 'QC_REVIEW', 'CLOSED'],
  CUSTOMER_HOLD:   ['IN_PROGRESS', 'CLOSED'],
  PARTS_ON_ORDER:  ['IN_PROGRESS', 'CLOSED'],
  QC_REVIEW:       ['IN_PROGRESS', 'INVOICED'],
  INVOICED:        ['CLOSED', 'IN_PROGRESS'],
  CLOSED:          [],
};

export function canTransition(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
  return (STAGE_TRANSITIONS[from] ?? []).includes(to);
}

export const STAGE_ORDER: WorkOrderStatus[] = [
  'ESTIMATE',
  'APPROVED',
  'SCHEDULED',
  'IN_PROGRESS',
  'CUSTOMER_HOLD',
  'PARTS_ON_ORDER',
  'QC_REVIEW',
  'INVOICED',
  'CLOSED',
];

export function getStageIndex(status: WorkOrderStatus): number {
  return STAGE_ORDER.indexOf(status);
}
