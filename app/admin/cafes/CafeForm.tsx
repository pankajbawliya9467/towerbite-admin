'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { slugify } from '@/lib/format';
import type { Cafe, Location } from '@/lib/types';
import { FormModal } from '@/components/FormModal';
import { Field } from '@/components/Field';
import { SwitchRow } from '@/components/Switch';
import { ImageField } from '@/components/ImageField';

export type CafeDraft = Partial<Cafe> & { locationId: string };
const TAGS = ['coffee', 'snacks', 'meals', 'healthy'];
const defaults = {
  name: '', slug: '', cuisines: '', place: '', emoji: '☕', coverColor: '#FDEBDD', phone: null, imageUrl: null,
  etaMin: 10, etaMax: 15, tags: [] as string[], isOpen: true, acceptingOrders: true,
};

export function CafeForm({ draft, locations, onClose, onSaved }: {
  draft: CafeDraft; locations: Location[]; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [d, setD] = useState({ ...defaults, ...draft });
  const [slugTouched, setSlugTouched] = useState(!!draft.id);
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));
  const tags = [...new Set([...TAGS, ...d.tags])];

  async function save() {
    const body = {
      locationId: d.locationId, name: d.name, slug: d.slug, cuisines: d.cuisines, place: d.place, emoji: d.emoji,
      coverColor: d.coverColor, phone: d.phone || null, imageUrl: d.imageUrl, etaMin: Number(d.etaMin), etaMax: Number(d.etaMax),
      tags: d.tags, isOpen: d.isOpen, acceptingOrders: d.acceptingOrders,
    };
    if (d.id) await api.patch(`/v1/admin/cafes/${d.id}`, body);
    else await api.post('/v1/admin/cafes', body);
    await onSaved();
  }

  return (
    <FormModal title={d.id ? `Edit ${draft.name}` : 'New cafe'} wide onClose={onClose} onSubmit={save}>
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
      <Field label="Tags" full>
        <div className="wrap">
          {tags.map((t) => (
            <button type="button" key={t} className={`pill${d.tags.includes(t) ? ' on' : ''}`} style={{ marginRight: 0, textTransform: 'capitalize' }}
              onClick={() => set('tags', d.tags.includes(t) ? d.tags.filter((x) => x !== t) : [...d.tags, t])}>{t}</button>
          ))}
        </div>
      </Field>
      <Field label="Cover image" full>
        <ImageField value={d.imageUrl} onChange={(url) => set('imageUrl', url)} folder="cafes" emoji={d.emoji} color={d.coverColor} />
      </Field>
      <SwitchRow label="Open" on={d.isOpen} onChange={(v) => set('isOpen', v)} />
      <SwitchRow label="Accepting orders" on={d.acceptingOrders} onChange={(v) => set('acceptingOrders', v)} />
    </FormModal>
  );
}
