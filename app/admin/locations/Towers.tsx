'use client';
import { useState, type FormEvent } from 'react';
import { confirmDelete } from '@/lib/confirm';
import { api } from '@/lib/api';
import type { Location, Tower } from '@/lib/types';
import { Icon } from '@/components/Icon';
import { useCan } from '@/components/useCan';

/** A building's towers (where employees ask for delivery). Each add / remove saves straight away. */
export function Towers({ location, towers, reload }: { location: Location; towers: Tower[]; reload: () => Promise<void> }) {
  const [name, setName] = useState('');
  const ok = useCan();

  async function add(e: FormEvent | { preventDefault(): void }) {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post('/v1/admin/towers', { locationId: location.id, name: name.trim(), sort: towers.length + 1 })
      .catch((err: Error) => alert(err.message));
    setName('');
    await reload();
  }

  async function remove(t: Tower) {
    if (!confirmDelete(t.name)) return;
    await api.del(`/v1/admin/towers/${t.id}`).catch((e: Error) => alert(e.message));
    await reload();
  }

  return (
    <div className="wrap" style={{ alignItems: 'center' }} onInput={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') { e.preventDefault(); void add(e); } }}>
      {towers.map((t) => (
        <span key={t.id} className="pill" style={{ marginRight: 0, paddingRight: 8 }}>
          {t.name}
          {ok('locations.delete') && <button type="button" onClick={() => remove(t)} aria-label={`Remove ${t.name}`}
            style={{ color: 'var(--faint)', display: 'inline-flex', padding: 4 }}><Icon name="x" /></button>}
        </span>
      ))}
      {ok('locations.add') && <>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="New tower, e.g. Tower C"
          style={{ width: 220, height: 38, borderRadius: 999, fontSize: 14 }} />
        <button type="button" className="btn sec sm" style={{ height: 38, borderRadius: 999 }} disabled={!name.trim()} onClick={add}><Icon name="plus" /> Add</button>
      </>}
    </div>
  );
}

