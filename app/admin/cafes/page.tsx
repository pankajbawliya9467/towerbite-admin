'use client';
import { useMemo, useState } from 'react';
import { Empty, SearchBox } from '@/components/ListTools';
import { useRouter } from 'next/navigation';
import { api, qs } from '@/lib/api';
import { useLoad } from '@/lib/useLoad';
import type { Cafe, Location } from '@/lib/types';
import { adminCafe } from '@/components/CafeContext';
import { PageHead } from '@/components/PageHead';
import { FoodTile } from '@/components/FoodTile';
import { Icon } from '@/components/Icon';
import { useCan } from '@/components/useCan';

export default function CafesPage() {
  const router = useRouter();
  const [locationId, setLocationId] = useState('');
  const locations = useLoad<Location[]>('/v1/admin/locations');
  const cafes = useLoad<Cafe[]>(`/v1/admin/cafes${qs({ locationId })}`);
  const [ordering, setOrdering] = useState(false);
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const shown = useMemo(() => {
    const t = search.toLowerCase();
    return (cafes.data ?? []).filter((c) =>
      (!t || `${c.name} ${c.cuisines} ${c.place}`.toLowerCase().includes(t))
      && (!state || (state === 'open' ? c.isActive && c.isOpen : state === 'closed' ? c.isActive && !c.isOpen : state === 'inactive' ? !c.isActive : true)));
  }, [cafes.data, search, state]);
  const ok = useCan();
  const canEdit = ok('cafes.edit') || ok('cafes.openclose') || ok('cafes.logins') || ok('locations.geo');
  const locName = (id: string) => locations.data?.find((l) => l.id === id)?.name ?? '';

  const go = (cafe: Cafe, path: string) => {
    adminCafe.set(cafe.id);
    router.push(path);
  };

  /** Cafes are never deleted (their orders and reports stay): inactive hides them from the app and website. */
  async function setActive(c: Cafe, active: boolean) {
    const ask = active
      ? `Make ${c.name} active again? It shows in the app and website and can take orders.`
      : `Make ${c.name} inactive?\n\nIt disappears from the app and website and takes no orders. Its menu, orders and reports are kept, and you can make it active again any time.`;
    if (!confirm(ask)) return;
    await api.patch(`/v1/admin/cafes/${c.id}`, { isActive: active }).catch((e: Error) => alert(e.message));
    await cafes.reload();
  }

  return (
    <main className="page">
      <PageHead title="Cafes" sub="Every cafe on TowerBites. Open a cafe to manage its products, combos, lunch and logins.">
        {ok('cafes.add') && <button className="btn sm" disabled={!locations.data?.length}
          onClick={() => router.push(`/admin/cafes/new${locationId ? `?location=${locationId}` : ''}`)}><Icon name="plus" /> Add cafe</button>}
      </PageHead>
      <div className="row" style={{ marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div className="wrap">
          <button className={`pill${!locationId ? ' on' : ''}`} onClick={() => (setLocationId(''), setOrdering(false))}>All locations</button>
          {locations.data?.map((l) => (
            <button key={l.id} className={`pill${locationId === l.id ? ' on' : ''}`} onClick={() => setLocationId(l.id)}>{l.name}</button>
          ))}
        </div>
        {ok('cafes.order') && <button className="btn sec sm" onClick={() => setOrdering(!ordering)} disabled={!locationId}
          title={locationId ? undefined : 'Pick a building first'}>
          {ordering ? 'Done' : 'Order in app'}
        </button>}
      </div>
      {ok('cafes.order') && !locationId && <p className="small" style={{ margin: '-12px 0 20px' }}>Pick a building to change the order its cafes show in the app.</p>}
      {ordering && ok('cafes.order') && locationId && cafes.data && (
        <CafeOrder key={locationId} locationId={locationId} cafes={cafes.data} onSaved={cafes.reload} />
      )}
      {!ordering && (
        <div className="lt-bar" style={{ marginTop: -8, marginBottom: 18 }}>
          <SearchBox value={search} onChange={setSearch} placeholder="Cafe, cuisine or place" />
          <select className="field lt-sel" value={state} aria-label="Cafe status" onChange={(e) => setState(e.target.value)}>
            <option value="">Every cafe</option><option value="open">Open now</option><option value="closed">Closed now</option><option value="inactive">Inactive</option>
          </select>
          {cafes.data && <span className="small">{shown.length} of {cafes.data.length}</span>}
        </div>
      )}
      {cafes.error && <div className="err">{cafes.error}</div>}
      {cafes.data && !shown.length && <div className="card"><Empty>No cafes match.</Empty></div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
        {shown.map((c) => (
          <div key={c.id} className="card" style={{ overflow: 'hidden', opacity: c.isActive ? 1 : 0.65 }}>
            <div style={{ height: 132, background: c.coverColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, position: 'relative' }}>
              {c.imageUrl ? <img src={c.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : c.emoji}
              {c.logoUrl && <img src={c.logoUrl} alt="" style={{ position: 'absolute', left: 14, bottom: -22, width: 52, height: 52, borderRadius: 14, objectFit: 'cover', background: '#fff', boxShadow: '0 0 0 3px #fff' }} />}
            </div>
            <div style={{ padding: '20px 22px 22px' }}>
              <div className="row" style={{ gap: 12 }}>
                <div className="h2" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {!c.isActive && <span className="badge warn">Inactive</span>}
                  <span className={`badge ${c.isOpen ? 'ok' : 'mute'}`}>{c.isOpen ? 'Open' : 'Closed'}</span>
                  {c.isOpen && !c.acceptingOrders && <span className="badge warn">Paused</span>}
                </div>
              </div>
              <div className="sub" style={{ marginTop: 4, fontSize: 14 }}>{[c.cuisines, c.place].filter(Boolean).join(' · ')}</div>
              <div className="small" style={{ marginTop: 2 }}>{locName(c.locationId)} · {c.etaMin}–{c.etaMax} min</div>
              <div className="cf-meta">
                <span>★ {c.rating.toFixed(1)} <small>({c.ratingCount})</small></span>
                {c.geoCheck && <span className="badge info">GPS check</span>}
                {c.phone && <span className="small">{c.phone}</span>}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button className="btn dark sm" style={{ flex: 1 }} onClick={() => router.push(`/admin/cafes/${c.id}/details`)}>
                  View details <span aria-hidden="true">→</span>
                </button>
                {ok('cafes.board') && <button className="btn sec sm" onClick={() => go(c, '/cafe')}><Icon name="board" /> Live board</button>}
                {canEdit && <button className="btn sec sm" onClick={() => router.push(`/admin/cafes/${c.id}`)} aria-label={`Edit ${c.name}`}><Icon name="edit" /></button>}
              </div>
              {ok('cafes.delete') && <button className="link" style={{ marginTop: 12, fontSize: 13, color: c.isActive ? 'var(--sub)' : 'var(--green)' }}
                onClick={() => setActive(c, !c.isActive)}>
                {c.isActive ? 'Make inactive (hide from app)' : 'Make active again'}
              </button>}
            </div>
          </div>
        ))}
      </div>
      {cafes.data?.length === 0 && <div className="card empty">No cafes here yet.</div>}
    </main>
  );
}

/**
 * Top-to-bottom order of a building's cafes in the app and website. Each move saves straight away and the
 * app updates live. Open cafes still show before closed ones; this order applies within each group.
 */
function CafeOrder({ locationId, cafes, onSaved }: { locationId: string; cafes: Cafe[]; onSaved: () => Promise<unknown> }) {
  const [list, setList] = useState(() => [...cafes].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name)));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function move(i: number, to: number) {
    if (to < 0 || to >= list.length || saving) return;
    const next = [...list];
    const [c] = next.splice(i, 1);
    next.splice(to, 0, c);
    const before = list;
    setList(next); // move at once, save in the background
    setSaving(true);
    setErr('');
    try {
      await api.put(`/v1/admin/locations/${locationId}/cafe-order`, { cafeIds: next.map((x) => x.id) });
      await onSaved();
    } catch (e) {
      setList(before);
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ padding: 20, marginBottom: 24, maxWidth: 640 }}>
      <div className="row" style={{ alignItems: 'baseline' }}>
        <div className="h3">Order in the app</div>
        <span className="small">{saving ? 'Saving…' : 'Saved · the app updates right away'}</span>
      </div>
      <p className="small" style={{ margin: '6px 0 14px' }}>
        Top to bottom, as customers see it. Cafes that are closed or paused still drop below the open ones until they open.
      </p>
      {err && <div className="err" style={{ marginBottom: 10 }}>{err}</div>}
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map((c, i) => (
          <li key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface)' }}>
            <b style={{ width: 22, textAlign: 'right', color: 'var(--sub)' }}>{i + 1}</b>
            <FoodTile emoji={c.emoji} imageUrl={c.logoUrl ?? c.imageUrl} color={c.coverColor} size={36} />
            <span style={{ flex: 1, minWidth: 0, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
            {!c.isActive ? <span className="badge warn">Inactive · hidden</span>
              : !(c.isOpen && c.acceptingOrders) && <span className="badge mute">{c.isOpen ? 'Paused' : 'Closed'}</span>}
            <button className="iconbtn" style={{ width: 36, height: 36 }} disabled={i === 0 || saving} onClick={() => move(i, 0)} aria-label={`Move ${c.name} to the top`} title="Move to top">⤒</button>
            <button className="iconbtn" style={{ width: 36, height: 36 }} disabled={i === 0 || saving} onClick={() => move(i, i - 1)} aria-label={`Move ${c.name} up`} title="Move up">↑</button>
            <button className="iconbtn" style={{ width: 36, height: 36 }} disabled={i === list.length - 1 || saving} onClick={() => move(i, i + 1)} aria-label={`Move ${c.name} down`} title="Move down">↓</button>
          </li>
        ))}
      </ol>
    </div>
  );
}
