import type { ApiClient } from '../client';
import type { PaginatedResponse, PartSummary } from '../types';

export interface PartFilters {
  search?: string;
  condition?: string;
  lowStock?: boolean;
  page?: number;
  limit?: number;
}

export function createPartsEndpoints(client: ApiClient) {
  return {
    list(filters: PartFilters = {}) {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.condition) params.set('condition', filters.condition);
      if (filters.lowStock) params.set('lowStock', 'true');
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const qs = params.toString();
      return client.get<PaginatedResponse<PartSummary>>(`/api/parts${qs ? `?${qs}` : ''}`);
    },

    get(id: string) {
      return client.get<PartSummary>(`/api/parts/${id}`);
    },
  };
}
