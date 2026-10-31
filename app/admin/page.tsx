'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { addressLine, rupees, STATUS, timeAgo } from '@/lib/format';
import { useLoad } from '@/lib/useLoad';
import type { AdminStats, Order } from '@/lib/types';
import { adminCafe } from '@/components/CafeContext';
import { PageHead } from '@/components/PageHead';
import { StatTile } from '@/components/StatTile';
import { Icon } from '@/components/Icon';

export default function Dashboard() {
  const { data: s, error } = useLoad<AdminStats>('/v1/admin/stats', 15000);
  const live = useLoad<Order[]>('/v1/admin/orders?limit=8', 10000);
  const router = useRouter();
  const openBoard = (id: string) => {
    adminCafe.set(id);
    router.push('/cafe');
  };
  const top = (s?.byCafe ?? []).slice(0, 6);
  const best = Math.max(1, ...top.map((c) => c.sales));
  const date = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    <main className="page">
      <PageHead title="Dashboard" sub={`${date} · all locations`}>
        <Link href="/admin/cafes" className="btn sm"><Icon name="plus" /> Add cafe</Link>
      </PageHead>
      {error && <div className="err">{error}</div>}
      <div className="stats">
        <StatTile label="Orders today" value={s?.ordersToday ?? '–'} sub="not counting cancelled" tint="var(--accentSoft)" dot="var(--accent)" />
        <StatTile label="Sales today" value={s ? rupees(s.salesToday) : '–'} sub="delivered orders" tint="var(--greenSoft)" dot="var(--greenDot)" />
        <StatTile label="Active right now" value={s?.activeOrders ?? '–'} sub="new, preparing or on the way" tint="var(--amberSoft)" dot="#D97706" />
        <StatTile label="Employees" value={s?.users ?? '–'} sub={s ? `${s.cafes} cafes · ${s.locations} locations` : ''} tint="var(--blueSoft)" dot="#2563EB" />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start', marginTop: 18 }}>
        <section className="card" style={{ flex: '999 1 480px', minWidth: 0, padding: '18px 0 6px' }}>
          <div className="row" style={{ padding: '0 20px 6px' }}>
            <div className="h2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--greenDot)' }} />Latest orders
            </div>
            <Link href="/admin/orders" className="link">View all</Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ minWidth: 560 }}>
              <thead><tr><th>Order</th><th>Cafe</th><th>Deliver to</th><th className="num">Total</th><th>Status</th></tr></thead>
              <tbody>
                {live.data?.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 800 }}>#{o.orderNo}<div className="small">{timeAgo(o.createdAt, Date.now())}</div></td>
                    <td style={{ fontWeight: 700 }} className="nowrap">{o.cafe.emoji} {o.cafe.name}</td>
                    <td className="nowrap" style={{ color: '#4A4A4A', fontWeight: 600 }}>{addressLine(o.address)}</td>
                    <td className="num" style={{ fontWeight: 800 }}>{rupees(o.total)}</td>
                    <td><span className={`badge ${STATUS[o.status].cls}`}>{STATUS[o.status].label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {live.data && !live.data.length && <div className="empty">No orders yet.</div>}
          </div>
        </section>

        <section className="card" style={{ flex: '1 1 300px', padding: 20 }}>
          <div className="h2">Top cafes today</div>
          <div className="stack" style={{ gap: 14, marginTop: 16 }}>
            {top.map((c) => (
              <div key={c.id}>
                <div className="row" style={{ fontSize: 14, fontWeight: 700 }}>
                  <span>{c.emoji} {c.name}</span><span>{rupees(c.sales)}</span>
                </div>
                <div className="bar"><i style={{ width: `${Math.round((c.sales / best) * 100)}%` }} /></div>
                <div className="row" style={{ marginTop: 4 }}>
                  <span className="small">{c.orders} orders · {c.locationName}</span>
                  <button className="link" style={{ fontSize: 13 }} onClick={() => openBoard(c.id)}><Icon name="board" /> Live board</button>
                </div>
              </div>
            ))}
            {s && !top.length && <div className="small">No cafes yet.</div>}
          </div>
        </section>
      </div>
    </main>
  );
}
