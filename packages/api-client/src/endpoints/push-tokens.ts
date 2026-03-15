import type { ApiClient } from '../client';

export function createPushTokenEndpoints(client: ApiClient) {
  return {
    register(token: string, platform: 'ios' | 'android') {
      return client.post<{ success: boolean }>('/api/mobile/push-tokens', { token, platform });
    },

    unregister(token: string) {
      return client.delete<{ success: boolean }>(`/api/mobile/push-tokens?token=${encodeURIComponent(token)}`);
    },
  };
}
