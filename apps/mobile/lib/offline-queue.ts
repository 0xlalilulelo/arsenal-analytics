import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

const QUEUE_KEY = 'mro_offline_mutations';

type MutationType = 'logLabor' | 'markTaskComplete';

interface QueuedMutation {
  id: string;
  type: MutationType;
  payload: Record<string, unknown>;
  createdAt: number;
}

async function readQueue(): Promise<QueuedMutation[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as QueuedMutation[]) : [];
}

async function writeQueue(queue: QueuedMutation[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueue(type: MutationType, payload: Record<string, unknown>) {
  const queue = await readQueue();
  queue.push({ id: `${Date.now()}-${Math.random()}`, type, payload, createdAt: Date.now() });
  await writeQueue(queue);
}

export async function getPendingCount(): Promise<number> {
  const queue = await readQueue();
  return queue.length;
}

/**
 * Replay all queued mutations. Call this when the device comes back online.
 * Removes each item as it succeeds; leaves failures for the next attempt.
 */
export async function replayQueue(): Promise<{ succeeded: number; failed: number }> {
  const queue = await readQueue();
  if (!queue.length) return { succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  const remaining: QueuedMutation[] = [];

  for (const item of queue) {
    try {
      if (item.type === 'logLabor') {
        const { workOrderId, ...rest } = item.payload;
        await api.workOrders.logLabor(workOrderId as string, rest as Parameters<typeof api.workOrders.logLabor>[1]);
      } else if (item.type === 'markTaskComplete') {
        const { workOrderId, lineItemId } = item.payload;
        await api.workOrders.updateLineItemStatus(workOrderId as string, lineItemId as string, 'COMPLETE');
      }
      succeeded++;
    } catch {
      remaining.push(item);
      failed++;
    }
  }

  await writeQueue(remaining);
  return { succeeded, failed };
}
