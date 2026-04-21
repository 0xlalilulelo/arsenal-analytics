import { z } from 'zod';
import { WorkOrderTypeEnum } from './work-order';

export const CertStatusEnum = z.enum(['ACTIVE', 'EXPIRED', 'REVOKED']);

export const CreateCertificationSchema = z.object({
  code:                  z.string().min(1).max(50),
  name:                  z.string().min(1).max(200),
  issuingAuthority:      z.string().max(200).optional(),
  requiresRenewal:       z.boolean().default(false),
  renewalIntervalMonths: z.coerce.number().int().positive().optional(),
}).refine(
  (v) => !v.requiresRenewal || !!v.renewalIntervalMonths,
  { message: 'renewalIntervalMonths is required when requiresRenewal=true', path: ['renewalIntervalMonths'] },
);

export const GrantTechnicianCertificationSchema = z.object({
  technicianId:    z.string().min(1),
  certificationId: z.string().min(1),
  issuedAt:        z.coerce.date(),
  expiresAt:       z.coerce.date().optional(),
  certificateUrl:  z.string().url().optional(),
});

export const UpdateTechnicianCertificationSchema = z.object({
  expiresAt:      z.coerce.date().optional(),
  certificateUrl: z.string().url().optional(),
  status:         CertStatusEnum.optional(),
});

export const CreateTaskCertificationRequirementSchema = z.object({
  taskPattern:     z.string().min(1).optional(),
  workOrderType:   WorkOrderTypeEnum.optional(),
  certificationId: z.string().min(1),
  required:        z.boolean().default(true),
}).refine(
  (v) => !!(v.taskPattern || v.workOrderType),
  { message: 'At least one of taskPattern or workOrderType is required' },
);

export type CreateCertificationInput           = z.infer<typeof CreateCertificationSchema>;
export type GrantTechnicianCertificationInput  = z.infer<typeof GrantTechnicianCertificationSchema>;
export type UpdateTechnicianCertificationInput = z.infer<typeof UpdateTechnicianCertificationSchema>;
export type CreateTaskCertificationRequirementInput =
  z.infer<typeof CreateTaskCertificationRequirementSchema>;
