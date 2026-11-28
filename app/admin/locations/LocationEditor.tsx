'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { slugify } from '@/lib/format';
import type { Location, Tower } from '@/lib/types';
import { FormCard, FormPage } from '@/components/FormPage';
import { Field } from '@/components/Field';
import { SwitchRow } from '@/components/Switch';
import { useCan } from '@/components/useCan';
import { Towers } from './Towers';
import { AreaPicker } from '@/components/AreaPicker';

export type Draft = Omit<Location, 'id'> & { id?: string };
export const blank: Draft = { slug: '', name: '', area: '', city: '', isActive: false, areaGeo: null, outsideAllowed: false };

/** New / edit location on its own page, with its towers. */
export function LocationEditor({ draft, towers, reloadTowers }: { draft: Draft; towers: Tower[]; reloadTowers: () => Promise<void> }) {
  const router = useRouter();
  const [d, setD] = useState(draft);
  const [slugTouched, setSlugTouched] = useState(!!draft.id);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const ok = useCan();
  const edit = d.id ? ok('locations.edit') : ok('locations.add');
  const live = d.id ? ok('locations.delete') : ok('locations.add');
  const geo = ok('locations.geo');
  const hasArea = !!d.areaGeo && d.areaGeo.length >= 3;
  const areaChanged = JSON.stringify(d.areaGeo) !== JSON.stringify(draft.areaGeo ?? null);

  async function save() {
    const { id, areaGeo, ...body } = d;
    if (body.isActive && !(areaGeo && areaGeo.length >= 3)) throw new Error("Draw the location's area on the map before making it live.");
    if (id) {
      // The area is saved first, so "live" can be switched on in the same save.
      if (areaChanged && areaGeo) await api.put(`/v1/admin/locations/${id}/area`, { area: areaGeo });
      await api.patch(`/v1/admin/locations/${id}`, body);
      if (areaChanged && !areaGeo) await api.put(`/v1/admin/locations/${id}/area`, { area: null });
    } else {
      const made = await api.post<Location>('/v1/admin/locations', { ...body, isActive: false });
      if (areaGeo) await api.put(`/v1/admin/locations/${made.id}/area`, { area: areaGeo });
      if (body.isActive) await api.patch(`/v1/admin/locations/${made.id}`, { isActive: true });
      router.replace(`/admin/locations/${made.id}`); // next: add its towers
    }
  }

  const title = d.id ? draft.name : 'New location';
  return (
    <FormPage crumbs={[{ label: 'Locations', href: '/admin/locations' }, { label: title }]} title={title} back="/admin/locations"
      submitLabel={d.id ? 'Save changes' : 'Create location'} onSubmit={save}
      side={
        <section className="card fp-card">
          <div className="h2">Towers</div>
          <div className="small" style={{ margin: '4px 0 14px' }}>
            {d.id ? 'Where employees ask for delivery. Each change saves straight away.' : 'Create the location first, then add its towers here.'}
          </div>
          {d.id && <Towers location={{ ...d, id: d.id } as Location} towers={towers} reload={reloadTowers} />}
        </section>
      }>
      <FormCard title="Location">
      <fieldset className="fs" disabled={!edit}>
      <Field label="Name" full>
        <input className="field" required value={d.name} placeholder="Spaze Tech Park"
          onChange={(e) => setD((x) => ({ ...x, name: e.target.value, slug: slugTouched ? x.slug : slugify(e.target.value) }))} />
      </Field>
      <Field label="Web address (slug)" full>
        <input className="field" required value={d.slug} onChange={(e) => { setSlugTouched(true); set('slug', e.target.value); }} />
      </Field>
      <Field label="Area"><input className="field" value={d.area} placeholder="Sector 49" onChange={(e) => set('area', e.target.value)} /></Field>
      <Field label="City"><input className="field" value={d.city} placeholder="Gurugram" onChange={(e) => set('city', e.target.value)} /></Field>
      </fieldset>
      </FormCard>
      <FormCard title="Area on the map" note="Draw the campus boundary. The app shows this location to people standing inside it, and nearby locations with their distance.">
        <div className="full">
          <AreaPicker area={d.areaGeo} onChange={(a) => set('areaGeo', a)} disabled={!geo} />
          {!geo && <div className="small" style={{ marginTop: 6 }}>You need the location check tick to draw or change the area.</div>}
        </div>
        <fieldset className="fs full" disabled={!geo}>
          <SwitchRow
            label={d.outsideAllowed ? 'Orders from outside the area: allowed' : 'Orders from outside the area: not allowed'}
            on={d.outsideAllowed}
            onChange={(v) => set('outsideAllowed', v)}
          />
          <div className="small" style={{ marginTop: 6 }}>
            {d.outsideAllowed
              ? 'Anyone can order from these cafes, wherever they are.'
              : 'Customers can order only while they are inside the area (checked with their phone location).'}
          </div>
        </fieldset>
      </FormCard>
      <FormCard title="Live">
      <fieldset className="fs full" disabled={!live || (!hasArea && !d.isActive)}>
      <div className="full"><SwitchRow label="Live for employees" on={d.isActive} onChange={(v) => set('isActive', v)} /></div>
      {!hasArea && <div className="full small" style={{ marginTop: 6, color: 'var(--red)' }}>Draw the area first. A location without an area is hidden in the app and takes no orders.</div>}
      </fieldset>
      </FormCard>
    </FormPage>
  );
}
