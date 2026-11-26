'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Filters kept in the page URL (?status=…&page=2), so a refresh or a shared link shows the same list.
 * Changing any filter other than `page` goes back to page 1.
 */
export function useFilters<T extends Record<string, string>>(defaults: T) {
  const [f, setF] = useState<T>(defaults);
  const [ready, setReady] = useState(false);
  const base = useRef(defaults);

  useEffect(() => {
    const u = new URLSearchParams(window.location.search);
    const next = { ...base.current };
    for (const k of Object.keys(next)) {
      const v = u.get(k);
      if (v !== null) (next as Record<string, string>)[k] = v.slice(0, 200);
    }
    setF(next);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v && v !== base.current[k]) u.set(k, v);
    const s = u.toString();
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${s ? `?${s}` : ''}`);
  }, [f, ready]);

  const set = useCallback((patch: Partial<T>) => {
    setF((cur) => ({ ...cur, ...patch, ...('page' in cur && !('page' in patch) ? { page: '1' } : {}) }));
  }, []);
  const clear = useCallback((keep: (keyof T)[] = []) => {
    setF((cur) => {
      const next = { ...base.current };
      for (const k of keep) next[k] = cur[k];
      return next;
    });
  }, []);
  return { f, set, clear, ready };
}

/** Query string from filters, without empty values. */
export function toQuery(f: Record<string, string | undefined>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) u.set(k, v);
  const s = u.toString();
  return s ? `?${s}` : '';
}
