'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/Session';
import { NoAccess } from '@/components/NoAccess';

export default function Home() {
  const { state } = useSession();
  const router = useRouter();
  const role = state.status === 'ready' ? state.me.staff?.role : undefined;

  useEffect(() => {
    if (state.status === 'signedOut') router.replace('/login');
    else if (role) router.replace(role === 'super_admin' ? '/admin' : '/cafe');
  }, [state.status, role, router]);

  return state.status === 'ready' && !role ? <NoAccess /> : null;
}
