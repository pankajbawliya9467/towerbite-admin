'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { clock, rupees } from '@/lib/format';
import type { CafeWithMenu } from '@/lib/types';
import { useCafe } from '@/components/CafeContext';
import { useSession } from '@/components/Session';
import { Icon } from '@/components/Icon';
import { Sidebar } from '@/components/Sidebar';

type Today = { orders: number; delivered: number; sales: number; codCollected: number; active: number };

/** The cafe's sidebar: sections, "Accepting orders" switch, today's numbers, clock. */
export function CafeHeader() {
  const { cafe, setCafe, isAdmin } = useCafe();
  const { logout } = useSession();
  const [now, setNow] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);
  const [today, setToday] = useState<Today | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 5000);
    const load = () => api.get<Today>('/v1/cafe/stats').then(setToday, () => undefined);
    void load();
    const s = setInterval(load, 30000);
    return () => {
      clearInterval(t);
      clearInterval(s);
    };
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
    <Sidebar
      brand={
        <>
          <span className="side-emoji" style={{ background: cafe.coverColor }}>{cafe.emoji}</span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cafe.name}</span>
            <small style={{ display: 'block', letterSpacing: 0 }}>on TowerBites</small>
          </span>
        </>
      }
      nav={[
        { href: '/cafe', label: 'Live orders', icon: 'bell', badge: today?.active },
        { href: '/cafe/menu', label: 'Menu & stock', icon: 'menu' },
        { href: '/cafe/history', label: 'Order history', icon: 'history' },
        ...(isAdmin ? [{ href: '/admin/cafes', label: 'Back to admin', icon: 'back' as const }] : []),
      ]}
      footer={
        <>
          <span className="side-clock">{now ? clock(now) : ''}</span>
          <button className="side-out side-hide-sm" onClick={toggleFullscreen} title="Fullscreen (TV mode)" aria-label="Fullscreen"><Icon name="expand" size={18} /></button>
          <button className="side-out" onClick={logout} title="Sign out" aria-label="Sign out"><Icon name="logout" size={18} /></button>
        </>
      }
    >
      <button
        role="switch"
        aria-checked={cafe.acceptingOrders}
        className={`side-accept${cafe.acceptingOrders ? ' on' : ''}`}
        onClick={toggleAccepting}
        disabled={busy}
      >
        <span>{cafe.acceptingOrders ? 'Accepting orders' : 'Not accepting'}</span>
        <span className={`switch${cafe.acceptingOrders ? ' on' : ''}`} aria-hidden />
      </button>
      {today && (
        <div className="side-today">
          <div className="cap">Today</div>
          <div><span>Orders</span><b>{today.orders}</b></div>
          <div><span>Sales</span><b>{rupees(today.sales)}</b></div>
          <div><span>Cash collected</span><b>{rupees(today.codCollected)}</b></div>
        </div>
      )}
    </Sidebar>
  );
}
