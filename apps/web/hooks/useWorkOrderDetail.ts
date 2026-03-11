import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

async function fetchWorkOrder(id: string) {
  const res = await fetch(`/api/work-orders/${id}`);
  if (!res.ok) throw new Error('Work order not found');
  return res.json().then((r: { data: unknown }) => r.data);
}

export function useWorkOrderDetail(id: string) {
  return useQuery({
    queryKey: ['work-order', id],
    queryFn: () => fetchWorkOrder(id),
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
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    },
  });
}

export function useCreateLaborEntry(workOrderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/work-orders/${workOrderId}/labor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to log labor');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] });
    },
  });
}

export function useCreateSquawk(workOrderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/work-orders/${workOrderId}/squawks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create squawk');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] });
    },
  });
}

export function useApproveSquawk(workOrderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { squawkId: string; status: string; approvedBy?: string; declineReason?: string }) => {
      const res = await fetch(`/api/work-orders/${workOrderId}/squawks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update squawk');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order', workOrderId] });
    },
  });
}
