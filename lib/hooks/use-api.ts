import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';

type AnyDeps = ReadonlyArray<unknown>;

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  /** Re-run the fetcher. Returns the new value (or throws). */
  refetch: () => Promise<T>;
  /** Replace data optimistically without re-fetching. */
  mutate: (next: T | ((prev: T | null) => T)) => void;
}

/**
 * Light-weight data hook — no SWR/react-query dependency.
 * Re-runs when `deps` change. Handles unmount safely.
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: AnyDeps = []): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mounted = useRef(true);
  const fetcherRef = useRef(fetcher);

  // Keep ref in sync so `refetch` always uses the latest closure
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (mounted.current) {
        setData(result);
        setLoading(false);
      }
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      if (mounted.current) {
        setError(e);
        setLoading(false);
      }
      throw e;
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    run().catch(() => {
      // Swallow — already captured in state. ApiError surfaces via `error`.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const mutate = useCallback((next: T | ((prev: T | null) => T)) => {
    setData(prev => (typeof next === 'function' ? (next as (p: T | null) => T)(prev) : next));
  }, []);

  return { data, loading, error, refetch: run, mutate };
}

export { ApiError };
