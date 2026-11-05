'use client';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { useLoad } from '@/lib/useLoad';
import type { Rider } from '@/lib/types';
import { Icon } from '@/components/Icon';

/** The cafe's delivery staff: saved once, then "Send out" on an order is one tap. */
export default function RidersPage() {
  const riders = useLoad<Rider[]>('/v1/cafe/riders');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [editing, setEditing] = useState<Rider | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const body = { name: name.trim(), phone: phone.trim() || null };
      if (editing) await api.patch(`/v1/cafe/riders/${editing.id}`, body);
      else await api.post('/v1/cafe/riders', body);
      setName('');
      setPhone('');
      setEditing(null);
      await riders.reload();
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(r: Rider) {
    if (!confirm(`Remove ${r.name} from delivery staff?`)) return;
    await api.del(`/v1/cafe/riders/${r.id}`).catch((e: Error) => alert(e.message));
    await riders.reload();
  }

  return (
    <main className="page" style={{ maxWidth: 760 }}>
      <div className="pagehead">
        <div>
          <div className="h1">Delivery staff</div>
          <p className="sub">Save the people who take orders to desks. On the live board, “Send out” becomes one tap with their name, and the customer sees who is coming (and can call, if you add a phone).</p>
        </div>
      </div>

      <form className="card" onSubmit={save} style={{ padding: 18, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ flex: '1 1 200px' }}><span className="label">Name</span>
          <input className="field" required maxLength={40} value={name} placeholder="Raju" onChange={(e) => setName(e.target.value)} />
        </label>
        <label style={{ flex: '1 1 200px' }}><span className="label">Phone (optional, customers can call)</span>
          <input className="field" inputMode="tel" maxLength={16} value={phone} placeholder="98765 43210" onChange={(e) => setPhone(e.target.value)} />
        </label>
        <button className="btn" disabled={busy || !name.trim()} style={{ height: 52 }}>{editing ? 'Save' : <><Icon name="plus" /> Add</>}</button>
        {editing && <button type="button" className="btn sec" style={{ height: 52 }} onClick={() => (setEditing(null), setName(''), setPhone(''))}>Cancel</button>}
      </form>
      {err && <div className="err" style={{ marginTop: 12 }}>{err}</div>}

      <div className="card" style={{ marginTop: 16 }}>
        {riders.data?.length === 0 && <div className="empty">No delivery staff yet. Add the first one above.</div>}
        {riders.data?.map((r, i) => (
          <div key={r.id} className="row" style={{ padding: '14px 18px', borderTop: i ? '1px solid var(--line)' : 0, gap: 12 }}>
            <span style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--accentSoft)', color: '#9A3412', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              {r.name.charAt(0).toUpperCase()}
            </span>
            <div style={{ flex: 1 }}>
              <div className="h3">{r.name}</div>
              <div className="small">{r.phone || 'No phone'}</div>
            </div>
            <button className="iconbtn" aria-label={`Edit ${r.name}`} onClick={() => (setEditing(r), setName(r.name), setPhone(r.phone ?? ''))}><Icon name="edit" /></button>
            <button className="iconbtn" aria-label={`Remove ${r.name}`} onClick={() => remove(r)}><Icon name="trash" /></button>
          </div>
        ))}
      </div>
    </main>
  );
}
