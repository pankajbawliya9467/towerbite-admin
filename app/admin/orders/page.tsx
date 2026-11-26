'use client';
import { api } from '@/lib/api';
import { STATUS } from '@/lib/format';
import { useLoad } from '@/lib/useLoad';
import { toQuery, useFilters } from '@/lib/useFilters';
import type { Cafe, Location, Order, OrderStatus } from '@/lib/types';
import { PageHead } from '@/components/PageHead';
import { Icon } from '@/components/Icon';
import { useCan } from '@/components/useCan';
import { OrdersTable } from '@/components/OrdersTable';
import { Chips, DateRange, Empty, Pager, SearchBox, rangeLabel, type Paged } from '@/components/ListTools';

const TYPES: Record<string, string> = { single: 'Single orders', team: 'Team orders' };

export default function AdminOrdersPage() {
  const { f, set, clear, ready } = useFilters({
    search: '', from: '', to: '', locationId: '', cafeId: '', status: '', type: '', company: '', page: '1', pageSize: '25',
  });
  const locations = useLoad<Location[]>('/v1/admin/locations');
  const cafes = useLoad<Cafe[]>(`/v1/admin/cafes${toQuery({ locationId: f.locationId })}`);
  const ok = useCan();
  const filters = { search: f.search, from: f.from, to: f.to, locationId: f.locationId, cafeId: f.cafeId, status: f.status, type: f.type, company: f.company };
  const orders = useLoad<Paged<Order>>(ready ? `/v1/admin/orders${toQuery({ ...filters, page: f.page, pageSize: f.pageSize })}` : null, 15000, true);

  const loc = locations.data?.find((l) => l.id === f.locationId);
  const cafe = cafes.data?.find((c) => c.id === f.cafeId);
  const chips = [
    f.search && { label: `"${f.search}"`, clear: () => set({ search: '' }) },
    (f.from || f.to) && { label: rangeLabel(f.from, f.to), clear: () => set({ from: '', to: '' }) },
    loc && { label: loc.name, clear: () => set({ locationId: '', cafeId: '' }) },
    cafe && { label: cafe.name, clear: () => set({ cafeId: '' }) },
    f.status && { label: f.status === 'active' ? 'In progress' : STATUS[f.status as OrderStatus]?.label ?? f.status, clear: () => set({ status: '' }) },
    f.type && { label: TYPES[f.type], clear: () => set({ type: '' }) },
    f.company && { label: `Company: ${f.company}`, clear: () => set({ company: '' }) },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  return (
    <main className="page">
      <PageHead title="All orders" sub="Every order, newest first. Filters stay in the link, so you can share or refresh it.">
        {ok('orders.csv') && (
          <button className="btn sec sm" onClick={() => api.download(`/v1/admin/orders.csv${toQuery(filters)}`, 'towerbites_orders.csv').catch((e: Error) => alert(e.message))}>
            <Icon name="download" /> Download CSV
          </button>
        )}
      </PageHead>
      <div className="lt-bar">
        <SearchBox value={f.search} onChange={(search) => set({ search })} placeholder={ok('orders.phone') ? 'Order no, name or phone' : 'Order no or name'} />
        <DateRange from={f.from} to={f.to} onChange={(from, to) => set({ from, to })} />
        <select className="field lt-sel" value={f.locationId} aria-label="Building" onChange={(e) => set({ locationId: e.target.value, cafeId: '' })}>
          <option value="">All buildings</option>
          {locations.data?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select className="field lt-sel" value={f.cafeId} aria-label="Cafe" onChange={(e) => set({ cafeId: e.target.value })}>
          <option value="">All cafes</option>
          {cafes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="field lt-sel" value={f.type} aria-label="Order type" onChange={(e) => set({ type: e.target.value })}>
          <option value="">Single + team</option>
          {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <SearchBox value={f.company} onChange={(company) => set({ company })} placeholder="Company" width={170} />
      </div>
      <div className="wrap" style={{ marginBottom: 12 }} role="radiogroup" aria-label="Status">
        <button role="radio" aria-checked={!f.status} className={`pill${!f.status ? ' on' : ''}`} onClick={() => set({ status: '' })}>All</button>
        <button role="radio" aria-checked={f.status === 'active'} className={`pill${f.status === 'active' ? ' on' : ''}`} onClick={() => set({ status: 'active' })}>In progress</button>
        {(Object.keys(STATUS) as OrderStatus[]).map((s) => (
          <button key={s} role="radio" aria-checked={f.status === s} className={`pill${f.status === s ? ' on' : ''}`} onClick={() => set({ status: s })}>{STATUS[s].label}</button>
        ))}
      </div>
      <Chips items={chips} onClear={() => clear(['pageSize'])} />
      {orders.error && <div className="err">{orders.error}</div>}
      <div className="card">
        {orders.data && (orders.data.rows.length ? <div className="table-scroll"><OrdersTable orders={orders.data.rows} showCafe showDate /></div> : <Empty>No orders match these filters.</Empty>)}
        {orders.data && (
          <Pager page={orders.data.page} pageSize={orders.data.pageSize} total={orders.data.total}
            onPage={(p) => set({ page: String(p) })} onSize={(s) => set({ pageSize: String(s) })} />
        )}
      </div>
    </main>
  );
}
