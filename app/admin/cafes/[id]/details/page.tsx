'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, forCafe } from '@/lib/api';
import { useLoad } from '@/lib/useLoad';
import { rupees } from '@/lib/format';
import type { Cafe, CafeStats, Combo, Location, Lunch, Rider } from '@/lib/types';
import { adminCafe } from '@/components/CafeContext';
import { FoodTile } from '@/components/FoodTile';
import { Icon } from '@/components/Icon';
import { Switch } from '@/components/Switch';
import { useCan } from '@/components/useCan';
import { CafeProducts } from '../../../products/CafeProducts';
import { CafeLogins } from '../../CafeLogins';

type Tab = 'products' | 'combos' | 'lunch' | 'team';
const TABS: { key: Tab; label: string }[] = [
  { key: 'products', label: 'Products' },
  { key: 'combos', label: 'Combos' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'team', label: 'Logins & staff' },
];
const DAYS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Admin → Cafes → View details: everything about one cafe on one page. The cafe's details and today's numbers
 * on top; below, its products, combos, lunch, logins and delivery staff. Combos, lunch and staff use the
 * cafe panel's API, so they need the "Live board" tick; "Manage" opens the full cafe panel screen.
 */
export default function CafeDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const ok = useCan();
  const cafe = useLoad<Cafe>(`/v1/admin/cafes/${id}`);
  const locations = useLoad<Location[]>('/v1/admin/locations');
  const board = ok('cafes.board');
  const [stats, setStats] = useState<CafeStats | null>(null);
  const [tab, setTab] = useState<Tab>('products');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!board) return;
    const load = () => forCafe(id).get<CafeStats>('/v1/cafe/stats').then(setStats, () => undefined);
    void load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [id, board]);

  /** Opens a cafe panel screen (live board, combos, lunch, staff) for this cafe. */
  const openPanel = useCallback((path: string) => {
    adminCafe.set(id);
    router.push(path);
  }, [id, router]);

  async function setFlag(body: Partial<Pick<Cafe, 'acceptingOrders' | 'isOpen'>>) {
    setBusy(true);
    try {
      await api.patch(`/v1/admin/cafes/${id}`, body);
      await cafe.reload();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (cafe.error) return <main className="page"><div className="err">{cafe.error}</div></main>;
  const c = cafe.data;
  if (!c) return null;
  const loc = locations.data?.find((l) => l.id === c.locationId);
  const canEdit = ok('cafes.edit') || ok('cafes.openclose') || ok('cafes.logins');
  const canSwitch = ok('cafes.openclose');

  return (
    <main className="page">
      <nav className="small cd-crumbs" aria-label="Breadcrumb">
        <Link className="link" href="/admin/cafes"><Icon name="back" /> Cafes</Link><span aria-hidden="true">›</span><span>{c.name}</span>
      </nav>

      <section className="card cd-head" aria-label={c.name}>
        <div className="cd-cover" style={{ background: c.coverColor }}>
          {c.imageUrl && <img src={c.imageUrl} alt="" />}
        </div>
        <div className="cd-top">
          <div className="cd-logo"><FoodTile emoji={c.emoji} imageUrl={c.logoUrl} color={c.coverColor} size={84} /></div>
          <div className="cd-title">
            <div className="cd-name">
              <h1 className="h1">{c.name}</h1>
              {!c.isActive && <span className="badge warn">Inactive · hidden from app</span>}
              <span className={`badge ${c.isOpen ? 'ok' : 'mute'}`}>{c.isOpen ? 'Open' : 'Closed'}</span>
              {c.isOpen && !c.acceptingOrders && <span className="badge warn">Paused</span>}
            </div>
            <div className="sub">
              {[c.cuisines, c.place, loc?.name, `${c.etaMin}–${c.etaMax} min`, c.phone].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div className="cd-actions">
            {canEdit && <Link className="btn sec sm" href={`/admin/cafes/${c.id}`}><Icon name="edit" /> Edit cafe</Link>}
            {board && <button className="btn sm" onClick={() => openPanel('/cafe')}><Icon name="board" /> Open live board</button>}
          </div>
        </div>

        <div className="cd-stats">
          <div><span className="small">Orders today</span><b>{stats ? stats.orders : '—'}</b></div>
          <div><span className="small">Delivered</span><b>{stats ? stats.delivered : '—'}</b></div>
          <div><span className="small">Sales today</span><b>{stats ? rupees(stats.sales) : '—'}</b></div>
          <div><span className="small">On the way now</span><b>{stats ? stats.active : '—'}</b></div>
          <div><span className="small">Rating</span><b>★ {c.rating.toFixed(1)} <small>({c.ratingCount})</small></b></div>
          <div className="cd-switches">
            <label><span>Open today</span><Switch on={c.isOpen} label="Open today" disabled={!canSwitch || busy} onChange={(v) => void setFlag({ isOpen: v })} /></label>
            <label><span>Taking orders</span><Switch on={c.acceptingOrders} label="Taking orders" disabled={!canSwitch || busy} onChange={(v) => void setFlag({ acceptingOrders: v })} /></label>
          </div>
        </div>
        {!board && <div className="small cd-note">Today's numbers, combos, lunch and delivery staff need the Cafes “Live board” tick.</div>}
      </section>

      <div className="cd-tabs" role="tablist" aria-label="Manage this cafe">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : undefined} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'products' && (ok('menu.view')
        ? <CafeProducts key={c.id} cafe={c} back={`/admin/cafes/${c.id}/details`} />
        : <div className="card empty">You need the Menu “View” tick to see products.</div>)}
      {tab === 'combos' && <CombosTab cafeId={c.id} board={board} onManage={() => openPanel('/cafe/combos')} />}
      {tab === 'lunch' && <LunchTab cafeId={c.id} board={board} onManage={() => openPanel('/cafe/lunch')} />}
      {tab === 'team' && (
        <div className="cd-team">
          <section className="card cd-panel">
            <div className="row" style={{ marginBottom: 14 }}><div className="h3">Cafe logins</div></div>
            {ok('cafes.logins') ? <CafeLogins cafeId={c.id} /> : <div className="small">You need the Cafes “Cafe logins” tick.</div>}
          </section>
          <RidersCard cafeId={c.id} board={board} onManage={() => openPanel('/cafe/riders')} />
        </div>
      )}
    </main>
  );
}

function NeedsBoard() {
  return <div className="card empty">This needs the Cafes “Live board” tick. Ask a super admin.</div>;
}

function CombosTab({ cafeId, board, onManage }: { cafeId: string; board: boolean; onManage: () => void }) {
  const ok = useCan();
  const [list, setList] = useState<Combo[] | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => forCafe(cafeId).get<Combo[]>('/v1/cafe/combos').then(setList, (e: Error) => setError(e.message)), [cafeId]);
  useEffect(() => {
    if (board) void load();
  }, [board, load]);
  if (!board) return <NeedsBoard />;

  async function toggle(x: Combo) {
    try {
      await forCafe(cafeId).patch(`/v1/cafe/combos/${x.id}`, { isActive: !x.isActive });
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  }
  const when = (x: Combo) => {
    const days = x.days.length === 7 ? 'Every day' : x.days.length === 5 && x.days.every((d) => d <= 5) ? 'Mon–Fri' : x.days.map((d) => DAYS[d]).join(', ');
    return `${x.startTime && x.endTime ? `${x.startTime}–${x.endTime}` : 'All day'} · ${days}`;
  };

  return (
    <>
      <div className="lt-bar">
        <span className="small">A few products together for less. Prices are checked when a combo is saved.</span>
        <button className="btn sm" style={{ marginLeft: 'auto' }} onClick={onManage}>Manage combos</button>
      </div>
      {error && <div className="err">{error}</div>}
      {list && !list.length && <div className="card empty">No combos yet. Make one on Manage combos.</div>}
      <div className="cd-grid">
        {list?.map((x) => {
          const save = Math.max(0, x.mrp - x.price);
          return (
            <article key={x.id} className="card cd-combo" style={{ opacity: x.isActive ? 1 : 0.65 }}>
              <div className="row">
                {save > 0 ? <span className="badge acc">Save {rupees(save)}</span> : <span className="badge warn">No saving</span>}
                <span className={`badge ${x.isActive ? (x.availableNow ? 'ok' : 'info') : 'mute'}`}>{x.isActive ? (x.availableNow ? 'Live now' : 'Not now') : 'Off'}</span>
              </div>
              <div className="h3" style={{ fontSize: 17 }}>{x.emoji} {x.name}</div>
              <div className="small" style={{ color: '#4B4B4B' }}>{x.items.map((i) => `${i.qty > 1 ? `${i.qty}× ` : ''}${i.name}`).join(' + ')}</div>
              <div className="cd-combo-foot">
                <span className="small">{when(x)}{x.soldWeek !== undefined ? ` · ${x.soldWeek} sold this week` : ''}</span>
                <span><b>{rupees(x.price)}</b>{x.mrp > x.price && <s className="small"> {rupees(x.mrp)}</s>}</span>
              </div>
              {ok('menu.edit') && (
                <label className="cd-inline-switch"><span>Show to customers</span><Switch on={x.isActive} label={`${x.name} on`} onChange={() => void toggle(x)} /></label>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}

function LunchTab({ cafeId, board, onManage }: { cafeId: string; board: boolean; onManage: () => void }) {
  const [list, setList] = useState<Lunch[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (board) forCafe(cafeId).get<Lunch[]>('/v1/cafe/lunch').then(setList, (e: Error) => setError(e.message));
  }, [board, cafeId]);
  if (!board) return <NeedsBoard />;
  const day = (d: string) => new Date(`${d}T00:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

  return (
    <>
      <div className="lt-bar">
        <span className="small">Lunch posted for today and the next 6 days, with plates booked.</span>
        <button className="btn sm" style={{ marginLeft: 'auto' }} onClick={onManage}>Manage lunch</button>
      </div>
      {error && <div className="err">{error}</div>}
      <div className="card">
        {list && !list.length && <div className="empty">No lunch posted for this week.</div>}
        {list?.map((l, i) => {
          const pct = l.plates ? Math.min(100, Math.round((l.booked / l.plates) * 100)) : 0;
          return (
            <div key={l.id} className="cd-lunch" style={{ borderTop: i ? '1px solid var(--line)' : 0, opacity: l.isActive ? 1 : 0.6 }}>
              <div className="cd-lunch-day">{day(l.day)}</div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div><span className={`veg${l.isVeg ? '' : ' non'}`} /><b>{l.name}</b>{!l.isActive && <span className="badge mute" style={{ marginLeft: 6 }}>Off</span>}</div>
                <div className="small">{l.items || '—'} · book till {l.closesAt}</div>
              </div>
              <div className="cd-lunch-bar">
                <span className="small">{l.booked} / {l.plates} plates</span>
                <div><i style={{ width: `${pct}%` }} /></div>
              </div>
              <b style={{ width: 70, textAlign: 'right' }}>{rupees(l.price)}</b>
            </div>
          );
        })}
      </div>
    </>
  );
}

function RidersCard({ cafeId, board, onManage }: { cafeId: string; board: boolean; onManage: () => void }) {
  const [list, setList] = useState<Rider[] | null>(null);
  useEffect(() => {
    if (board) forCafe(cafeId).get<Rider[]>('/v1/cafe/riders').then(setList, () => setList([]));
  }, [board, cafeId]);
  return (
    <section className="card cd-panel">
      <div className="row" style={{ marginBottom: 10 }}>
        <div className="h3">Delivery staff</div>
        {board && <button className="btn sec sm" onClick={onManage}>Manage</button>}
      </div>
      {!board && <div className="small">This needs the Cafes “Live board” tick.</div>}
      {list && !list.length && <div className="small">No delivery staff saved yet. Saved names make “Send out” one tap on the live board.</div>}
      {list?.map((r) => (
        <div key={r.id} className="row cd-rider"><b>{r.name}</b><span className="small">{r.phone ?? 'No phone'}</span></div>
      ))}
    </section>
  );
}
