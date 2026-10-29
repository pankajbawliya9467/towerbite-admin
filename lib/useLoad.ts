'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

/**
 * GET `path` (skipped when null). Returns the data, an error message and a reload function.
 * With `pollMs`, it re-loads that often while the tab is visible (live dashboards).
 */
export function useLoad<T>(path: string | null, pollMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!path) return;
    try {
      setData(await api.get<T>(path));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [path]);

  useEffect(() => {
    setData(null);
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!pollMs) return;
    const t = setInterval(() => document.visibilityState === 'visible' && void reload(), pollMs);
    return () => clearInterval(t);
  }, [reload, pollMs]);

  return { data, error, reload };
}
