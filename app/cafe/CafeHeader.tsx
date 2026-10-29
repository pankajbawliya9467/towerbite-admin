'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { clock } from '@/lib/format';
import type { CafeWithMenu } from '@/lib/types';
import { useCafe } from '@/components/CafeContext';
import { useSession } from '@/components/Session';
import { Mark } from '@/components/Logo';
import { Icon } from '@/components/Icon';
import styles from './cafe.module.css';

const TABS = [
  { href: '/cafe', label: 'Orders' },
  { href: '/cafe/menu', label: 'Menu' },
  { href: '/cafe/history', label: 'History' },
];

export function CafeHeader() {
  const { cafe, setCafe, isAdmin } = useCafe();
  const { logout } = useSession();
  const path = usePathname();
  const [now, setNow] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(t);
  }, []);

  async function toggleAccepting() {
    setBusy(true);
    try {
      const next = await api.patch<CafeWithMenu>('/v1/cafe', { acceptingOrders: !cafe.acceptingOrders });
      setCafe({ ...cafe, ...next });
    } finally {
      setBusy(false);
    }
  }

  const toggleFullscreen = () =>
    document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();

  return (
    <header className={styles.header}>
      <div className="logo">
        <Mark />
        {cafe.name}
        <span className={styles.on}>on TowerBites</span>
      </div>
      <nav className={styles.tabs}>
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className={path === t.href ? styles.active : undefined}>{t.label}</Link>
        ))}
        {isAdmin && <Link href="/admin/cafes">Admin</Link>}
      </nav>
      <div className={styles.right}>
        <button className={`iconbtn ${styles.fullscreen}`} onClick={toggleFullscreen} title="Fullscreen (TV mode)" aria-label="Fullscreen"><Icon name="expand" /></button>
        <button className="iconbtn" onClick={logout} title="Sign out" aria-label="Sign out"><Icon name="logout" /></button>
        <button className={`badge ${cafe.acceptingOrders ? 'ok' : 'no'} ${styles.accepting}`} onClick={toggleAccepting}
          disabled={busy} title="Click to switch">
          ● {cafe.acceptingOrders ? 'Accepting' : 'Not accepting'}<span className={styles.long}> orders</span>
        </button>
        <span className={styles.clock}>{now ? clock(now) : ''}</span>
      </div>
    </header>
  );
}
