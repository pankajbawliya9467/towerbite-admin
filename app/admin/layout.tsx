'use client';
import type { ReactNode } from 'react';
import { Gate } from '@/components/Gate';
import { Mark } from '@/components/Logo';
import { Icon } from '@/components/Icon';
import { Sidebar } from '@/components/Sidebar';
import { useSession } from '@/components/Session';
import { useLoad } from '@/lib/useLoad';
import type { AdminStats } from '@/lib/types';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { logout } = useSession();
  return (
    <Gate roles={['super_admin']}>
      {(me) => (
        <div className="app">
          <AdminSidebar name={me.staff!.name || me.email || 'Admin'} onLogout={logout} />
          <div className="main">{children}</div>
        </div>
      )}
    </Gate>
  );
}

function AdminSidebar({ name, onLogout }: { name: string; onLogout: () => void }) {
  // Number of orders still being worked on, shown as a badge.
  const { data } = useLoad<AdminStats>('/v1/admin/stats', 15000);
  return (
    <Sidebar
      brand={
        <>
          <Mark />
          <span>Tower<span style={{ color: '#FDBA74' }}>Bites</span> <small>ADMIN</small></span>
        </>
      }
      nav={[
        { href: '/admin', label: 'Dashboard', icon: 'grid' },
        { href: '/admin/orders', label: 'Orders', icon: 'receipt', badge: data?.activeOrders },
        { href: '/admin/locations', label: 'Locations', icon: 'building' },
        { href: '/admin/cafes', label: 'Cafes', icon: 'coffee' },
        { href: '/admin/products', label: 'Products', icon: 'box' },
        { href: '/admin/staff', label: 'Staff', icon: 'team' },
        { href: '/admin/users', label: 'Users', icon: 'user' },
      ]}
      footer={
        <>
          <span className="side-avatar">{name.charAt(0).toUpperCase()}</span>
          <span className="side-who"><b>{name}</b><small>Super admin</small></span>
          <button className="side-out" onClick={onLogout} title="Sign out" aria-label="Sign out"><Icon name="logout" size={18} /></button>
        </>
      }
    />
  );
}
