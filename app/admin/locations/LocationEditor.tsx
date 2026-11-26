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

export type Draft = Omit<Location, 'id'> & { id?: string };
export const blank: Draft = { slug: '', name: '', area: '', city: '', isActive: true };

/** New / edit location on its own page, with its towers. */
export function LocationEditor({ draft, towers, reloadTowers }: { draft: Draft; towers: Tower[]; reloadTowers: () => Promise<void> }) {
  const router = useRouter();
  const [d, setD] = useState(draft);
  const [slugTouched, setSlugTouched] = useState(!!draft.id);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const ok = useCan();
  const edit = d.id ? ok('locations.edit') : ok('locations.add');
  const live = d.id ? ok('locations.delete') : ok('locations.add');

  async function save() {
    const { id, ...body } = d;
    if (id) {
      await api.patch(`/v1/admin/locations/${id}`, body);
    } else {
      const made = await api.post<Location>('/v1/admin/locations', body);
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
      <fieldset className="fs" disabled={!live}>
      <div className="full"><SwitchRow label="Live for employees" on={d.isActive} onChange={(v) => set('isActive', v)} /></div>
      </fieldset>
      </FormCard>
    </FormPage>
  );
}
