import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type WorkOrderSummary = {
  id: string;
  number: string;
  type: string;
  status: string;
  customerId: string;
  customer: { name: string; accountNumber: string | null };
  aircraft: { nNumber: string; make: string; model: string };
  billingModel: string;
  estimatedTotal: number | null;
  actualTotal: number | null;
  dateOpened: string;
  estimatedClose: string | null;
  _count: { laborEntries: number; squawks: number; partRequests: number; communications: number };
};

export type WorkOrderDetail = {
  id: string;
  number: string;
  type: string;
  status: string;
  billingModel: string;
  estimatedTotal: number | null;
  actualTotal: number | null;
  nteAmount: number | null;
  depositAmount: number;
  shopSuppliesPct: number;
  dateOpened: string;
  estimatedClose: string | null;
  notes: string | null;
  internalNotes: string | null;
  customer: { id: string; name: string; email: string | null; phone: string | null; accountNumber: string | null };
  aircraft: { id: string; nNumber: string; make: string; model: string; serial: string; ttsn: number | null; engineHours: number | null };
  laborRate: { id: string; rate: number; multiplier: number };
  lineItems: Array<{ id: string; taskNumber: string; description: string; referenceDoc: string | null; estHours: number; laborRate: number; status: string; sortOrder: number }>;
  laborEntries: Array<{ id: string; date: string; hours: number; rateUsed: number; billable: boolean; description: string | null; technician: { name: string } }>;
  squawks: Array<{ id: string; description: string; isAirworthiness: boolean; status: 'PENDING_APPROVAL' | 'APPROVED' | 'DECLINED' | 'DEFERRED'; estLaborHours: number | null; estPartsTotal: number | null; estTotal: number | null; approvedBy: string | null; approvedAt: string | null; photoUrls: string[] }>;
  complianceItems: Array<{ id: string; type: string; referenceId: string; description: string; completedAt: string | null; form337Required: boolean }>;
  partRequests: Array<{ id: string; partNumber: string; description: string; qty: number; status: string; unitCost: number | null; unitBillPrice: number | null; requires8130: boolean; has8130: boolean }>;
  milestones: Array<{ id: string; title: string; pct: number; amount: number | null; invoiced: boolean; sortOrder: number }>;
  invoices: Array<{ id: string; invoiceNumber: string; total: number; status: string }>;
};

type ListResponse = { data: WorkOrderSummary[]; total: number; page: number; limit: number };

type Filters = {
  status?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
};

async function fetchWorkOrders(filters: Filters = {}): Promise<ListResponse> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.type) params.set('type', filters.type);
  if (filters.search) params.set('search', filters.search);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const res = await fetch(`/api/work-orders?${params}`);
  if (!res.ok) throw new Error('Failed to fetch work orders');
  return res.json();
}

export function useWorkOrders(filters: Filters = {}) {
  return useQuery({
    queryKey: ['work-orders', filters],
    queryFn: () => fetchWorkOrders(filters),
  });
}

export function useWorkOrderDetail(id: string) {
  return useQuery<{ data: WorkOrderDetail }>({
    queryKey: ['work-order', id],
    queryFn: async () => {
      const res = await fetch(`/api/work-orders/${id}`);
      if (!res.ok) throw new Error('Work order not found');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useUpdateWorkOrder(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/work-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update work order');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    },
  });
}

export function useSquawkApproval(workOrderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ squawkId, status, approvedBy }: { squawkId: string; status: string; approvedBy?: string }) => {
      const res = await fetch(`/api/work-orders/${workOrderId}/squawks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ squawkId, status, approvedBy }),
      });
      if (!res.ok) throw new Error('Failed to update squawk');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] });
    },
  });
}

export function useLogTime(workOrderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/work-orders/${workOrderId}/labor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to log time');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] });
    },
  });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to create work order');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    },
  });
}
