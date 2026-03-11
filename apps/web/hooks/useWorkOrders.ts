import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type WorkOrderSummary = {
  id: string;
  number: string;
  type: string;
  status: string;
  customer: { name: string; accountNumber: string | null };
  aircraft: { nNumber: string; make: string; model: string };
  billingModel: string;
  estimatedTotal: number | null;
  actualTotal: number | null;
  dateOpened: string;
  estimatedClose: string | null;
  _count: { laborEntries: number; squawks: number; partRequests: number };
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
