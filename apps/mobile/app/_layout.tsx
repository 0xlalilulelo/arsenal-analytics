import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Stack, router } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import NetInfo from '@react-native-community/netinfo';
import { queryClient } from '@/lib/query-client';
import { setupQueryPersistence } from '@/lib/persist-cache';
import { replayQueue, getPendingCount } from '@/lib/offline-queue';
import { registerForPushNotifications, addNotificationListeners } from '@/lib/notifications';
import { getToken } from '@/lib/auth';
import { OfflineBanner } from '@/components/ui/OfflineBanner';

setupQueryPersistence();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    async function bootstrap() {
      const token = await getToken();
      if (!token) {
        router.replace('/(auth)/sign-in');
      } else {
        router.replace('/(tabs)/');
        // Register for push notifications after auth confirmed
        registerForPushNotifications().catch(console.error);
      }
      setReady(true);
    }
    bootstrap();
  }, []);

  // Replay queued offline mutations when connectivity is restored
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async state => {
      if (state.isConnected && state.isInternetReachable) {
        const pending = await getPendingCount();
        if (pending > 0) {
          const result = await replayQueue();
          if (result.succeeded > 0) {
            queryClient.invalidateQueries();
          }
        }
      }
    });
    return unsubscribe;
  }, []);

  // Refetch stale queries when app comes back to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        queryClient.invalidateQueries();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, []);

  // Handle incoming push notification taps
  useEffect(() => {
    const cleanup = addNotificationListeners(
      // Foreground notification received
      notification => {
        console.log('[PUSH] received:', notification.request.content.title);
      },
      // User tapped a notification
      response => {
        const data = response.notification.request.content.data as Record<string, string>;
        if (data?.type === 'AOG' && data?.workOrderId) {
          router.push(`/(tabs)/work-orders/${data.workOrderId}`);
        }
      },
    );
    return cleanup;
  }, []);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
