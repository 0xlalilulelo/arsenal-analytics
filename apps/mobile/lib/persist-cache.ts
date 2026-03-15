import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { queryClient } from './query-client';

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  throttleTime: 2000,
});

let teardown: (() => void) | undefined;

/**
 * Call once at app startup (inside QueryClientProvider).
 * Restores the cached query data from AsyncStorage so the app
 * renders stale data immediately while fetching fresh data in the bg.
 */
export function setupQueryPersistence() {
  const [unsubscribe] = persistQueryClient({
    queryClient,
    persister,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    buster: 'mro-v1',
  });
  teardown = unsubscribe;
}

export function teardownQueryPersistence() {
  teardown?.();
}
