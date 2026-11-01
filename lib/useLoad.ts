'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

/**
 * GET `path` (skipped when null). Returns the data, an error message and a reload function.
 * With `pollMs`, it re-loads that often while the tab is visible (live dashboards).
 */
/** Last data per path, so going back to a page shows it at once while it refreshes. */
const memory = new Map<string, unknown>();

export function useLoad<T>(path: string | null, pollMs?: number) {
  const [data, setData] = useState<T | null>(() => (path ? ((memory.get(path) as T) ?? null) : null));
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!path) return;
    try {
      const fresh = await api.get<T>(path);
      memory.set(path, fresh);
      setData(fresh);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [path]);

  useEffect(() => {
    setData(path ? ((memory.get(path) as T) ?? null) : null);
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!pollMs) return;
    const t = setInterval(() => document.visibilityState === 'visible' && void reload(), pollMs);
    return () => clearInterval(t);
  }, [reload, pollMs]);

  return { data, error, reload };
}
