'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { STATUS, rupees, todayIST } from '@/lib/format';
import { useLoad } from '@/lib/useLoad';
import { toQuery, useFilters } from '@/lib/useFilters';
import type { CafeStats, Order, OrderStatus } from '@/lib/types';
import { OrdersTable } from '@/components/OrdersTable';
import { StatTile } from '@/components/StatTile';
import { Chips, DateRange, Empty, Pager, SearchBox, rangeLabel, type Paged } from '@/components/ListTools';

const DONE: OrderStatus[] = ['delivered', 'cancelled', 'rejected', 'placed', 'preparing', 'out_for_delivery'];

export default function HistoryPage() {
  const [stats, setStats] = useState<CafeStats | null>(null);
  const today = todayIST();
  const { f, set, clear, ready } = useFilters({ from: today, to: today, state: '', search: '', page: '1', pageSize: '25' });
  const orders = useLoad<Paged<Order>>(ready ? `/v1/cafe/orders${toQuery({ status: 'history', ...f })}` : null, undefined, true);

  useEffect(() => {
    api.get<CafeStats>('/v1/cafe/stats').then(setStats, () => setStats(null));
  }, []);

  const chips = [
    f.search && { label: `"${f.search}"`, clear: () => set({ search: '' }) },
    (f.from !== today || f.to !== today) && { label: rangeLabel(f.from, f.to), clear: () => set({ from: today, to: today }) },
    f.state && { label: STATUS[f.state as OrderStatus]?.label ?? f.state, clear: () => set({ state: '' }) },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  return (
    <main className="page">
      <div className="pagehead">
        <div>
          <div className="h1">Order history</div>
          <p className="sub">Today so far, or any dates you pick.</p>
        </div>
      </div>
      <div className="stats">
        <StatTile label="Orders today" value={stats?.orders ?? '–'} />
        <StatTile label="Delivered" value={stats?.delivered ?? '–'} />
        <StatTile label="Sales today" value={stats ? rupees(stats.sales) : '–'} />
        <StatTile label="COD collected" value={stats ? rupees(stats.codCollected) : '–'} />
      </div>
      <div className="row" style={{ marginTop: 36, marginBottom: 12 }}>
        <div className="h2">{orders.data ? `${orders.data.total} order${orders.data.total === 1 ? '' : 's'}` : 'Orders'}</div>
      </div>
      <div className="lt-bar">
        <SearchBox value={f.search} onChange={(search) => set({ search })} placeholder="Order no, name or phone" />
        <DateRange from={f.from} to={f.to} onChange={(from, to) => set({ from: from || today, to: to || from || today })} anyLabel="Today" />
        <select className="field lt-sel" value={f.state} aria-label="Status" onChange={(e) => set({ state: e.target.value })}>
          <option value="">Every status</option>
          {DONE.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
        </select>
      </div>
      <Chips items={chips} onClear={() => clear(['pageSize'])} />
      {orders.error && <div className="err">{orders.error}</div>}
      <div className="card">
        {orders.data && (orders.data.rows.length ? <div className="table-scroll"><OrdersTable orders={orders.data.rows} showDate={f.from !== f.to} /></div> : <Empty>No orders for these filters.</Empty>)}
        {orders.data && <Pager page={orders.data.page} pageSize={orders.data.pageSize} total={orders.data.total} onPage={(p) => set({ page: String(p) })} onSize={(x) => set({ pageSize: String(x) })} />}
      </div>
    </main>
  );
}
