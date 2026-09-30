import { useCallback, useEffect, useRef, useState } from 'react';
import { errorText } from '../../ui';

/**
 * Load already-unwrapped data (services/memberApi returns payloads, not axios
 * responses — so the kit's `useApi`, which unwraps, is not used here).
 * `reload()` for retry, `refresh()` for pull-to-refresh.
 */
export function useLoad<T>(fn: () => Promise<T>, deps: any[], initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(true);

  const run = useCallback(async (mode: 'load' | 'refresh') => {
    if (mode === 'refresh') setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const v = await fn();
      if (alive.current) setData(v);
    } catch (err) {
      if (alive.current) setError(errorText(err));
    } finally {
      if (alive.current) { setLoading(false); setRefreshing(false); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    alive.current = true;
    run('load');
    return () => { alive.current = false; };
  }, [run]);

  return { data, setData, loading, refreshing, error, reload: () => run('load'), refresh: () => run('refresh') };
}

/** 403 from the paid-membership gate. */
export const isPaymentGate = (err: any) => err?.response?.status === 403;
