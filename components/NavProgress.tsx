'use client';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Thin orange bar at the top that starts the moment a link is clicked and finishes when the new page
 * shows, so a click never feels ignored while the next page loads.
 */
export function NavProgress() {
  const path = usePathname();
  const search = useSearchParams();
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');

  // The new page is on screen.
  useEffect(() => {
    setState((s) => (s === 'loading' ? 'done' : s));
    const t = setTimeout(() => setState((s) => (s === 'done' ? 'idle' : s)), 400);
    return () => clearTimeout(t);
  }, [path, search]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download') || !a.href) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setState('loading');
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return <div className={`nav-progress ${state}`} aria-hidden />;
}
