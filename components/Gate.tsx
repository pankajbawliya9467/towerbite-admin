'use client';
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Profile, Role } from '@/lib/types';
import { useSession } from './Session';
import { NoAccess } from './NoAccess';

/** Renders children only for signed-in staff with one of the given roles. */
export function Gate({ roles, children }: { roles: Role[]; children: (me: Profile) => ReactNode }) {
  const { state } = useSession();
  const router = useRouter();
  const role = state.status === 'ready' ? state.me.staff?.role : undefined;

  useEffect(() => {
    if (state.status === 'signedOut') router.replace('/login');
    else if (role && !roles.includes(role)) router.replace(role === 'super_admin' ? '/admin' : '/cafe');
  }, [state.status, role, roles, router]);

  if (state.status !== 'ready') return null;
  if (!state.me.staff) return <NoAccess />;
  if (!roles.includes(state.me.staff.role)) return null;
  return <>{children(state.me)}</>;
}
