import type { ApiClient } from '../client';
import type { TechnicianSummary } from '../types';

export function createTechnicianEndpoints(client: ApiClient) {
  return {
    list() {
      return client
        .get<{ data: TechnicianSummary[] }>('/api/technicians')
        .then(r => r.data);
    },
  };
}
