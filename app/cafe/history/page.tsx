'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { rupees, todayIST } from '@/lib/format';
import type { CafeStats, Order } from '@/lib/types';
import { OrdersTable } from '@/components/OrdersTable';
import { StatTile } from '@/components/StatTile';

export default function HistoryPage() {
  const [date, setDate] = useState(todayIST);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [stats, setStats] = useState<CafeStats | null>(null);

  useEffect(() => {
    api.get<CafeStats>('/v1/cafe/stats').then(setStats, () => setStats(null));
  }, []);

  useEffect(() => {
    setOrders(null);
    api.get<Order[]>(`/v1/cafe/orders?status=history&date=${date}`).then(setOrders, () => setOrders([]));
  }, [date]);

  return (
    <main className="page">
      <div className="pagehead">
        <div>
          <div className="h1">Order history</div>
          <p className="sub">Today so far, and every order of the day you pick.</p>
        </div>
      </div>
      <div className="stats">
        <StatTile label="Orders today" value={stats?.orders ?? '–'} />
        <StatTile label="Delivered" value={stats?.delivered ?? '–'} />
        <StatTile label="Sales today" value={stats ? rupees(stats.sales) : '–'} />
        <StatTile label="COD collected" value={stats ? rupees(stats.codCollected) : '–'} />
      </div>
      <div className="row" style={{ marginTop: 40, marginBottom: 16 }}>
        <div className="h2">{orders ? `${orders.length} order${orders.length === 1 ? '' : 's'}` : 'Orders'}</div>
        <input className="field" type="date" value={date} max={todayIST()} onChange={(e) => e.target.value && setDate(e.target.value)}
          style={{ width: 200, height: 46 }} aria-label="Date" />
      </div>
      <div className="card">{orders && <OrdersTable orders={orders} />}</div>
    </main>
  );
}
