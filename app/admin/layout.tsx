'use client';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Gate } from '@/components/Gate';
import { Mark } from '@/components/Logo';
import { Icon } from '@/components/Icon';
import { Sidebar, type NavItem } from '@/components/Sidebar';
import { useSession } from '@/components/Session';
import { useLoad } from '@/lib/useLoad';
import { can, PAGE_PERM } from '@/lib/perms';
import type { AdminStats, Staff } from '@/lib/types';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { logout } = useSession();
  const path = usePathname();
  return (
    <Gate roles={['super_admin']}>
      {(me) => {
        const perm = PAGE_PERM[Object.keys(PAGE_PERM).find((p) => path === p || path.startsWith(`${p}/`)) ?? ''];
        return (
          <div className="app">
            <AdminSidebar staff={me.staff!} name={me.staff!.name || me.email || 'Admin'} onLogout={logout} />
            <div className="main">
              {perm && !can(me.staff, perm) ? (
                <main className="page">
                  <div className="card empty" style={{ padding: 40 }}>
                    <Icon name="shield" size={28} />
                    <div className="h2" style={{ marginTop: 10 }}>You don't have access to this section</div>
                    <div className="small">Ask a super admin to give you access.</div>
                  </div>
                </main>
              ) : children}
            </div>
          </div>
        );
      }}
    </Gate>
  );
}

function AdminSidebar({ staff, name, onLogout }: { staff: Staff; name: string; onLogout: () => void }) {
  // Number of orders still being worked on, shown as a badge.
  const { data } = useLoad<AdminStats>(can(staff, 'reports.view') ? '/v1/admin/stats' : null, 15000);
  const all: NavItem[] = [
    { href: '/admin', label: 'Dashboard', icon: 'grid' },
    { href: '/admin/orders', label: 'Orders', icon: 'receipt', badge: data?.activeOrders },
    { href: '/admin/locations', label: 'Locations', icon: 'building' },
    { href: '/admin/cafes', label: 'Cafes', icon: 'coffee' },
    { href: '/admin/products', label: 'Products', icon: 'box' },
    { href: '/admin/categories', label: 'Categories', icon: 'layers' },
    { href: '/admin/staff', label: 'Cafe logins', icon: 'team' },
    { href: '/admin/users', label: 'Users', icon: 'user' },
    { href: '/admin/reports', label: 'Reports', icon: 'chart' },
    { href: '/admin/notifications', label: 'Notifications', icon: 'bell' },
    { href: '/admin/ai', label: 'AI settings', icon: 'bulb' },
    { href: '/admin/requests', label: 'Account requests', icon: 'trash' },
    { href: '/admin/admins', label: 'Admins', icon: 'shield' },
    { href: '/admin/account', label: 'My account', icon: 'key' },
  ];
  const nav = all.filter((n) => !PAGE_PERM[n.href] || can(staff, PAGE_PERM[n.href]));
  return (
    <Sidebar
      brand={
        <>
          <Mark />
          <span>Tower<span style={{ color: '#FDBA74' }}>Bites</span> <small>ADMIN</small></span>
        </>
      }
      nav={nav}
      footer={
        <>
          <span className="side-avatar">{name.charAt(0).toUpperCase()}</span>
          <span className="side-who"><b>{name}</b><small>{staff.isSuper ? 'Super admin' : 'Admin'}</small></span>
          <button className="side-out" onClick={onLogout} title="Sign out" aria-label="Sign out"><Icon name="logout" size={18} /></button>
        </>
      }
    />
  );
}
