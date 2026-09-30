import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';

/**
 * ============================================================================
 * THE ACTIV MOBILE DESIGN KIT — data helpers
 * ============================================================================
 *
 * One way to read the backend from a screen, so every screen handles
 * loading / error / refresh the same way (RULE 1.5: the backend answers both
 * `{ success, data }` and bare objects).
 */

/** `{ success, data }` or a bare object → the payload. Never throws. */
export const unwrap = <T = any>(res: any, fallback: T): T => {
  const d = res?.data;
  if (d === undefined || d === null) return fallback;
  if (typeof d === 'object' && 'data' in d && d.data !== undefined && d.data !== null) return d.data as T;
  return (d as T) ?? fallback;
};

/** A readable message from an axios error. */
export const errorText = (err: any, fallback = 'Something went wrong. Please try again.') => {
  if (!err?.response) return 'Cannot reach the server. Check your internet connection.';
  return String(err?.response?.data?.message || err?.message || fallback);
};

/** Always an array. */
export const asArray = <T = any>(v: any): T[] => (Array.isArray(v) ? v : []);

/**
 * Load something on mount; `reload()` for pull-to-refresh / retry.
 *
 *   const { data, loading, error, reload, refreshing } =
 *     useApi(() => api.get('/members/directory'), []);
 */
export function useApi<T = any>(fetcher: () => Promise<any>, deps: any[] = [], fallback: any = null) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(true);

  const run = useCallback(async (mode: 'load' | 'refresh' = 'load') => {
    if (mode === 'refresh') setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const res = await fetcher();
      if (alive.current) setData(unwrap<T>(res, fallback));
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

/* ------------------------------------------------------------------ formatting */

/** ₹1,23,456 — a dash when there is no amount (never a guessed figure). */
export const money = (n?: number | string | null) => {
  const v = typeof n === 'string' ? Number(n) : n;
  return typeof v === 'number' && Number.isFinite(v) ? `₹${v.toLocaleString('en-IN')}` : '—';
};

/** 29 Sep 2026 */
export const shortDate = (iso?: string | Date | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  return `${d.getDate()} ${m} ${d.getFullYear()}`;
};

/** 29 Sep 2026, 3:05 PM */
export const dateTime = (iso?: string | Date | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const h = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${shortDate(d)}, ${((h + 11) % 12) + 1}:${mm} ${h >= 12 ? 'PM' : 'AM'}`;
};

/** "5 min ago", "yesterday", or a date. */
export const timeAgo = (iso?: string | Date | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  if (Number.isNaN(ms)) return '';
  const min = Math.round(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const days = Math.round(hr / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return shortDate(d);
};

export { api };
