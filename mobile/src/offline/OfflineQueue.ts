/**
 * OfflineQueue — persistent operation queue backed by AsyncStorage.
 *
 * When the device is offline, mutations are serialised here.
 * When connectivity is restored, the queue is drained in FIFO order
 * with exponential back-off on failure (max 3 retries).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueuedOperation } from '../types';

const QUEUE_KEY = '@stellar/offline_queue';
const MAX_RETRIES = 3;

// ─── Persistence helpers ──────────────────────────────────────────────────────

async function readQueue(): Promise<QueuedOperation[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedOperation[];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedOperation[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Enqueue a mutation to be replayed when online. */
export async function enqueue(
  op: Omit<QueuedOperation, 'id' | 'retries' | 'createdAt'>,
): Promise<void> {
  const queue = await readQueue();
  const entry: QueuedOperation = {
    ...op,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    retries: 0,
    createdAt: new Date().toISOString(),
  };
  queue.push(entry);
  await writeQueue(queue);
}

/** Return all pending operations. */
export async function getPendingOps(): Promise<QueuedOperation[]> {
  return readQueue();
}

/** Remove a successfully replayed operation. */
export async function dequeue(id: string): Promise<void> {
  const queue = await readQueue();
  await writeQueue(queue.filter((op) => op.id !== id));
}

/** Increment retry count; remove if over limit. */
export async function markRetry(id: string): Promise<void> {
  const queue = await readQueue();
  const updated = queue
    .map((op) => (op.id === id ? { ...op, retries: op.retries + 1 } : op))
    .filter((op) => op.retries <= MAX_RETRIES);
  await writeQueue(updated);
}

/** Clear the entire queue (e.g. on sign-out). */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

/** Count of pending operations. */
export async function pendingCount(): Promise<number> {
  const q = await readQueue();
  return q.length;
}
