import type { ApiClient } from '../client';
import type { MobileLoginResponse } from '../types';

export function createAuthEndpoints(client: ApiClient) {
  return {
    login(email: string, password: string) {
      return client.post<MobileLoginResponse>('/api/mobile/auth/login', { email, password });
    },
  };
}
