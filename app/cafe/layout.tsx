'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, setCafeScope } from '@/lib/api';
import type { CafeWithMenu, Profile } from '@/lib/types';
import { Gate } from '@/components/Gate';
import { CafeContext, adminCafe } from '@/components/CafeContext';
import { CafeHeader } from './CafeHeader';

export default function CafeLayout({ children }: { children: ReactNode }) {
  return <Gate roles={['cafe_staff', 'super_admin']}>{(me) => <CafeShell me={me}>{children}</CafeShell>}</Gate>;
}

function CafeShell({ me, children }: { me: Profile; children: ReactNode }) {
  const isAdmin = me.staff!.role === 'super_admin';
  const router = useRouter();
  const [cafe, setCafe] = useState<CafeWithMenu | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const cafeId = isAdmin ? adminCafe.get() : null;
    if (isAdmin && !cafeId) {
      router.replace('/admin/cafes');
      return;
    }
    setCafeScope(cafeId);
    api.get<CafeWithMenu>('/v1/cafe').then(setCafe, (e: Error) => setError(e.message));
    return () => setCafeScope(null);
  }, [isAdmin, router]);

  if (error) return <div className="center err">{error}</div>;
  if (!cafe) return null;
  return (
    <CafeContext.Provider value={{ cafe, setCafe, isAdmin }}>
      <div className="app tv">
        <CafeHeader />
        <div className="main">{children}</div>
      </div>
    </CafeContext.Provider>
  );
}
