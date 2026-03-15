export { ApiClient, ApiError } from './client';
export type { TokenProvider } from './client';
export * from './types';
export { createAuthEndpoints } from './endpoints/auth';
export { createAnalyticsEndpoints } from './endpoints/analytics';
export { createWorkOrderEndpoints } from './endpoints/work-orders';
export { createPartsEndpoints } from './endpoints/parts';

import { ApiClient, type TokenProvider } from './client';
import { createAuthEndpoints } from './endpoints/auth';
import { createAnalyticsEndpoints } from './endpoints/analytics';
import { createWorkOrderEndpoints } from './endpoints/work-orders';
import { createPartsEndpoints } from './endpoints/parts';

export function createMroClient(baseUrl: string, getToken: TokenProvider) {
  const client = new ApiClient(baseUrl, getToken);
  return {
    auth: createAuthEndpoints(client),
    analytics: createAnalyticsEndpoints(client),
    workOrders: createWorkOrderEndpoints(client),
    parts: createPartsEndpoints(client),
  };
}
