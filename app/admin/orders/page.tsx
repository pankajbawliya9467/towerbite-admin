'use client';
import { useState } from 'react';
import { qs } from '@/lib/api';
import { STATUS } from '@/lib/format';
import { useLoad } from '@/lib/useLoad';
import type { Cafe, Location, Order, OrderStatus } from '@/lib/types';
import { PageHead } from '@/components/PageHead';
import { OrdersTable } from '@/components/OrdersTable';

export default function AdminOrdersPage() {
  const [locationId, setLocationId] = useState('');
  const [cafeId, setCafeId] = useState('');
  const [status, setStatus] = useState('');
  const locations = useLoad<Location[]>('/v1/admin/locations');
  const cafes = useLoad<Cafe[]>(`/v1/admin/cafes${qs({ locationId })}`);
  const orders = useLoad<Order[]>(`/v1/admin/orders${qs({ locationId, cafeId, status, limit: '200' })}`, 10000);

  return (
    <main className="page">
      <PageHead title="All orders" sub="The latest 200 orders that match your filters." />
      <div className="filters">
        <select className="field" style={{ width: 240, height: 46 }} value={locationId} aria-label="Location"
          onChange={(e) => { setLocationId(e.target.value); setCafeId(''); }}>
          <option value="">All locations</option>
          {locations.data?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select className="field" style={{ width: 240, height: 46 }} value={cafeId} aria-label="Cafe" onChange={(e) => setCafeId(e.target.value)}>
          <option value="">All cafes</option>
          {cafes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="wrap" style={{ marginBottom: 24 }}>
        <button className={`pill${!status ? ' on' : ''}`} onClick={() => setStatus('')}>All</button>
        {(Object.keys(STATUS) as OrderStatus[]).map((s) => (
          <button key={s} className={`pill${status === s ? ' on' : ''}`} onClick={() => setStatus(s)}>{STATUS[s].label}</button>
        ))}
      </div>
      {orders.error && <div className="err">{orders.error}</div>}
      <div className="card">{orders.data && <OrdersTable orders={orders.data} showCafe showDate />}</div>
    </main>
  );
}
