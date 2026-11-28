'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { slugify } from '@/lib/format';
import type { Cafe, Location } from '@/lib/types';
import { FormCard, FormPage } from '@/components/FormPage';
import { Field } from '@/components/Field';
import { SwitchRow } from '@/components/Switch';
import { ImageField } from '@/components/ImageField';
import { Icon } from '@/components/Icon';
import { adminCafe } from '@/components/CafeContext';
import { useCan } from '@/components/useCan';
import { CafeLogins } from './CafeLogins';

export type CafeDraft = Partial<Cafe> & { locationId: string };
type Tab = 'details' | 'login';
const TAGS = ['coffee', 'snacks', 'meals', 'healthy'];
const defaults = {
  name: '', slug: '', cuisines: '', place: '', emoji: '☕', coverColor: '#FDEBDD', phone: null, imageUrl: null, logoUrl: null,
  etaMin: 10, etaMax: 15, tags: [] as string[], isOpen: true, acceptingOrders: true,
  minOrder: 0,
};

/**
 * New / edit cafe, on its own page: Details and (for an existing cafe) its logins. Where orders may come from is
 * set on the cafe's location (its area on the map), not here.
 */
export function CafeEditor({ draft, locations, startTab }: { draft: CafeDraft; locations: Location[]; startTab?: Tab }) {
  const router = useRouter();
  const [d, setD] = useState({ ...defaults, ...draft });
  const [slugTouched, setSlugTouched] = useState(!!draft.id);
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));
  const tags = [...new Set([...TAGS, ...d.tags])];
  const ok = useCan();
  const isNew = !d.id;
  const edit = isNew ? ok('cafes.add') : ok('cafes.edit');
  const openclose = isNew || ok('cafes.openclose');
  const tabsAllowed: Tab[] = [
    ...(edit || openclose ? (['details'] as Tab[]) : []),
    ...(!isNew && ok('cafes.logins') ? (['login'] as Tab[]) : []),
  ];
  const [tab, setTab] = useState<Tab>(startTab && tabsAllowed.includes(startTab) ? startTab : tabsAllowed[0] ?? 'details');
  const labels: Record<Tab, string> = { details: 'Details', login: 'Login' };

  async function save() {
    const body = {
      locationId: d.locationId, name: d.name, slug: d.slug, cuisines: d.cuisines, place: d.place, emoji: d.emoji,
      coverColor: d.coverColor, phone: d.phone || null, imageUrl: d.imageUrl, logoUrl: d.logoUrl, etaMin: Number(d.etaMin), etaMax: Number(d.etaMax),
      tags: d.tags, isOpen: d.isOpen, acceptingOrders: d.acceptingOrders,
      minOrder: Math.max(0, Math.round(Number(d.minOrder) || 0)),
    };
    if (!d.name.trim() || !d.slug.trim()) throw new Error('Name and web address are needed (Details tab).');
    if (d.id) {
      await api.patch(`/v1/admin/cafes/${d.id}`, body);
    } else {
      const made = await api.post<Cafe>('/v1/admin/cafes', body);
      router.replace(`/admin/cafes/${made.id}`);
    }
  }

  const openBoard = () => {
    adminCafe.set(d.id!);
    router.push('/cafe');
  };

  return (
    <FormPage
      crumbs={[{ label: 'Cafes', href: '/admin/cafes' }, { label: isNew ? 'New cafe' : draft.name ?? 'Cafe' }]}
      title={isNew ? 'New cafe' : draft.name ?? 'Cafe'}
      back="/admin/cafes"
      submitLabel={isNew ? 'Create cafe' : 'Save changes'}
      onSubmit={save}
      hideSave={tab === 'login'}
      actions={!isNew && ok('cafes.board') ? <button type="button" className="btn sec sm" onClick={openBoard}><Icon name="board" /> Live board</button> : null}
      tabs={tabsAllowed.length > 1 ? tabsAllowed.map((t) => (
        <button key={t} type="button" className={`pill${tab === t ? ' on' : ''}`} aria-pressed={tab === t} onClick={() => setTab(t)}>{labels[t]}</button>
      )) : undefined}
      side={tab === 'details' ? (
        <>
          <fieldset className="fs" disabled={!edit}>
            <FormCard title="Photos">
              <Field label="Logo · square, 512×512" full>
                <ImageField value={d.logoUrl} onChange={(url) => set('logoUrl', url)} folder="cafes" emoji={d.emoji} color={d.coverColor} />
              </Field>
              <Field label="Cover photo · wide, 1200×800" full>
                <ImageField value={d.imageUrl} onChange={(url) => set('imageUrl', url)} folder="cafes" emoji={d.emoji} color={d.coverColor} />
              </Field>
            </FormCard>
          </fieldset>
          <fieldset className="fs" disabled={!openclose} title={openclose ? undefined : "You don't have the Open / pause tick"}>
            <FormCard title="Status">
              <div className="full"><SwitchRow label="Open" on={d.isOpen} onChange={(v) => set('isOpen', v)} /></div>
              <div className="full"><SwitchRow label="Accepting orders" on={d.acceptingOrders} onChange={(v) => set('acceptingOrders', v)} /></div>
            </FormCard>
          </fieldset>
        </>
      ) : undefined}
    >
      {tab === 'details' && (
        <fieldset className="fs" disabled={!edit}>
          <FormCard title="Basic details">
            <Field label="Name">
              <input className="field" required value={d.name} placeholder="Krunchy Kafe"
                onChange={(e) => setD((x) => ({ ...x, name: e.target.value, slug: slugTouched ? x.slug : slugify(e.target.value) }))} />
            </Field>
            <Field label="Web address (slug)">
              <input className="field" required value={d.slug} onChange={(e) => { setSlugTouched(true); set('slug', e.target.value); }} />
            </Field>
            <Field label="Location">
              <select className="field" value={d.locationId} onChange={(e) => set('locationId', e.target.value)}>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>
            <Field label="Place in the building">
              <input className="field" value={d.place} placeholder="Tower B, Ground floor" onChange={(e) => set('place', e.target.value)} />
            </Field>
            <Field label="Cuisines" full>
              <input className="field" value={d.cuisines} placeholder="Coffee · Sandwiches" onChange={(e) => set('cuisines', e.target.value)} />
            </Field>
            <Field label="Phone">
              <input className="field" value={d.phone ?? ''} placeholder="+91…" onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="Delivery time (min)">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input className="field" type="number" min={1} value={d.etaMin} onChange={(e) => set('etaMin', Number(e.target.value))} />
                <span className="sub">to</span>
                <input className="field" type="number" min={1} value={d.etaMax} onChange={(e) => set('etaMax', Number(e.target.value))} />
              </div>
            </Field>
            <Field label="Minimum order (₹) · 0 = none">
              <input className="field" type="number" min={0} max={10000} step={10} value={d.minOrder ?? 0} onChange={(e) => set('minOrder', Number(e.target.value))} />
            </Field>
            <Field label="Emoji">
              <input className="field" style={{ fontSize: 22 }} value={d.emoji} maxLength={8} onChange={(e) => set('emoji', e.target.value)} />
            </Field>
            <Field label="Cover color">
              <div style={{ display: 'flex', gap: 10 }}>
                <input type="color" value={d.coverColor} onChange={(e) => set('coverColor', e.target.value.toUpperCase())}
                  style={{ width: 52, height: 52, border: '1.5px solid var(--line)', borderRadius: 14, padding: 4, background: '#fff' }} />
                <input className="field" value={d.coverColor} pattern="#[0-9a-fA-F]{6}" onChange={(e) => set('coverColor', e.target.value)} />
              </div>
            </Field>
          </FormCard>
          <FormCard title="Tags" note="Customers filter cafes by these on the home screen.">
            <div className="wrap full">
              {tags.map((t) => (
                <button type="button" key={t} className={`pill${d.tags.includes(t) ? ' on' : ''}`} style={{ marginRight: 0, textTransform: 'capitalize' }}
                  onClick={() => set('tags', d.tags.includes(t) ? d.tags.filter((x) => x !== t) : [...d.tags, t])}>{t}</button>
              ))}
            </div>
          </FormCard>
        </fieldset>
      )}

      {tab === 'login' && d.id && (
        <section className="card fp-card">
          <div className="h2">Cafe login</div>
          <div className="small" style={{ margin: '4px 0 14px' }}>The email and password the cafe uses for its live board. These save on their own.</div>
          <CafeLogins cafeId={d.id} />
        </section>
      )}
    </FormPage>
  );
}
