import type { ApiClient } from '../client';
import type { PaginatedResponse, InvoiceSummary, InvoiceDetail } from '../types';

export interface InvoiceFilters {
  status?: string;
  customerId?: string;
  page?: number;
  limit?: number;
}

export function createInvoiceEndpoints(client: ApiClient) {
  return {
    list(filters: InvoiceFilters = {}) {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.customerId) params.set('customerId', filters.customerId);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const qs = params.toString();
      return client.get<PaginatedResponse<InvoiceSummary>>(
        `/api/invoices${qs ? `?${qs}` : ''}`,
      );
    },

    get(id: string) {
      return client
        .get<{ data: InvoiceDetail }>(`/api/invoices/${id}`)
        .then(r => r.data);
    },
  };
}
