'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { STATUS, rupees } from '@/lib/format';
import { useLoad } from '@/lib/useLoad';
import { toQuery, useFilters } from '@/lib/useFilters';
import type { Cafe, Location, OrderStatus } from '@/lib/types';
import { PageHead } from '@/components/PageHead';
import { Icon } from '@/components/Icon';
import { Chips, DateRange, SearchBox, presets, rangeLabel } from '@/components/ListTools';

type Summary = {
  from: string; to: string; money: boolean;
  orders: number; delivered: number; cancelled: number; rejected: number; lostPct: number;
  sales: number | null; avgOrder: number | null;
  rows: Record<Kind, number>;
};
type Kind = 'orders' | 'items' | 'cafes' | 'days' | 'lunch' | 'customers';
const REPORTS: { kind: Kind; title: string; about: string }[] = [
  { kind: 'orders', title: 'All orders', about: 'Every order: time, building, cafe, customer, items, total, status, rating' },
  { kind: 'items', title: 'Item-wise sales', about: 'Every dish: how many sold, in how many orders, sales' },
  { kind: 'cafes', title: 'Cafe-wise summary', about: 'Every cafe: orders, sales, average order, cancelled / rejected, rating' },
  { kind: 'days', title: 'Day-wise sales', about: 'Every day: orders, sales, customers, new sign-ups' },
  { kind: 'lunch', title: 'Lunch bookings', about: 'Every booking: date, slot, lunch, cafe, customer, plates, status' },
  { kind: 'customers', title: 'Customers', about: 'People who ordered: company, building, orders, money spent, last order' },
];
const TYPES: Record<string, string> = { single: 'Single orders', team: 'Team orders' };

/** Admin → Reports: one set of filters, the numbers, and six downloads that use the same filters. */
export default function ReportsPage() {
  const week = presets().find((p) => p.key === '7d')!;
  const { f, set, clear, ready } = useFilters({ from: week.from, to: week.to, locationId: '', cafeId: '', company: '', status: '', type: '' });
  const locations = useLoad<Location[]>('/v1/admin/locations');
  const cafes = useLoad<Cafe[]>(`/v1/admin/cafes${toQuery({ locationId: f.locationId })}`);
  const s = useLoad<Summary>(ready ? `/v1/admin/reports${toQuery(f)}` : null, undefined, true);
  const [busy, setBusy] = useState<Kind | null>(null);
  const [err, setErr] = useState('');

  async function download(kind: Kind) {
    setBusy(kind);
    setErr('');
    try {
      await api.download(`/v1/admin/reports/${kind}.csv${toQuery(f)}`, `towerbites_${kind}_${f.from}_to_${f.to}.csv`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const loc = locations.data?.find((l) => l.id === f.locationId);
  const cafe = cafes.data?.find((c) => c.id === f.cafeId);
  const chips = [
    loc && { label: loc.name, clear: () => set({ locationId: '', cafeId: '' }) },
    cafe && { label: cafe.name, clear: () => set({ cafeId: '' }) },
    f.company && { label: `Company: ${f.company}`, clear: () => set({ company: '' }) },
    f.status && { label: STATUS[f.status as OrderStatus]?.label ?? f.status, clear: () => set({ status: '' }) },
    f.type && { label: TYPES[f.type], clear: () => set({ type: '' }) },
  ].filter(Boolean) as { label: string; clear: () => void }[];
  const d = s.data;

  return (
    <main className="page">
      <PageHead title="Reports" sub="Pick filters, check the numbers, download. Every download has exactly what the filters show." />
      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <DateRange pills from={f.from} to={f.to} onChange={(from, to) => from && to && set({ from, to })} />
        <div className="lt-bar" style={{ marginTop: 12, marginBottom: 0 }}>
          <select className="field lt-sel" value={f.locationId} aria-label="Building" onChange={(e) => set({ locationId: e.target.value, cafeId: '' })}>
            <option value="">All buildings</option>
            {locations.data?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select className="field lt-sel" value={f.cafeId} aria-label="Cafe" onChange={(e) => set({ cafeId: e.target.value })}>
            <option value="">All cafes</option>
            {cafes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <SearchBox value={f.company} onChange={(company) => set({ company })} placeholder="Company" width={170} />
          <select className="field lt-sel" value={f.status} aria-label="Status" onChange={(e) => set({ status: e.target.value })}>
            <option value="">Every status</option>
            {(Object.keys(STATUS) as OrderStatus[]).map((k) => <option key={k} value={k}>{STATUS[k].label}</option>)}
          </select>
          <select className="field lt-sel" value={f.type} aria-label="Order type" onChange={(e) => set({ type: e.target.value })}>
            <option value="">Single + team</option>
            {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {chips.length > 0 && <div style={{ marginTop: 12 }}><Chips items={chips} onClear={() => clear(['from', 'to'])} /></div>}
      </div>

      {s.error && <div className="err">{s.error}</div>}
      <div className="rp-kpis">
        <div className="card"><span>Orders</span><b>{d ? d.orders.toLocaleString('en-IN') : '–'}</b><small>{d ? `${d.delivered.toLocaleString('en-IN')} delivered` : ''}</small></div>
        <div className="card"><span>Sales</span><b>{d ? (d.sales === null ? 'Hidden' : rupees(d.sales)) : '–'}</b><small>{d?.sales === null ? 'Needs "Reports → money"' : 'Delivered orders'}</small></div>
        <div className="card"><span>Avg order</span><b>{d ? (d.avgOrder === null ? 'Hidden' : rupees(d.avgOrder)) : '–'}</b><small>&nbsp;</small></div>
        <div className="card"><span>Cancelled + rejected</span><b>{d ? `${d.cancelled + d.rejected} (${d.lostPct}%)` : '–'}</b><small>{d ? `${d.cancelled} cancelled · ${d.rejected} rejected` : ''}</small></div>
      </div>
      <div className="small" style={{ margin: '4px 0 12px' }}>{d ? `${rangeLabel(d.from, d.to)} · ${d.from} to ${d.to}` : ''}</div>

      {err && <div className="err">{err}</div>}
      <div className="rp-grid">
        {REPORTS.map((r) => (
          <div key={r.kind} className="card rp-card">
            <b>{r.title}</b>
            <span className="small">{r.about}</span>
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 'auto', paddingTop: 12 }}>
              <span className="small">{d ? `${d.rows[r.kind].toLocaleString('en-IN')} rows` : ''}</span>
              <button className="btn sm" disabled={!d || busy !== null || d.rows[r.kind] === 0} onClick={() => download(r.kind)}>
                <Icon name="download" /> {busy === r.kind ? 'Preparing…' : 'Download'}
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="small" style={{ marginTop: 14 }}>
        Files are .csv (open in Excel or Google Sheets). Up to one year at a time. Phone numbers only for admins with the phone tick; ₹ columns only with &quot;Reports → money&quot;. Every download is logged.
      </p>
    </main>
  );
}
