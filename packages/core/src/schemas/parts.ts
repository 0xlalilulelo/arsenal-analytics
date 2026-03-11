import { z } from 'zod';

export const PartConditionEnum = z.enum(['NEW', 'OH', 'SV', 'AR']);
export const POStatusEnum = z.enum(['DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'ON_ORDER', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED']);

export const CreatePurchaseOrderSchema = z.object({
  vendor:       z.string().min(1, 'Vendor is required'),
  workOrderId:  z.string().optional(),
  expedited:    z.boolean().default(false),
  priority:     z.enum(['AOG', 'ROUTINE', 'DEFERRED']).default('ROUTINE'),
  expectedDate: z.coerce.date().optional(),
  shippingCost: z.coerce.number().min(0).default(0),
  notes:        z.string().optional(),
  lineItems: z.array(z.object({
    partNumber:   z.string().min(1),
    description:  z.string().min(1),
    qty:          z.coerce.number().int().positive(),
    unitCost:     z.coerce.number().positive(),
    condition:    PartConditionEnum.default('NEW'),
    requires8130: z.boolean().default(false),
  })).min(1),
});

export type CreatePurchaseOrderInput = z.infer<typeof CreatePurchaseOrderSchema>;
