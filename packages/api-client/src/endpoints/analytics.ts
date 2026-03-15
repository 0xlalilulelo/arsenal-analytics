import type { ApiClient } from '../client';
import type { DashboardKpis } from '../types';

export function createAnalyticsEndpoints(client: ApiClient) {
  return {
    getDashboard() {
      return client.get<DashboardKpis>('/api/analytics');
    },
  };
}
