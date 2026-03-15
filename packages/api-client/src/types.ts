// Paginated list response shape used by all list endpoints
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ---- Auth ----
export interface MobileLoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    orgId: string;
  };
}

// ---- Dashboard / Analytics ----
export interface DashboardKpis {
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueDelta: number;
  arTotal: number;
  agingBuckets: {
    CURRENT: number;
    '1_30': number;
    '31_60': number;
    '61_90': number;
    '90_PLUS': number;
  };
  activeWoCount: number;
  aogCount: number;
  monthlyRevenue: { month: string; revenue: number }[];
  wipValue: number;
  laborUtilizationPct: number | null;
  partsMarginPct: number | null;
  avgInvoiceAgeDays: number | null;
  techsOnJobsCount: number;
  woTypeBreakdown: Record<string, number>;
}

// ---- Work Orders ----
export interface WorkOrderSummary {
  id: string;
  number: string;
  type: string;
  status: string;
  billingModel: string;
  dateOpened: string;
  estimatedClose: string | null;
  estimatedTotal: number | null;
  customer: { name: string; accountNumber: string | null };
  aircraft: { nNumber: string; make: string; model: string };
  _count: { laborEntries: number; squawks: number; partRequests: number };
}

export interface WorkOrderLineItem {
  id: string;
  taskNumber: string;
  description: string;
  referenceDoc: string | null;
  estHours: number;
  actualHours: number;
  laborRate: number;
  status: string;
  technicianId: string | null;
  completedAt: string | null;
  sortOrder: number;
}

export interface Squawk {
  id: string;
  description: string;
  status: string;
  classification: string;
  isAirworthiness: boolean;
  estLaborHours: number | null;
  estPartsTotal: number | null;
  estTotal: number | null;
  photoUrls: string[];
  createdAt: string;
}

export interface LaborEntry {
  id: string;
  technicianId: string;
  technician: { name: string };
  lineItemId: string | null;
  date: string;
  hours: number;
  rateUsed: number;
  billable: boolean;
  description: string | null;
  clockIn: string | null;
  clockOut: string | null;
}

export interface WorkOrderDetail extends WorkOrderSummary {
  notes: string | null;
  internalNotes: string | null;
  shopSuppliesPct: number;
  nteAmount: number | null;
  actualTotal: number | null;
  aogEventId: string | null;
  lineItems: WorkOrderLineItem[];
  squawks: Squawk[];
  laborEntries: LaborEntry[];
}

// ---- Parts ----
export interface PartSummary {
  id: string;
  partNumber: string;
  description: string;
  condition: string;
  manufacturer: string | null;
  category: string | null;
  qtyOnHand: number;
  reorderPoint: number | null;
  reorderQty: number | null;
  unitCost: number;
  markupPct: number;
  bin: string | null;
}

// ---- Technicians ----
export interface TechnicianSummary {
  id: string;
  name: string;
  certifications: string[];
  billRate: number;
  costRate: number;
  active: boolean;
}

// ---- Invoices ----
export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  total: number;
  amountPaid: number;
  balance: number;
  subtotal: number;
  customer: { name: string; accountNumber: string | null };
  workOrder: { number: string } | null;
  _count: { payments: number };
}

export interface InvoiceLineItem {
  id: string;
  category: string;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
  taxable: boolean;
  sortOrder: number;
}

export interface InvoicePayment {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  memo: string | null;
  paidAt: string;
}

export interface InvoiceDetail extends InvoiceSummary {
  notes: string | null;
  taxRate: number;
  taxAmount: number;
  sentAt: string | null;
  viewedAt: string | null;
  paidAt: string | null;
  lineItems: InvoiceLineItem[];
  payments: InvoicePayment[];
}
