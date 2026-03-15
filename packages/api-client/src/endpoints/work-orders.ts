import type { ApiClient } from '../client';
import type { PaginatedResponse, WorkOrderSummary, WorkOrderDetail, WorkOrderLineItem } from '../types';

export interface WorkOrderFilters {
  status?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface LogLaborPayload {
  technicianId: string;
  lineItemId?: string;
  date: string;
  hours: number;
  rateUsed: number;
  billable?: boolean;
  description?: string;
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
      return client.get<PaginatedResponse<WorkOrderSummary>>(
        `/api/work-orders${qs ? `?${qs}` : ''}`,
      );
    },

    get(id: string) {
      return client
        .get<{ data: WorkOrderDetail }>(`/api/work-orders/${id}`)
        .then(r => r.data);
    },

    updateLineItemStatus(workOrderId: string, lineItemId: string, status: string) {
      return client
        .patch<{ data: WorkOrderLineItem }>(
          `/api/work-orders/${workOrderId}/line-items/${lineItemId}`,
          { status },
        )
        .then(r => r.data);
    },

    logLabor(workOrderId: string, payload: LogLaborPayload) {
      return client.post<{ data: { id: string } }>(
        `/api/work-orders/${workOrderId}/labor`,
        payload,
      );
    },
  };
}
