'use client';
import { useRouter } from 'next/navigation';
import { rupees } from '@/lib/format';
import { useLoad } from '@/lib/useLoad';
import type { AdminStats } from '@/lib/types';
import { adminCafe } from '@/components/CafeContext';
import { PageHead } from '@/components/PageHead';
import { StatTile } from '@/components/StatTile';
import { Icon } from '@/components/Icon';

export default function Dashboard() {
  const { data: s, error } = useLoad<AdminStats>('/v1/admin/stats', 15000);
  const router = useRouter();
  const openBoard = (id: string) => {
    adminCafe.set(id);
    router.push('/cafe');
  };

  return (
    <main className="page">
      <PageHead title="Today" sub="Orders and sales across every TowerBites location." />
      {error && <div className="err">{error}</div>}
      <div className="stats">
        <StatTile label="Orders today" value={s?.ordersToday ?? '–'} />
        <StatTile label="Sales today" value={s ? rupees(s.salesToday) : '–'} />
        <StatTile label="Active orders" value={s?.activeOrders ?? '–'} />
        <StatTile label="Users" value={s?.users ?? '–'} />
        <StatTile label="Cafes" value={s?.cafes ?? '–'} />
        <StatTile label="Locations" value={s?.locations ?? '–'} />
      </div>
      <div className="h2" style={{ marginTop: 44, marginBottom: 16 }}>Cafes today</div>
      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Cafe</th><th>Location</th><th className="num">Orders</th><th className="num">Sales</th><th /></tr>
          </thead>
          <tbody>
            {s?.byCafe.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}><span style={{ marginRight: 10, fontSize: 18 }}>{c.emoji}</span>{c.name}</td>
                <td style={{ color: 'var(--sub)' }}>{c.locationName}</td>
                <td className="num">{c.orders}</td>
                <td className="num" style={{ fontWeight: 600 }}>{rupees(c.sales)}</td>
                <td className="num"><button className="link" onClick={() => openBoard(c.id)}><Icon name="board" /> Live board</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {s && !s.byCafe.length && <div className="empty">No cafes yet.</div>}
      </div>
    </main>
  );
}
