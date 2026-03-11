import { z } from 'zod';

export const WorkOrderTypeEnum = z.enum(['SCHEDULED', 'AOG', 'INSPECTION', 'UNSCHEDULED']);
export const WorkOrderStatusEnum = z.enum(['OPEN', 'IN_PROGRESS', 'AWAITING_PARTS', 'AWAITING_APPROVAL', 'COMPLETE', 'INVOICED', 'CLOSED']);
export const BillingModelEnum = z.enum(['FLAT_RATE', 'TIME_AND_MATERIALS', 'COST_PLUS', 'NOT_TO_EXCEED', 'HYBRID']);

export const CreateWorkOrderSchema = z.object({
  customerId:      z.string().min(1, 'Customer is required'),
  aircraftId:      z.string().min(1, 'Aircraft is required'),
  type:            WorkOrderTypeEnum.default('SCHEDULED'),
  billingModel:    BillingModelEnum.default('TIME_AND_MATERIALS'),
  laborRateId:     z.string().min(1, 'Labor rate is required'),
  estimatedClose:  z.coerce.date().optional(),
  nteAmount:       z.coerce.number().positive().optional(),
  shopSuppliesPct: z.coerce.number().min(0).max(0.1).default(0.035),
  notes:           z.string().optional(),
  lineItems: z.array(z.object({
    taskNumber:   z.string().min(1),
    description:  z.string().min(1, 'Description required'),
    referenceDoc: z.string().optional(),
    estHours:     z.coerce.number().min(0),
    laborRate:    z.coerce.number().positive(),
  })).min(1, 'At least one task required'),
});

export const UpdateWorkOrderStatusSchema = z.object({
  status: WorkOrderStatusEnum,
});

export const LogLaborSchema = z.object({
  technicianId: z.string().min(1),
  lineItemId:   z.string().optional(),
  date:         z.coerce.date(),
  hours:        z.coerce.number().multipleOf(0.25).min(0.25).max(24),
  rateUsed:     z.coerce.number().positive(),
  billable:     z.boolean().default(true),
  description:  z.string().optional(),
});

export const CreateSquawkSchema = z.object({
  description:    z.string().min(10, 'Description must be at least 10 characters'),
  estLaborHours:  z.coerce.number().min(0).optional(),
  estPartsTotal:  z.coerce.number().min(0).optional(),
  isAirworthiness: z.boolean().default(false),
  photoUrls:      z.array(z.string().url()).default([]),
});

export const ApproveSquawkSchema = z.object({
  approvedBy: z.string().min(1, 'Customer name/signature required'),
});

export type CreateWorkOrderInput = z.infer<typeof CreateWorkOrderSchema>;
export type LogLaborInput = z.infer<typeof LogLaborSchema>;
export type CreateSquawkInput = z.infer<typeof CreateSquawkSchema>;
