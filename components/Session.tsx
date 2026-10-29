'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getToken, signOut } from '@/lib/auth';
import type { Profile } from '@/lib/types';

type State = { status: 'loading' } | { status: 'signedOut' } | { status: 'ready'; me: Profile };
type Ctx = { state: State; reload: () => Promise<Profile | null>; logout: () => Promise<void> };

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const router = useRouter();

  const reload = useCallback(async () => {
    if (!(await getToken())) {
      setState({ status: 'signedOut' });
      return null;
    }
    try {
      const me = await api.get<Profile>('/v1/me');
      setState({ status: 'ready', me });
      return me;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) await signOut();
      setState({ status: 'signedOut' });
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setState({ status: 'signedOut' });
    router.replace('/login');
  }, [router]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return <SessionContext.Provider value={{ state, reload, logout }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession outside SessionProvider');
  return ctx;
}
