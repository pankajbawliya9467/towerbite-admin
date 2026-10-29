'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gate } from '@/components/Gate';
import { Logo } from '@/components/Logo';
import { Icon } from '@/components/Icon';
import { useSession } from '@/components/Session';

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/locations', label: 'Locations' },
  { href: '/admin/cafes', label: 'Cafes' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/staff', label: 'Staff' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/users', label: 'Users' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { logout } = useSession();
  return (
    <Gate roles={['super_admin']}>
      {(me) => (
        <>
          <header className="topbar">
            <Link href="/admin"><Logo /></Link>
            <nav className="nav">
              {NAV.map((n) => <Link key={n.href} href={n.href} className={path === n.href ? 'on' : undefined}>{n.label}</Link>)}
            </nav>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
              <span className="small" style={{ fontWeight: 500 }}>{me.staff!.name || me.email}</span>
              <button className="iconbtn" onClick={logout} title="Sign out" aria-label="Sign out"><Icon name="logout" /></button>
            </div>
          </header>
          {children}
        </>
      )}
    </Gate>
  );
}
