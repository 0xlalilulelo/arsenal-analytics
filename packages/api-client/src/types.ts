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
  revenueChange: number;
  activeWorkOrders: number;
  aogActive: number;
  arOutstanding: number;
  wipValue: number;
  laborUtilizationPct: number;
  partsMarginPct: number;
  techsActiveToday: number;
  woByType: Record<string, number>;
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

export interface WorkOrderDetail extends WorkOrderSummary {
  notes: string | null;
  internalNotes: string | null;
  shopSuppliesPct: number;
  nteAmount: number | null;
  actualTotal: number | null;
  lineItems: WorkOrderLineItem[];
  squawks: Squawk[];
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
}

export interface Squawk {
  id: string;
  description: string;
  status: string;
  isAirworthiness: boolean;
  estLaborHours: number | null;
  estPartsTotal: number | null;
  estTotal: number | null;
  photoUrls: string[];
  createdAt: string;
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
  active: boolean;
}
