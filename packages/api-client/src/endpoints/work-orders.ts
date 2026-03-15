import type { ApiClient } from '../client';
import type { PaginatedResponse, WorkOrderSummary, WorkOrderDetail } from '../types';

export interface WorkOrderFilters {
  status?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function createWorkOrderEndpoints(client: ApiClient) {
  return {
    list(filters: WorkOrderFilters = {}) {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.type) params.set('type', filters.type);
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const qs = params.toString();
      return client.get<PaginatedResponse<WorkOrderSummary>>(`/api/work-orders${qs ? `?${qs}` : ''}`);
    },

    get(id: string) {
      return client.get<WorkOrderDetail>(`/api/work-orders/${id}`);
    },

    updateStatus(id: string, status: string) {
      return client.patch<WorkOrderDetail>(`/api/work-orders/${id}/status`, { status });
    },

    logLabor(workOrderId: string, payload: {
      technicianId: string;
      lineItemId?: string;
      date: string;
      hours: number;
      rateUsed: number;
      billable?: boolean;
      description?: string;
    }) {
      return client.post<{ id: string }>(`/api/work-orders/${workOrderId}/labor`, payload);
    },
  };
}
