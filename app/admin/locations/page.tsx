'use client';
import { useRouter } from 'next/navigation';
import { confirmDelete } from '@/lib/confirm';
import { api } from '@/lib/api';
import { useLoad } from '@/lib/useLoad';
import type { Location, Tower } from '@/lib/types';
import { PageHead } from '@/components/PageHead';
import { useCan } from '@/components/useCan';
import { Icon } from '@/components/Icon';

import { Towers } from './Towers';
import { AreaThumb } from '@/components/AreaPicker';

export default function LocationsPage() {
  const locations = useLoad<Location[]>('/v1/admin/locations');
  const towers = useLoad<Tower[]>('/v1/admin/towers');
  const router = useRouter();
  const ok = useCan();

  async function remove(l: Location) {
    if (!confirmDelete(l.name, 'Its towers and cafes will be removed too.')) return;
    await api.del(`/v1/admin/locations/${l.id}`).catch((e: Error) => alert(e.message));
    await Promise.all([locations.reload(), towers.reload()]);
  }

  return (
    <main className="page">
      <PageHead title="Locations" sub="Tech parks and the towers employees deliver to.">
        {ok('locations.add') && <button className="btn sm" onClick={() => router.push('/admin/locations/new')}><Icon name="plus" /> Add location</button>}
      </PageHead>
      {locations.error && <div className="err">{locations.error}</div>}
      <div className="stack" style={{ gap: 16 }}>
        {locations.data?.map((l) => (
          <div key={l.id} className="card" style={{ padding: 28 }}>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', minWidth: 0 }}>
                <AreaThumb area={l.areaGeo} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div className="h2">{l.name}</div>
                    <span className={`badge ${l.isActive ? 'ok' : 'mute'}`}>{l.isActive ? 'Live' : 'Hidden'}</span>
                    {l.areaGeo ? <span className="badge ok">Area drawn</span> : <span className="badge warn">No area</span>}
                    {l.outsideAllowed && <span className="badge mute">Outside orders allowed</span>}
                  </div>
                  <div className="sub" style={{ marginTop: 4 }}>{[l.area, l.city].filter(Boolean).join(' · ')} <span style={{ color: 'var(--faint)' }}>· /{l.slug}</span></div>
                  {!l.areaGeo && (
                    <div className="small" style={{ marginTop: 6, color: 'var(--red)' }}>
                      {l.isActive ? 'Hidden in the app until its area is drawn. Edit → draw the area.' : 'Draw its area to make it live.'}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(ok('locations.edit') || ok('locations.delete')) && <button className="btn sec sm" onClick={() => router.push(`/admin/locations/${l.id}`)}><Icon name="edit" /> Edit</button>}
                {ok('locations.delete') && <button className="iconbtn" onClick={() => remove(l)} aria-label="Delete location"><Icon name="trash" /></button>}
              </div>
            </div>
            <div className="cap" style={{ marginTop: 24, marginBottom: 12 }}>Towers</div>
            <Towers location={l} towers={(towers.data ?? []).filter((t) => t.locationId === l.id)} reload={towers.reload} />
          </div>
        ))}
        {locations.data?.length === 0 && <div className="card empty">No locations yet.</div>}
      </div>
    </main>
  );
}

