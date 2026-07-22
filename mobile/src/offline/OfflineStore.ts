/**
 * OfflineStore — generic key-value cache backed by AsyncStorage.
 *
 * Stores API responses locally so screens render instantly when offline.
 * Each entry carries a TTL; stale entries are served with a staleness flag
 * so the UI can show a "last updated" indicator.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORE_PREFIX = '@stellar/cache/';
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  cachedAt: number;  // epoch ms
  ttl: number;       // ms
}

export interface CacheResult<T> {
  data: T;
  isStale: boolean;
  cachedAt: Date;
}

// ─── Core ─────────────────────────────────────────────────────────────────────

export async function setCache<T>(
  key: string,
  data: T,
  ttlMs = DEFAULT_TTL_MS,
): Promise<void> {
  const entry: CacheEntry<T> = { data, cachedAt: Date.now(), ttl: ttlMs };
  await AsyncStorage.setItem(
    `${STORE_PREFIX}${key}`,
    JSON.stringify(entry),
  );
}

export async function getCache<T>(
  key: string,
): Promise<CacheResult<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(`${STORE_PREFIX}${key}`);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    const age = Date.now() - entry.cachedAt;
    return {
      data: entry.data,
      isStale: age > entry.ttl,
      cachedAt: new Date(entry.cachedAt),
    };
  } catch {
    return null;
  }
}

export async function invalidateCache(key: string): Promise<void> {
  await AsyncStorage.removeItem(`${STORE_PREFIX}${key}`);
}

export async function invalidateAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter((k) => k.startsWith(STORE_PREFIX));
  if (cacheKeys.length > 0) {
    await AsyncStorage.multiRemove(cacheKeys);
  }
}
