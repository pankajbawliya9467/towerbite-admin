'use client';
import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { rupees } from '@/lib/format';
import { useLoad } from '@/lib/useLoad';
import type { CafeWithMenu, Combo, ComboIdea, MenuItem } from '@/lib/types';
import { useCafe } from '@/components/CafeContext';
import { Icon } from '@/components/Icon';
import { ImageField } from '@/components/ImageField';
import { Switch } from '@/components/Switch';

type Draft = {
  id?: string; name: string; description: string; price: number; emoji: string; imageUrl: string | null;
  startTime: string | null; endTime: string | null; days: number[]; isActive: boolean; sort: number;
  items: { menuItemId: string; qty: number }[];
};

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];
const DAY = ['', 'M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_NAME = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WINDOWS: { label: string; start: string | null; end: string | null }[] = [
  { label: 'All day', start: null, end: null },
  { label: '8–11 AM', start: '08:00', end: '11:00' },
  { label: '12–3 PM', start: '12:00', end: '15:00' },
  { label: '4–7 PM', start: '16:00', end: '19:00' },
];
const blank = (sort: number): Draft => ({
  name: '', description: '', price: 0, emoji: '🍱', imageUrl: null, startTime: null, endTime: null, days: ALL_DAYS, isActive: true, sort, items: [],
});
const t12 = (v: string) => {
  const [h, m] = v.split(':').map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
};
const comboWhen = (x: Pick<Combo, 'startTime' | 'endTime' | 'days'>) =>
  [x.days.length === 7 ? '' : x.days.map((d) => DAY_NAME[d]).join(', '), x.startTime && x.endTime ? `${t12(x.startTime)}–${t12(x.endTime)}` : 'All day']
    .filter(Boolean).join(' · ');

export default function CombosPage() {
  const { isAdmin } = useCafe();
  const combos = useLoad<Combo[]>('/v1/cafe/combos');
  const menu = useLoad<CafeWithMenu>('/v1/cafe/menu');
  const idea = useLoad<ComboIdea | null>('/v1/cafe/combos/suggestion');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [find, setFind] = useState('');
  const items = menu.data?.items ?? [];
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const mrp = draft ? draft.items.reduce((s, l) => s + (byId.get(l.menuItemId)?.price ?? 0) * l.qty, 0) : 0;
  const save = draft ? mrp - draft.price : 0;
  const matches = find.trim()
    ? items.filter((i) => i.name.toLowerCase().includes(find.trim().toLowerCase()) && !draft?.items.some((l) => l.menuItemId === i.id)).slice(0, 8)
    : [];

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => d && { ...d, [k]: v });
  const setQty = (id: string, qty: number) =>
    setDraft((d) => d && { ...d, items: qty <= 0 ? d.items.filter((l) => l.menuItemId !== id) : d.items.map((l) => (l.menuItemId === id ? { ...l, qty: Math.min(10, qty) } : l)) });
  const addItem = (i: MenuItem) => {
    setDraft((d) => d && { ...d, items: [...d.items, { menuItemId: i.id, qty: 1 }], emoji: d.items.length ? d.emoji : i.emoji });
    setFind('');
  };

  function edit(x: Combo) {
    setErr('');
    setDraft({
      id: x.id, name: x.name, description: x.description, price: x.price, emoji: x.emoji, imageUrl: x.imageUrl,
      startTime: x.startTime, endTime: x.endTime, days: x.days, isActive: x.isActive, sort: x.sort,
      items: x.items.map((i) => ({ menuItemId: i.menuItemId, qty: i.qty })),
    });
  }

  function fromIdea(i: ComboIdea) {
    const total = i.a.price + i.b.price;
    setErr('');
    setDraft({
      ...blank((combos.data?.length ?? 0) + 1),
      name: `${i.a.name} + ${i.b.name}`.slice(0, 60),
      price: Math.max(0, Math.round((total * 0.9) / 5) * 5),
      emoji: byId.get(i.a.menuItemId)?.emoji ?? '🍱',
      items: [{ menuItemId: i.a.menuItemId, qty: 1 }, { menuItemId: i.b.menuItemId, qty: 1 }],
    });
  }

  async function submit() {
    if (!draft) return;
    setBusy(true);
    setErr('');
    try {
      const { id, ...body } = draft;
      if (id) await api.patch(`/v1/cafe/combos/${id}`, body);
      else await api.post('/v1/cafe/combos', body);
      setDraft(null);
      await Promise.all([combos.reload(), idea.reload()]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!draft?.id || !confirm(`Delete the combo “${draft.name}”?`)) return;
    await api.del(`/v1/cafe/combos/${draft.id}`).catch((e: Error) => alert(e.message));
    setDraft(null);
    await combos.reload();
  }

  async function toggle(x: Combo, isActive: boolean) {
    await api.patch(`/v1/cafe/combos/${x.id}`, { isActive }).catch((e: Error) => alert(e.message));
    await combos.reload();
  }

  const windowKey = draft ? WINDOWS.findIndex((w) => w.start === draft.startTime && w.end === draft.endTime) : -1;

  return (
    <main className="page">
      <div className="pagehead">
        <div>
          <div className="h1">Combos</div>
          <p className="sub">A few items together for a little less. Customers see them first on your menu, and as an “upgrade” in their cart.</p>
        </div>
        <div className="pagehead-actions">
          <button className="btn sm" onClick={() => (setErr(''), setDraft(blank((combos.data?.length ?? 0) + 1)))}><Icon name="plus" /> New combo</button>
        </div>
      </div>

      {idea.data && !draft && (
        <div className="cb-idea">
          <Icon name="bulb" size={22} />
          <div style={{ flex: 1 }}>
            <b>Idea:</b> {idea.data.pct}% of people who order {idea.data.a.name} also take {idea.data.b.name} ({idea.data.orders} orders in 30 days). Make it a combo?
          </div>
          <button className="btn sec sm" onClick={() => fromIdea(idea.data!)}>Use this</button>
        </div>
      )}
      {combos.error && <div className="err">{combos.error}</div>}

      <div className="cb-grid">
        <section className="stack" style={{ gap: 10 }} aria-label="Your combos">
          <div className="cap">Your combos · {combos.data?.length ?? 0}</div>
          {combos.data?.length === 0 && <div className="card empty" style={{ padding: 32 }}>No combos yet. Tap “New combo”.</div>}
          {combos.data?.map((x) => (
            <div key={x.id} className={`card cb-card${draft?.id === x.id ? ' on' : ''}`} style={{ opacity: x.isActive ? 1 : 0.6 }}>
              <button type="button" className="cb-card-main" onClick={() => edit(x)} aria-label={`Edit ${x.name}`}>
                <span className="cb-tile" style={{ background: menu.data?.coverColor }}>
                  {x.imageUrl ? <img src={x.imageUrl} alt="" /> : x.emoji}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="h3" style={{ display: 'block' }}>{x.name}</span>
                  <span className="small" style={{ display: 'block' }}>{x.items.map((i) => `${i.qty > 1 ? `${i.qty} ` : ''}${i.name}`).join(' + ')} · {comboWhen(x)}</span>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginTop: 4 }}>
                    <b>{rupees(x.price)}</b>
                    {x.mrp > x.price && <s className="small">{rupees(x.mrp)}</s>}
                    <span className="small" style={{ color: x.isActive ? (x.availableNow ? 'var(--green)' : 'var(--sub)') : 'var(--sub)', fontWeight: 700 }}>
                      {!x.isActive ? 'Off' : x.availableNow ? `${x.soldWeek ?? 0} sold this week` : x.items.some((i) => !i.isAvailable) ? 'An item is out of stock' : 'Not in its time now'}
                    </span>
                  </span>
                </span>
              </button>
              <Switch on={x.isActive} onChange={(on) => toggle(x, on)} label={`${x.name} on`} />
            </div>
          ))}
        </section>

        {draft && (
          <section className="card cb-editor" aria-label="Edit combo">
            <div className="row">
              <div className="h2" style={{ fontSize: 20 }}>{draft.id ? `Edit: ${draft.name}` : 'New combo'}</div>
              <button className="iconbtn" onClick={() => setDraft(null)} aria-label="Close"><Icon name="x" /></button>
            </div>
            <div className="form">
              <label><span className="label">Combo name</span>
                <input className="field" value={draft.name} maxLength={60} placeholder="Chai Samosa Break" onChange={(e) => set('name', e.target.value)} />
              </label>
              <label><span className="label">Short line (shown in the app)</span>
                <input className="field" value={draft.description} maxLength={120} placeholder="Evening chai with 2 hot samosas" onChange={(e) => set('description', e.target.value)} />
              </label>
            </div>

            <div>
              <span className="label">What’s in it</span>
              <div className="cb-items">
                {draft.items.map((l) => {
                  const i = byId.get(l.menuItemId);
                  return (
                    <div key={l.menuItemId} className="cb-line">
                      <span style={{ fontSize: 20 }}>{i?.emoji}</span>
                      <span style={{ flex: 1, fontWeight: 700 }}>{i?.name ?? 'Removed item'} <span className="small">· {rupees(i?.price ?? 0)}</span></span>
                      <span className="cb-qty">
                        <button type="button" onClick={() => setQty(l.menuItemId, l.qty - 1)} aria-label={`One less ${i?.name}`}>−</button>
                        <b>{l.qty}</b>
                        <button type="button" onClick={() => setQty(l.menuItemId, l.qty + 1)} aria-label={`One more ${i?.name}`}>+</button>
                      </span>
                      <b style={{ width: 64, textAlign: 'right' }}>{rupees((i?.price ?? 0) * l.qty)}</b>
                    </div>
                  );
                })}
                {draft.items.length < 6 && (
                  <div className="cb-find">
                    <Icon name="search" />
                    <input className="field" value={find} placeholder="Add an item from your menu…" onChange={(e) => setFind(e.target.value)} aria-label="Find an item" />
                    {matches.length > 0 && (
                      <div className="cb-matches" role="listbox">
                        {matches.map((i) => (
                          <button type="button" key={i.id} onClick={() => addItem(i)} role="option" aria-selected={false}>
                            <span>{i.emoji}</span><span style={{ flex: 1 }}>{i.name}</span><span className="small">{rupees(i.price)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="cb-price">
              <div><div className="small" style={{ fontWeight: 700 }}>Separately</div><div style={{ fontSize: 20, fontWeight: 800 }}>{rupees(mrp)}</div></div>
              <Icon name="back" />
              <label><span className="small" style={{ fontWeight: 700, display: 'block' }}>Combo price (₹)</span>
                <input className="field" type="number" min={0} value={draft.price || ''} onChange={(e) => set('price', Number(e.target.value))} style={{ width: 120, height: 42, fontSize: 18, fontWeight: 800 }} />
              </label>
              <div className={`cb-save${save < 0 ? ' bad' : ''}`}>
                {save > 0 ? `Customer saves ${rupees(save)} (${Math.round((save / Math.max(1, mrp)) * 100)}%)` : save < 0 ? 'More than separately' : 'No saving yet'}
              </div>
            </div>

            <div className="cb-when">
              <div>
                <span className="label">When</span>
                <div className="wrap">
                  {WINDOWS.map((w, k) => (
                    <button type="button" key={w.label} className={`pill${windowKey === k ? ' on' : ''}`} onClick={() => setDraft({ ...draft, startTime: w.start, endTime: w.end })}>{w.label}</button>
                  ))}
                  <button type="button" className={`pill${windowKey === -1 ? ' on' : ''}`} onClick={() => windowKey !== -1 && setDraft({ ...draft, startTime: '17:00', endTime: '20:00' })}>Custom</button>
                </div>
                {windowKey === -1 && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                    <input className="field" type="time" value={draft.startTime ?? ''} onChange={(e) => set('startTime', e.target.value || null)} aria-label="From" style={{ width: 140 }} />
                    <span className="small">to</span>
                    <input className="field" type="time" value={draft.endTime ?? ''} onChange={(e) => set('endTime', e.target.value || null)} aria-label="To" style={{ width: 140 }} />
                  </div>
                )}
              </div>
              <div>
                <span className="label">Days</span>
                <div className="wrap">
                  {ALL_DAYS.map((d) => {
                    const on = draft.days.includes(d);
                    return (
                      <button type="button" key={d} className={`pill cb-day${on ? ' on' : ''}`} aria-pressed={on} aria-label={DAY_NAME[d]}
                        onClick={() => set('days', on ? draft.days.filter((x) => x !== d) : [...draft.days, d].sort())}>{DAY[d]}</button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="form">
              <label><span className="label">Emoji (if no photo)</span>
                <input className="field" value={draft.emoji} maxLength={8} onChange={(e) => set('emoji', e.target.value)} style={{ fontSize: 22 }} />
              </label>
              {isAdmin ? (
                <div><span className="label">Photo</span>
                  <ImageField value={draft.imageUrl} onChange={(u) => set('imageUrl', u)} folder="combos" emoji={draft.emoji} color={menu.data?.coverColor ?? '#FDEBDD'} />
                </div>
              ) : <div />}
            </div>

            {err && <div className="err">{err}</div>}
            <div className="row" style={{ gap: 12 }}>
              <span className="small" style={{ flex: 1 }}>If any item runs out, the combo shows “Sold out” in the app by itself.</span>
              {draft.id && <button type="button" className="btn danger sm" onClick={remove}>Delete</button>}
              <button type="button" className="btn" disabled={busy || !draft.name.trim() || draft.items.length === 0 || !draft.days.length} onClick={submit}>
                {busy ? 'Saving…' : 'Save combo'}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
