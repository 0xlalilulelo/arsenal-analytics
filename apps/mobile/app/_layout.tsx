import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { queryClient } from '@/lib/query-client';
import { getToken, getStoredUser, type StoredUser } from '@/lib/auth';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      const token = await getToken();
      if (!token) {
        router.replace('/(auth)/sign-in');
      } else {
        router.replace('/(tabs)/');
      }
      setReady(true);
    }
    bootstrap();
  }, []);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
