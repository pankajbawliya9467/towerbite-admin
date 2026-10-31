'use client';
import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { rupees } from '@/lib/format';
import { useLoad } from '@/lib/useLoad';
import type { CafeReport } from '@/lib/types';
import { useCafe } from '@/components/CafeContext';
import { Icon } from '@/components/Icon';
import styles from './reports.module.css';

const istToday = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400_000).toISOString().slice(0, 10);
const nice = (d: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { ...opts, timeZone: 'UTC' });
const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;

const PERIODS = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7', label: '7 days', days: 7 },
  { key: '30', label: '30 days', days: 30 },
  { key: 'custom', label: 'Custom', days: 0 },
] as const;

export default function ReportsPage() {
  const { cafe } = useCafe();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['key']>('7');
  const [custom, setCustom] = useState({ from: addDays(istToday(), -13), to: istToday() });
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  const { from, to } = useMemo(() => {
    if (period === 'custom') return custom;
    const p = PERIODS.find((x) => x.key === period)!;
    return { from: addDays(istToday(), -(p.days - 1)), to: istToday() };
  }, [period, custom]);
  const qs = `?from=${from}&to=${to}`;
  const { data: r, error } = useLoad<CafeReport>(`/v1/cafe/reports${qs}`, 60000);

  async function download(kind: 'orders' | 'items') {
    setMenuOpen(false);
    setBusy(kind);
    setErr('');
    try {
      const slug = cafe.slug || 'cafe';
      await api.download(`/v1/cafe/reports/${kind}.csv${qs}`, `${slug}-${kind}-${from}-to-${to}.csv`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  function printSummary() {
    setMenuOpen(false);
    setTimeout(() => window.print(), 50);
  }

  const maxDay = Math.max(1, ...(r?.byDay.map((d) => d.sales) ?? [1]));
  const bestDay = r?.byDay.reduce((b, d) => (d.sales > b.sales ? d : b), r.byDay[0]);
  const hours = (r?.byHour ?? []).filter((h) => h.hour >= 7 && h.hour <= 22);
  const maxHour = Math.max(1, ...hours.map((h) => h.orders));
  const t = r?.totals;
  const ended = t ? t.delivered + t.cancelled + t.rejected : 0;
  const pct = (n: number) => (ended ? Math.round((n / ended) * 100) : 0);
  const periodText = r ? (r.range.days === 1 ? nice(r.range.from, { day: 'numeric', month: 'short', year: 'numeric' }) : `${nice(r.range.from)} – ${nice(r.range.to, { day: 'numeric', month: 'short', year: 'numeric' })}`) : '';
  const compareText = r ? (r.range.days === 1 ? 'vs the day before' : `vs the ${r.range.days} days before`) : '';

  return (
    <main className={`page ${styles.page}`}>
      <div className={styles.head}>
        <div>
          <h1 className="h1">Reports</h1>
          <div className="sub" style={{ marginTop: 4 }}>{cafe.name} · {periodText} <span className={styles.noPrint}>· compared with the period before</span></div>
        </div>
        <div className={`${styles.controls} ${styles.noPrint}`}>
          <div className={styles.seg} role="tablist" aria-label="Period">
            {PERIODS.map((p) => (
              <button key={p.key} role="tab" aria-selected={period === p.key} className={period === p.key ? styles.on : undefined} onClick={() => setPeriod(p.key)}>{p.label}</button>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <button className="btn sm" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} disabled={!!busy}>
              <Icon name="download" /> {busy ? 'Preparing…' : 'Download report'} <Icon name="down" />
            </button>
            {menuOpen && (
              <div className={styles.menu} role="menu">
                <button role="menuitem" onClick={() => download('orders')}>All orders <span>Excel / .csv</span></button>
                <button role="menuitem" onClick={() => download('items')}>Item-wise sales <span>Excel / .csv</span></button>
                <button role="menuitem" onClick={printSummary}>Summary for the owner <span>PDF / print</span></button>
              </div>
            )}
          </div>
        </div>
      </div>
      {period === 'custom' && (
        <div className={`${styles.custom} ${styles.noPrint}`}>
          <label>From <input type="date" className="field" value={custom.from} max={custom.to} onChange={(e) => setCustom({ ...custom, from: e.target.value })} /></label>
          <label>To <input type="date" className="field" value={custom.to} min={custom.from} max={istToday()} onChange={(e) => setCustom({ ...custom, to: e.target.value })} /></label>
        </div>
      )}
      {(error || err) && <div className="err" style={{ marginBottom: 12 }}>{error || err}</div>}

      <div className="stats">
        <Kpi label="Sales" value={t ? rupees(t.sales) : '–'} change={r?.change.sales} unit="%" sub={compareText} />
        <Kpi label="Orders" value={t?.orders ?? '–'} change={r?.change.orders} unit="%" sub={compareText} />
        <Kpi label="Average order" value={t ? rupees(t.avgOrder) : '–'} change={r?.change.avgOrder} unit="%" sub={compareText} />
        <Kpi label="Rejected / cancelled" value={t ? `${t.lostPct}%` : '–'} change={r?.change.lostPct} unit=" pts" sub={compareText} lowerIsBetter />
      </div>

      <div className={styles.row}>
        <section className={`card ${styles.chartCard} ${styles.grow}`}>
          <div className="row"><h2 className="h2">Sales by day</h2><span className="small">₹ of delivered orders</span></div>
          {r && r.byDay.length > 31 ? (
            <div className="small" style={{ marginTop: 16 }}>Pick 31 days or fewer to see the daily chart. The totals above cover the whole period.</div>
          ) : (
            <div className={styles.bars} role="img" aria-label="Sales per day">
              {r?.byDay.map((d) => (
                <div key={d.day} className={styles.barCol} title={`${nice(d.day, { weekday: 'short', day: 'numeric', month: 'short' })}: ${rupees(d.sales)} · ${d.orders} orders`}>
                  {bestDay?.day === d.day && d.sales > 0 && <span className={styles.barValue}>{rupees(d.sales)}</span>}
                  <div className={`${styles.bar}${bestDay?.day === d.day ? ` ${styles.best}` : ''}`} style={{ height: `${(d.sales / maxDay) * 100}%` }} />
                  <span className={styles.barLabel}>{r.byDay.length <= 7 ? nice(d.day, { weekday: 'short' }) : nice(d.day, { day: 'numeric' })}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={`card ${styles.chartCard} ${styles.side}`}>
          <div className="row"><h2 className="h2">Busiest hours</h2><span className="small">orders per hour</span></div>
          <div className={styles.hours} role="img" aria-label="Orders per hour">
            {hours.map((h) => (
              <div key={h.hour} title={`${hourLabel(h.hour)}: ${h.orders} orders`} className={`${styles.hour}${r?.peakHour?.hour === h.hour ? ` ${styles.best}` : ''}`} style={{ height: `${Math.max(2, (h.orders / maxHour) * 100)}%` }} />
            ))}
          </div>
          <div className={styles.hourAxis}><span>7 AM</span><span>12 PM</span><span>5 PM</span><span>10 PM</span></div>
          {r?.peakHour ? (
            <div className={styles.tip}>Busiest: {hourLabel(r.peakHour.hour)}–{hourLabel(r.peakHour.hour + 1)} ({r.peakHour.orders} orders). Keep an extra person on the counter then.</div>
          ) : r ? <div className="small" style={{ marginTop: 12 }}>No orders in this period yet.</div> : null}
        </section>
      </div>

      <div className={styles.row}>
        <section className={`card ${styles.grow}`} style={{ padding: '18px 0 6px' }}>
          <div className="row" style={{ padding: '0 20px' }}><h2 className="h2">Top selling items</h2><span className="small">delivered orders</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ minWidth: 520 }}>
              <thead><tr><th>#</th><th>Item</th><th className="num">Sold</th><th className="num">Sales</th><th style={{ width: '34%' }}>Share of sales</th></tr></thead>
              <tbody>
                {r?.topItems.map((it, i) => (
                  <tr key={it.name}>
                    <td style={{ fontWeight: 800, color: 'var(--sub)' }}>{i + 1}</td>
                    <td style={{ fontWeight: 700 }}>{it.name}{it.rising && <span className={styles.rising}>▲ rising</span>}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{it.qty}</td>
                    <td className="num" style={{ fontWeight: 800 }}>{rupees(it.sales)}</td>
                    <td><div className={styles.share}><div className="bar" style={{ flex: 1, marginTop: 0 }}><i style={{ width: `${it.share}%` }} /></div><span>{it.share}%</span></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {r && !r.topItems.length && <div className="empty">No delivered orders in this period.</div>}
          </div>
        </section>

        <section className={styles.side} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className={`card ${styles.chartCard}`}>
            <h2 className="h2">How orders ended</h2>
            <div className={styles.split} role="img" aria-label={`Delivered ${pct(t?.delivered ?? 0)}%, cancelled ${pct(t?.cancelled ?? 0)}%, rejected ${pct(t?.rejected ?? 0)}%`}>
              {ended > 0 && <>
                <i style={{ flex: t!.delivered, background: 'var(--green)' }} />
                <i style={{ flex: t!.cancelled, background: '#9A968F' }} />
                <i style={{ flex: t!.rejected, background: 'var(--red)' }} />
              </>}
            </div>
            <div className={styles.legend}>
              <div><span><b style={{ background: 'var(--green)' }} />Delivered</span><strong>{t?.delivered ?? 0} · {pct(t?.delivered ?? 0)}%</strong></div>
              <div><span><b style={{ background: '#9A968F' }} />Cancelled by employee</span><strong>{t?.cancelled ?? 0} · {pct(t?.cancelled ?? 0)}%</strong></div>
              <div><span><b style={{ background: 'var(--red)' }} />Rejected by cafe</span><strong>{t?.rejected ?? 0} · {pct(t?.rejected ?? 0)}%</strong></div>
            </div>
          </div>
          <div className={`card ${styles.chartCard}`}>
            <h2 className="h2">Top companies</h2>
            <div className={styles.companies}>
              {r?.companies.map((c) => (
                <div key={c.name}><span>{c.name}</span><span>{c.orders} orders · <b>{rupees(c.sales)}</b></span></div>
              ))}
              {r && !r.companies.length && <div className="small">No delivered orders yet.</div>}
            </div>
          </div>
        </section>
      </div>
      <p className={`small ${styles.printOnly}`}>TowerBites report for {cafe.name}, {periodText}. Printed {new Date().toLocaleString('en-IN')}.</p>
    </main>
  );
}

function Kpi({ label, value, change, unit, sub, lowerIsBetter }: { label: string; value: string | number; change?: number | null; unit: string; sub: string; lowerIsBetter?: boolean }) {
  const has = change !== undefined && change !== null;
  const up = has && change! > 0;
  const good = has && (lowerIsBetter ? change! <= 0 : change! >= 0);
  return (
    <div className="card stat">
      <div className="cap">{label}</div>
      <div className="v">{value}</div>
      <div className={styles.delta}>
        {has ? (
          <span className={good ? styles.good : styles.bad}>{change === 0 ? '±0' : `${up ? '▲' : '▼'} ${Math.abs(change!)}`}{unit}</span>
        ) : (
          <span className={styles.flat}>new</span>
        )}
        <span>{sub}</span>
      </div>
    </div>
  );
}
