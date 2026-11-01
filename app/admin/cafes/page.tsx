'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, qs } from '@/lib/api';
import { useLoad } from '@/lib/useLoad';
import type { Cafe, Location } from '@/lib/types';
import { adminCafe } from '@/components/CafeContext';
import { PageHead } from '@/components/PageHead';
import { FoodTile } from '@/components/FoodTile';
import { Icon } from '@/components/Icon';
import { CafeForm, type CafeDraft } from './CafeForm';

export default function CafesPage() {
  const router = useRouter();
  const [locationId, setLocationId] = useState('');
  const locations = useLoad<Location[]>('/v1/admin/locations');
  const cafes = useLoad<Cafe[]>(`/v1/admin/cafes${qs({ locationId })}`);
  const [editing, setEditing] = useState<CafeDraft | null>(null);
  const locName = (id: string) => locations.data?.find((l) => l.id === id)?.name ?? '';

  const go = (cafe: Cafe, path: string) => {
    adminCafe.set(cafe.id);
    router.push(path);
  };

  async function remove(c: Cafe) {
    if (!confirm(`Delete ${c.name} with its whole menu?`)) return;
    await api.del(`/v1/admin/cafes/${c.id}`).catch((e: Error) => alert(e.message));
    await cafes.reload();
  }

  return (
    <main className="page">
      <PageHead title="Cafes" sub="Every cafe on TowerBites, its details and its live order board.">
        <button className="btn sm" disabled={!locations.data?.length}
          onClick={() => setEditing({ locationId: locationId || locations.data![0].id })}><Icon name="plus" /> Add cafe</button>
      </PageHead>
      <div className="wrap" style={{ marginBottom: 24 }}>
        <button className={`pill${!locationId ? ' on' : ''}`} onClick={() => setLocationId('')}>All locations</button>
        {locations.data?.map((l) => (
          <button key={l.id} className={`pill${locationId === l.id ? ' on' : ''}`} onClick={() => setLocationId(l.id)}>{l.name}</button>
        ))}
      </div>
      {cafes.error && <div className="err">{cafes.error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
        {cafes.data?.map((c) => (
          <div key={c.id} className="card" style={{ overflow: 'hidden' }}>
            <div style={{ height: 132, background: c.coverColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, position: 'relative' }}>
              {c.imageUrl ? <img src={c.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : c.emoji}
              {c.logoUrl && <img src={c.logoUrl} alt="" style={{ position: 'absolute', left: 14, bottom: -22, width: 52, height: 52, borderRadius: 14, objectFit: 'cover', background: '#fff', boxShadow: '0 0 0 3px #fff' }} />}
            </div>
            <div style={{ padding: '20px 22px 22px' }}>
              <div className="row" style={{ gap: 12 }}>
                <div className="h2" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className={`badge ${c.isOpen ? 'ok' : 'mute'}`}>{c.isOpen ? 'Open' : 'Closed'}</span>
                  {c.isOpen && !c.acceptingOrders && <span className="badge warn">Paused</span>}
                </div>
              </div>
              <div className="sub" style={{ marginTop: 4, fontSize: 14 }}>{[c.cuisines, c.place].filter(Boolean).join(' · ')}</div>
              <div className="small" style={{ marginTop: 2 }}>{locName(c.locationId)} · {c.etaMin}–{c.etaMax} min</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                <button className="btn sm" style={{ flex: 1 }} onClick={() => go(c, '/cafe')}><Icon name="board" /> Live board</button>
                <button className="btn sec sm" onClick={() => go(c, '/admin/products')}>Menu</button>
                <button className="btn sec sm" onClick={() => setEditing(c)} aria-label="Edit cafe"><Icon name="edit" /></button>
                <button className="iconbtn" style={{ height: 42, width: 42 }} onClick={() => remove(c)} aria-label="Delete cafe"><Icon name="trash" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {cafes.data?.length === 0 && <div className="card empty">No cafes here yet.</div>}
      {editing && locations.data && (
        <CafeForm draft={editing} locations={locations.data} onClose={() => setEditing(null)} onSaved={cafes.reload} />
      )}
    </main>
  );
}
