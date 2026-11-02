'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useLoad } from '@/lib/useLoad';
import type { RatingReport, RatingRow } from '@/lib/types';
import { useCafe } from '@/components/CafeContext';
import { Modal } from '@/components/Modal';

const TAG: Record<string, string> = {
  hot: 'Arrived hot', on_time: 'On time', tasty: 'Tasty', packing: 'Good packing', value: 'Value for money',
  cold: 'Was cold', late: 'Came late', missing: 'Item missing', taste: 'Taste was off', quantity: 'Less quantity',
};
const BAD = new Set(['cold', 'late', 'missing', 'taste', 'quantity']);
const when = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

export default function RatingsPage() {
  const { cafe } = useCafe();
  const [days, setDays] = useState(7);
  const [tab, setTab] = useState<'all' | 'low' | 'comment'>('all');
  const r = useLoad<RatingReport>(`/v1/cafe/ratings?days=${days}`, 30000);
  const [sorryFor, setSorryFor] = useState<RatingRow | null>(null);

  const d = r.data;
  const maxDist = Math.max(1, ...(d?.dist.map((x) => x.n) ?? [1]));
  const list = (d?.list ?? []).filter((x) => (tab === 'low' ? x.stars <= 2 : tab === 'comment' ? !!x.comment : true));
  const delta = d?.avg != null && d.prevAvg != null ? Math.round((d.avg - d.prevAvg) * 10) / 10 : null;

  async function resolve(x: RatingRow) {
    await api.post(`/v1/cafe/ratings/${x.orderId}/resolve`).catch((e: Error) => alert(e.message));
    await r.reload();
  }

  return (
    <main className="page">
      <div className="pagehead">
        <div>
          <div className="h1">Ratings</div>
          <p className="sub">Customers rate every delivered order. Low ratings show at the top until you mark them resolved.</p>
        </div>
        <div className="pagehead-actions wrap">
          {[7, 30, 90].map((n) => (
            <button key={n} className={`pill${days === n ? ' on' : ''}`} onClick={() => setDays(n)}>{n} days</button>
          ))}
        </div>
      </div>
      {r.error && <div className="err">{r.error}</div>}

      {d && (
        <>
          <div className="stats" style={{ marginBottom: 18 }}>
            <div className="card stat">
              <div className="cap">Avg rating</div>
              <div className="v">{d.avg != null ? `★ ${d.avg.toFixed(1)}` : '—'}</div>
              <div className="small" style={{ color: delta == null ? undefined : delta >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                {delta == null ? `All time ★ ${cafe.rating.toFixed(1)} (${cafe.ratingCount})` : `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)} vs previous ${d.days} days`}
              </div>
            </div>
            <div className="card stat">
              <div className="cap">Ratings</div>
              <div className="v">{d.count}</div>
              <div className="small">{d.delivered ? `of ${d.delivered} delivered (${Math.round((d.count / d.delivered) * 100)}%)` : 'No deliveries yet'}</div>
            </div>
            <div className="card stat">
              <div className="cap">On time</div>
              <div className="v">{d.onTimePct != null ? `${d.onTimePct}%` : '—'}</div>
              <div className="small">{d.avgMinutes != null ? `avg ${d.avgMinutes} min, order to desk` : ''}</div>
            </div>
            <div className="card stat" style={d.low ? { background: '#FEF2F2', boxShadow: '0 0 0 1.5px #FECACA' } : undefined}>
              <div className="cap" style={d.low ? { color: '#991B1B' } : undefined}>Needs attention</div>
              <div className="v" style={d.low ? { color: '#991B1B' } : undefined}>{d.low}</div>
              <div className="small">1–2 star, not resolved</div>
            </div>
          </div>

          <div className="rt-grid">
            <section className="stack" style={{ gap: 16 }}>
              <div className="card rt-box">
                <div className="h3">Stars</div>
                {d.dist.map((x) => (
                  <div key={x.stars} className="rt-bar">
                    <span>{x.stars}★</span>
                    <div><i style={{ width: `${(x.n / maxDist) * 100}%`, background: x.stars >= 4 ? 'var(--green)' : x.stars === 3 ? '#B45309' : 'var(--red)' }} /></div>
                    <span className="small">{x.n}</span>
                  </div>
                ))}
              </div>
              <div className="card rt-box">
                <div className="h3">What people say</div>
                {d.tags.length === 0 && <div className="small">No tags yet.</div>}
                <div className="wrap" style={{ gap: 6 }}>
                  {d.tags.map((t) => <span key={t.tag} className={`rt-tag${BAD.has(t.tag) ? ' bad' : ''}`}>{TAG[t.tag] ?? t.tag} · {t.n}</span>)}
                </div>
              </div>
              {d.items.length > 0 && (
                <div className="card rt-box">
                  <div className="h3">Items</div>
                  {d.items.map((i) => (
                    <div key={i.menuItemId} className="row small" style={{ gap: 8 }}>
                      <span style={{ flex: 1, color: 'var(--text)', fontWeight: 600 }}>{i.name}</span>
                      <span style={{ color: i.liked / i.total >= 0.7 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{Math.round((i.liked / i.total) * 100)}% liked</span>
                      <span>({i.total})</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="card" style={{ minWidth: 0 }}>
              <div className="rt-tabs" role="tablist">
                {([['all', `All ${d.list.length}`], ['low', `Low (1–2★) ${d.list.filter((x) => x.stars <= 2).length}`], ['comment', `With comment ${d.list.filter((x) => x.comment).length}`]] as const).map(([k, label]) => (
                  <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : undefined} onClick={() => setTab(k)}>{label}</button>
                ))}
              </div>
              {list.length === 0 && <div className="empty">No ratings here yet.</div>}
              {list.map((x) => {
                const open = x.stars <= 2 && !x.resolvedAt;
                return (
                  <div key={x.orderId} className={`rt-row${open ? ' open' : ''}`}>
                    <span className={`rt-stars${x.stars >= 4 ? ' good' : x.stars === 3 ? ' mid' : ''}`}>{x.stars}★</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div><b>{x.firstName}</b>{x.place && <span className="small"> · {x.place}</span>} <span className="small">· #{x.orderNo} · {when(x.createdAt)}</span></div>
                      {x.comment && <div style={{ marginTop: 4, fontSize: 14 }}>“{x.comment}”</div>}
                      <div className="wrap" style={{ gap: 6, marginTop: 6 }}>
                        {x.tags.map((t) => <span key={t} className={`rt-tag sm${BAD.has(t) ? ' bad' : ''}`}>{TAG[t] ?? t}</span>)}
                        {x.items.map((i) => <span key={i.name} className="small" style={{ color: i.liked ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{i.liked ? '👍' : '👎'} {i.name}</span>)}
                      </div>
                      {x.sorrySentAt && <div className="small" style={{ marginTop: 6 }}>You sent a message on {when(x.sorrySentAt)}</div>}
                    </div>
                    <div className="stack" style={{ gap: 6 }}>
                      {x.stars <= 3 && !x.sorrySentAt && <button className="btn sm" onClick={() => setSorryFor(x)}>Send sorry</button>}
                      {open && <button className="btn sec sm" onClick={() => resolve(x)}>Mark resolved</button>}
                    </div>
                  </div>
                );
              })}
              <div className="small" style={{ padding: '12px 18px', borderTop: '1px solid var(--line)' }}>
                You see only the first name and floor. The customer’s phone number stays private.
              </div>
            </section>
          </div>
        </>
      )}
      {sorryFor && <SorryDialog row={sorryFor} cafeName={cafe.name} onClose={() => setSorryFor(null)} onSent={() => (setSorryFor(null), void r.reload())} />}
    </main>
  );
}

function SorryDialog({ row, cafeName, onClose, onSent }: { row: RatingRow; cafeName: string; onClose: () => void; onSent: () => void }) {
  const [msg, setMsg] = useState(`Sorry ${row.firstName}, we let you down on order #${row.orderNo}. We'll make the next one right!`.slice(0, 160));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function send() {
    setBusy(true);
    setErr('');
    try {
      await api.post(`/v1/cafe/ratings/${row.orderId}/sorry`, { message: msg });
      onSent();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <Modal title={`Send a message to ${row.firstName}`} onClose={onClose}>
        <p className="small" style={{ margin: '0 0 14px' }}>Goes as a notification from {cafeName}. One message per rating.</p>
        <textarea className="field" value={msg} maxLength={160} onChange={(e) => setMsg(e.target.value)} rows={3} />
        <div className="small" style={{ textAlign: 'right' }}>{msg.length}/160</div>
        {err && <div className="err" style={{ marginTop: 10 }}>{err}</div>}
        <div className="row" style={{ gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
          <button className="btn sec" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy || msg.trim().length < 5} onClick={send}>{busy ? 'Sending…' : 'Send'}</button>
        </div>
    </Modal>
  );
}
