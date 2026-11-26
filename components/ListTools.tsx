'use client';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

export type Paged<T> = { rows: T[]; total: number; page: number; pageSize: number };
export const PAGE_SIZES = [25, 50, 100];

/** Search box that waits until typing stops. */
export function SearchBox({ value, onChange, placeholder, width = 260 }: { value: string; onChange: (v: string) => void; placeholder: string; width?: number }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  useEffect(() => {
    if (v === value) return;
    const t = setTimeout(() => onChange(v.trim()), 350);
    return () => clearTimeout(t);
  }, [v]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <label className="lt-search" style={{ width }}>
      <Icon name="search" />
      <input type="search" value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} aria-label={placeholder} maxLength={80} />
    </label>
  );
}

const ist = () => new Date(Date.now() + 5.5 * 3600_000);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const back = (days: number) => iso(new Date(ist().getTime() - days * 86400_000));
/** Date presets in India time. */
export function presets() {
  const t = ist();
  const first = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1));
  const lastPrev = new Date(first.getTime() - 86400_000);
  const firstPrev = new Date(Date.UTC(lastPrev.getUTCFullYear(), lastPrev.getUTCMonth(), 1));
  return [
    { key: 'today', label: 'Today', from: back(0), to: back(0) },
    { key: 'yesterday', label: 'Yesterday', from: back(1), to: back(1) },
    { key: '7d', label: 'Last 7 days', from: back(6), to: back(0) },
    { key: '30d', label: 'Last 30 days', from: back(29), to: back(0) },
    { key: 'month', label: 'This month', from: iso(first), to: back(0) },
    { key: 'lastmonth', label: 'Last month', from: iso(firstPrev), to: iso(lastPrev) },
  ];
}
export const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
export function rangeLabel(from: string, to: string) {
  if (!from && !to) return '';
  const p = presets().find((x) => x.from === from && x.to === to);
  if (p) return p.label;
  if (from && to) return from === to ? fmtDay(from) : `${fmtDay(from)} – ${fmtDay(to)}`;
  return from ? `From ${fmtDay(from)}` : `Till ${fmtDay(to)}`;
}

/** A date range: a preset menu plus two date boxes. Empty = any date. */
export function DateRange({ from, to, onChange, anyLabel = 'Any date', pills }: {
  from: string; to: string; onChange: (from: string, to: string) => void; anyLabel?: string; pills?: boolean;
}) {
  const ps = presets();
  const cur = ps.find((p) => p.from === from && p.to === to)?.key ?? (from || to ? 'custom' : '');
  const [custom, setCustom] = useState(cur === 'custom');
  const showDates = custom || cur === 'custom';
  return (
    <div className="lt-range">
      {pills ? (
        <div className="wrap" role="radiogroup" aria-label="Dates">
          {ps.map((p) => (
            <button key={p.key} type="button" role="radio" aria-checked={cur === p.key} className={`pill${cur === p.key ? ' on' : ''}`}
              onClick={() => { setCustom(false); onChange(p.from, p.to); }}>{p.label}</button>
          ))}
          <button type="button" role="radio" aria-checked={showDates} className={`pill${showDates ? ' on' : ''}`} onClick={() => setCustom(true)}>Pick dates</button>
        </div>
      ) : (
        <select className="field lt-sel" value={showDates ? 'custom' : cur} aria-label="Dates"
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'custom') return setCustom(true);
            setCustom(false);
            const p = ps.find((x) => x.key === v);
            onChange(p?.from ?? '', p?.to ?? '');
          }}>
          <option value="">{anyLabel}</option>
          {ps.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          <option value="custom">Pick dates…</option>
        </select>
      )}
      {showDates && (
        <span className="lt-dates">
          <input type="date" className="field" value={from} max={to || undefined} aria-label="From" onChange={(e) => onChange(e.target.value, to)} />
          <span>to</span>
          <input type="date" className="field" value={to} min={from || undefined} aria-label="To" onChange={(e) => onChange(from, e.target.value)} />
        </span>
      )}
    </div>
  );
}

/** The filters in use, each removable, plus "Clear filters". */
export function Chips({ items, onClear }: { items: { label: string; clear: () => void }[]; onClear: () => void }) {
  if (!items.length) return null;
  return (
    <div className="lt-chips">
      {items.map((c) => (
        <button key={c.label} type="button" className="lt-chip" onClick={c.clear} aria-label={`Remove filter ${c.label}`}>{c.label} <Icon name="x" /></button>
      ))}
      <button type="button" className="link" style={{ fontSize: 13 }} onClick={onClear}>Clear filters</button>
    </div>
  );
}

/** "Showing 26–50 of 312", page numbers, rows per page. */
export function Pager({ page, pageSize, total, onPage, onSize }: {
  page: number; pageSize: number; total: number; onPage: (p: number) => void; onSize: (s: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const nums: (number | '…')[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  const start = (page - 1) * pageSize + 1;
  return (
    <nav className="lt-pager" aria-label="Pages">
      <span>Showing {Math.min(start, total)}–{Math.min(page * pageSize, total)} of {total.toLocaleString('en-IN')}</span>
      {pages > 1 && (
        <span className="lt-pages">
          <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">‹</button>
          {nums.map((p, i) => p === '…'
            ? <span key={`g${i}`} className="lt-gap">…</span>
            : <button key={p} type="button" className={p === page ? 'on' : ''} aria-current={p === page ? 'page' : undefined} onClick={() => onPage(p)}>{p}</button>)}
          <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">›</button>
        </span>
      )}
      <select className="field lt-sel" style={{ width: 'auto' }} value={pageSize} aria-label="Rows per page" onChange={(e) => onSize(Number(e.target.value))}>
        {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} per page</option>)}
      </select>
    </nav>
  );
}

/** Paging for short lists that are already all loaded (admins, cafe logins…). */
export function useClientPage<T>(rows: T[] | null | undefined, page: number, pageSize: number) {
  return useMemo(() => {
    const all = rows ?? [];
    const pages = Math.max(1, Math.ceil(all.length / pageSize));
    const p = Math.min(Math.max(1, page), pages);
    return { rows: all.slice((p - 1) * pageSize, p * pageSize), total: all.length, page: p };
  }, [rows, page, pageSize]);
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty" style={{ padding: 28 }}>{children}</div>;
}
