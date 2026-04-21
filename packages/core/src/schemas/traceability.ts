import { z } from 'zod';
import { PartConditionEnum } from './parts';

export const CreatePartLotSchema = z.object({
  partId:           z.string().min(1),
  serialNumber:     z.string().optional(),
  lotNumber:        z.string().optional(),
  batchNumber:      z.string().optional(),
  mfgDate:          z.coerce.date().optional(),
  expirationDate:   z.coerce.date().optional(),
  revision:         z.string().optional(),
  qtyOnHand:        z.coerce.number().int().min(0).default(0),
  condition:        PartConditionEnum.default('NEW'),
  receivedPoLineId: z.string().optional(),
  cocDocUrl:        z.string().url().optional(),
  form8130Url:      z.string().url().optional(),
  notes:            z.string().optional(),
}).refine(
  (v) => !!(v.serialNumber || v.lotNumber || v.batchNumber),
  { message: 'At least one of serialNumber, lotNumber, or batchNumber is required for traceability' },
);

export const UpdatePartLotSchema = CreatePartLotSchema.innerType().partial().extend({
  qtyOnHand: z.coerce.number().int().min(0).optional(),
});

export type CreatePartLotInput = z.infer<typeof CreatePartLotSchema>;
export type UpdatePartLotInput = z.infer<typeof UpdatePartLotSchema>;
