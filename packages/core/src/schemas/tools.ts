import { z } from 'zod';

export const ToolOwnershipEnum = z.enum(['COMPANY', 'EMPLOYEE']);
export const ToolStatusEnum    = z.enum([
  'AVAILABLE',
  'CHECKED_OUT',
  'CALIBRATION_DUE',
  'OUT_OF_SERVICE',
  'LOST',
]);

export const CreateToolSchema = z.object({
  assetTag:                  z.string().min(1, 'Asset tag is required'),
  name:                      z.string().min(1, 'Name is required'),
  manufacturer:              z.string().optional(),
  modelNumber:               z.string().optional(),
  serialNumber:              z.string().optional(),
  ownership:                 ToolOwnershipEnum.default('COMPANY'),
  ownerTechnicianId:         z.string().optional(),
  calibrationRequired:       z.boolean().default(false),
  calibrationIntervalMonths: z.coerce.number().int().positive().optional(),
  lastCalibratedAt:          z.coerce.date().optional(),
  nextCalibrationDue:        z.coerce.date().optional(),
  calibrationCertUrl:        z.string().url().optional(),
  bin:                       z.string().optional(),
  notes:                     z.string().optional(),
}).refine(
  (v) => v.ownership !== 'EMPLOYEE' || !!v.ownerTechnicianId,
  { message: 'ownerTechnicianId is required when ownership is EMPLOYEE', path: ['ownerTechnicianId'] },
).refine(
  (v) => !v.calibrationRequired || !!v.calibrationIntervalMonths,
  { message: 'calibrationIntervalMonths is required when calibrationRequired=true', path: ['calibrationIntervalMonths'] },
);

export const CheckoutToolSchema = z.object({
  toolId:        z.string().min(1),
  technicianId:  z.string().min(1),
  workOrderId:   z.string().optional(),
  dueBackAt:     z.coerce.date().optional(),
  conditionNote: z.string().max(500).optional(),
});

export const ReturnToolSchema = z.object({
  checkoutId:    z.string().min(1),
  conditionNote: z.string().max(500).optional(),
});

export const LogCalibrationSchema = z.object({
  toolId:      z.string().min(1),
  performedAt: z.coerce.date(),
  performedBy: z.string().min(1),
  vendor:      z.string().optional(),
  certUrl:     z.string().url().optional(),
  nextDueAt:   z.coerce.date(),
  notes:       z.string().optional(),
});

export type CreateToolInput    = z.infer<typeof CreateToolSchema>;
export type CheckoutToolInput  = z.infer<typeof CheckoutToolSchema>;
export type ReturnToolInput    = z.infer<typeof ReturnToolSchema>;
export type LogCalibrationInput = z.infer<typeof LogCalibrationSchema>;
