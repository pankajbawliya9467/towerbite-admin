'use client';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { slugify } from '@/lib/format';
import { useLoad } from '@/lib/useLoad';
import type { Location, Tower } from '@/lib/types';
import { PageHead } from '@/components/PageHead';
import { FormModal } from '@/components/FormModal';
import { Field } from '@/components/Field';
import { SwitchRow } from '@/components/Switch';
import { Icon } from '@/components/Icon';

type Draft = Omit<Location, 'id'> & { id?: string };
const blank: Draft = { slug: '', name: '', area: '', city: '', isActive: true };

export default function LocationsPage() {
  const locations = useLoad<Location[]>('/v1/admin/locations');
  const towers = useLoad<Tower[]>('/v1/admin/towers');
  const [editing, setEditing] = useState<Draft | null>(null);

  async function remove(l: Location) {
    if (!confirm(`Delete ${l.name}? Its towers and cafes will be removed too.`)) return;
    await api.del(`/v1/admin/locations/${l.id}`).catch((e: Error) => alert(e.message));
    await Promise.all([locations.reload(), towers.reload()]);
  }

  return (
    <main className="page">
      <PageHead title="Locations" sub="Tech parks and the towers employees deliver to.">
        <button className="btn sm" onClick={() => setEditing(blank)}><Icon name="plus" /> Add location</button>
      </PageHead>
      {locations.error && <div className="err">{locations.error}</div>}
      <div className="stack" style={{ gap: 16 }}>
        {locations.data?.map((l) => (
          <div key={l.id} className="card" style={{ padding: 28 }}>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="h2">{l.name}</div>
                  <span className={`badge ${l.isActive ? 'ok' : 'mute'}`}>{l.isActive ? 'Live' : 'Hidden'}</span>
                </div>
                <div className="sub" style={{ marginTop: 4 }}>{[l.area, l.city].filter(Boolean).join(' · ')} <span style={{ color: 'var(--faint)' }}>· /{l.slug}</span></div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn sec sm" onClick={() => setEditing(l)}><Icon name="edit" /> Edit</button>
                <button className="iconbtn" onClick={() => remove(l)} aria-label="Delete location"><Icon name="trash" /></button>
              </div>
            </div>
            <div className="cap" style={{ marginTop: 24, marginBottom: 12 }}>Towers</div>
            <Towers location={l} towers={(towers.data ?? []).filter((t) => t.locationId === l.id)} reload={towers.reload} />
          </div>
        ))}
        {locations.data?.length === 0 && <div className="card empty">No locations yet.</div>}
      </div>
      {editing && <LocationForm draft={editing} onClose={() => setEditing(null)} onSaved={locations.reload} />}
    </main>
  );
}

function Towers({ location, towers, reload }: { location: Location; towers: Tower[]; reload: () => Promise<void> }) {
  const [name, setName] = useState('');

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post('/v1/admin/towers', { locationId: location.id, name: name.trim(), sort: towers.length + 1 })
      .catch((err: Error) => alert(err.message));
    setName('');
    await reload();
  }

  async function remove(t: Tower) {
    if (!confirm(`Remove ${t.name}?`)) return;
    await api.del(`/v1/admin/towers/${t.id}`).catch((e: Error) => alert(e.message));
    await reload();
  }

  return (
    <form className="wrap" style={{ alignItems: 'center' }} onSubmit={add}>
      {towers.map((t) => (
        <span key={t.id} className="pill" style={{ marginRight: 0, paddingRight: 8 }}>
          {t.name}
          <button type="button" onClick={() => remove(t)} aria-label={`Remove ${t.name}`}
            style={{ color: 'var(--faint)', display: 'inline-flex', padding: 4 }}><Icon name="x" /></button>
        </span>
      ))}
      <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="New tower, e.g. Tower C"
        style={{ width: 220, height: 38, borderRadius: 999, fontSize: 14 }} />
      <button className="btn sec sm" style={{ height: 38, borderRadius: 999 }} disabled={!name.trim()}><Icon name="plus" /> Add</button>
    </form>
  );
}

function LocationForm({ draft, onClose, onSaved }: { draft: Draft; onClose: () => void; onSaved: () => Promise<void> }) {
  const [d, setD] = useState(draft);
  const [slugTouched, setSlugTouched] = useState(!!draft.id);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  async function save() {
    const { id, ...body } = d;
    if (id) await api.patch(`/v1/admin/locations/${id}`, body);
    else await api.post('/v1/admin/locations', body);
    await onSaved();
  }

  return (
    <FormModal title={d.id ? 'Edit location' : 'New location'} onClose={onClose} onSubmit={save}>
      <Field label="Name" full>
        <input className="field" required value={d.name} placeholder="Spaze Tech Park"
          onChange={(e) => setD((x) => ({ ...x, name: e.target.value, slug: slugTouched ? x.slug : slugify(e.target.value) }))} />
      </Field>
      <Field label="Web address (slug)" full>
        <input className="field" required value={d.slug} onChange={(e) => { setSlugTouched(true); set('slug', e.target.value); }} />
      </Field>
      <Field label="Area"><input className="field" value={d.area} placeholder="Sector 49" onChange={(e) => set('area', e.target.value)} /></Field>
      <Field label="City"><input className="field" value={d.city} placeholder="Gurugram" onChange={(e) => set('city', e.target.value)} /></Field>
      <div className="full"><SwitchRow label="Live for employees" on={d.isActive} onChange={(v) => set('isActive', v)} /></div>
    </FormModal>
  );
}
