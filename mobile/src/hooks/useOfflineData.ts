/**
 * useOfflineData<T> — offline-first data fetching hook.
 *
 * Behaviour:
 *  1. Immediately returns cached data (if any) so the screen renders instantly.
 *  2. If online, fetches fresh data in the background and updates the cache.
 *  3. If offline, serves stale cache with isStale=true so the UI can warn the user.
 *  4. Exposes refetch() for pull-to-refresh.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getCache, setCache } from '../offline/OfflineStore';
import { useNetwork } from '../offline/NetworkProvider';

interface UseOfflineDataOptions {
  ttlMs?: number;
  /** Skip the initial fetch (useful when offline-only display is acceptable). */
  skipFetch?: boolean;
}

interface UseOfflineDataResult<T> {
  data: T | null;
  isLoading: boolean;
  isStale: boolean;
  error: string | null;
  cachedAt: Date | null;
  refetch: () => Promise<void>;
}

export function useOfflineData<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: UseOfflineDataOptions = {},
): UseOfflineDataResult<T> {
  const { isOnline } = useNetwork();
  const { ttlMs, skipFetch = false } = options;

  const [data, setData]         = useState<T | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isStale, setIsStale]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<Date | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    if (!mounted.current) return;
    setLoading(true);
    setError(null);

    // 1. Try cache first
    const cached = await getCache<T>(cacheKey);
    if (cached && mounted.current) {
      setData(cached.data);
      setIsStale(cached.isStale);
      setCachedAt(cached.cachedAt);
      setLoading(false);
    }

    // 2. Fetch fresh if online and not skipped
    if (isOnline && !skipFetch) {
      try {
        const fresh = await fetcher();
        if (!mounted.current) return;
        await setCache(cacheKey, fresh, ttlMs);
        setData(fresh);
        setIsStale(false);
        setCachedAt(new Date());
      } catch (err) {
        if (!mounted.current) return;
        // Only surface error if we have no cached data to show
        if (!cached) {
          setError(err instanceof Error ? err.message : 'Failed to load data');
        }
      }
    }

    if (mounted.current) setLoading(false);
  }, [cacheKey, fetcher, isOnline, skipFetch, ttlMs]);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => { mounted.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, isOnline]);

  return { data, isLoading, isStale, error, cachedAt, refetch: load };
}
