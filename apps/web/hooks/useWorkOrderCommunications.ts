import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface WorkOrderComm {
  id: string;
  workOrderId: string;
  subject: string;
  direction: 'INBOUND' | 'OUTBOUND';
  status: 'AWAITING_REPLY' | 'REPLIED' | 'RESOLVED' | 'INFO_ONLY';
  contactName: string | null;
  contactEmail: string | null;
  notes: string | null;
  occurredAt: string;
  createdAt: string;
  createdBy: { id: string; name: string | null } | null;
}

export interface CommsResponse {
  data: WorkOrderComm[];
  pendingCount: number;
  workOrderNumber: string;
}

export function useWorkOrderComms(workOrderId: string) {
  return useQuery<CommsResponse>({
    queryKey: ['wo-comms', workOrderId],
    queryFn: async () => {
      const res = await fetch(`/api/work-orders/${workOrderId}/communications`);
      if (!res.ok) throw new Error('Failed to load communications');
      return res.json();
    },
    enabled: !!workOrderId,
  });
}

export interface CreateCommInput {
  subject: string;
  direction: 'INBOUND' | 'OUTBOUND';
  status: 'AWAITING_REPLY' | 'REPLIED' | 'RESOLVED' | 'INFO_ONLY';
  contactName?: string;
  contactEmail?: string;
  notes?: string;
  occurredAt?: string;
}

export function useCreateComm(workOrderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCommInput) => {
      const res = await fetch(`/api/work-orders/${workOrderId}/communications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to log communication');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wo-comms', workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    },
  });
}

export function useUpdateComm(workOrderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ comId, ...data }: Partial<CreateCommInput> & { comId: string }) => {
      const res = await fetch(`/api/work-orders/${workOrderId}/communications/${comId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wo-comms', workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    },
  });
}

export function useDeleteComm(workOrderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (comId: string) => {
      const res = await fetch(`/api/work-orders/${workOrderId}/communications/${comId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wo-comms', workOrderId] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
    },
  });
}
