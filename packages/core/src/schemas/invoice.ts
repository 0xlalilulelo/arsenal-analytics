import { z } from 'zod';

export const InvoiceStatusEnum = z.enum(['DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'PAID', 'OVERDUE', 'VOID']);
export const PaymentMethodEnum = z.enum(['CHECK', 'ACH', 'CREDIT_CARD', 'CASH', 'WIRE', 'STRIPE']);
export const InvoiceLineCategoryEnum = z.enum(['LABOR', 'PARTS', 'SHOP_SUPPLIES', 'FREIGHT', 'HANDLING', 'SUBCONTRACT', 'OTHER']);

export const CreateInvoiceSchema = z.object({
  customerId:   z.string().min(1),
  workOrderId:  z.string().optional(),
  milestoneId:  z.string().optional(),
  dueDate:      z.coerce.date(),
  taxRate:      z.coerce.number().min(0).max(0.25).default(0),
  isTrial:      z.boolean().default(false),
  notes:        z.string().optional(),
  lineItems: z.array(z.object({
    category:    InvoiceLineCategoryEnum,
    description: z.string().min(1),
    qty:         z.coerce.number().positive().default(1),
    unitPrice:   z.coerce.number().min(0),
    taxable:     z.boolean().default(true),
    sortOrder:   z.number().int().default(0),
  })).min(1),
});

export const RecordPaymentSchema = z.object({
  amount:    z.coerce.number().positive('Amount must be positive'),
  method:    PaymentMethodEnum,
  reference: z.string().optional(),
  memo:      z.string().optional(),
  paidAt:    z.coerce.date().default(() => new Date()),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;
