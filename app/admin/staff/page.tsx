'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { shortDate } from '@/lib/format';
import { useLoad } from '@/lib/useLoad';
import type { Cafe, Role, StaffRow } from '@/lib/types';
import { useSession } from '@/components/Session';
import { PageHead } from '@/components/PageHead';
import { FormModal } from '@/components/FormModal';
import { Field } from '@/components/Field';
import { Icon } from '@/components/Icon';

export default function StaffPage() {
  const staff = useLoad<StaffRow[]>('/v1/admin/staff');
  const cafes = useLoad<Cafe[]>('/v1/admin/cafes');
  const { state } = useSession();
  const myId = state.status === 'ready' ? state.me.id : '';
  const [adding, setAdding] = useState(false);

  async function remove(s: StaffRow) {
    if (!confirm(`Remove ${s.name || s.email}? They will no longer be able to log in.`)) return;
    await api.del(`/v1/admin/staff/${s.userId}`).catch((e: Error) => alert(e.message));
    await staff.reload();
  }

  return (
    <main className="page">
      <PageHead title="Staff logins" sub="Cafe staff see their own cafe's live board and menu. Admins see everything.">
        <button className="btn sm" onClick={() => setAdding(true)}><Icon name="plus" /> Add login</button>
      </PageHead>
      {staff.error && <div className="err">{staff.error}</div>}
      <div className="card">
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Cafe</th><th>Added</th><th /></tr></thead>
          <tbody>
            {staff.data?.map((s) => (
              <tr key={s.userId}>
                <td style={{ fontWeight: 600 }}>{s.name || '—'}</td>
                <td>{s.email}</td>
                <td><span className={`badge ${s.role === 'super_admin' ? 'acc' : 'mute'}`}>{s.role === 'super_admin' ? 'Super admin' : 'Cafe staff'}</span></td>
                <td>{s.cafeName ?? <span style={{ color: 'var(--faint)' }}>All cafes</span>}</td>
                <td style={{ color: 'var(--sub)' }}>{shortDate(s.createdAt)}</td>
                <td className="num">
                  {s.userId !== myId && <button className="link" style={{ color: 'var(--red)' }} onClick={() => remove(s)}>Remove</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {staff.data?.length === 0 && <div className="empty">No staff logins yet.</div>}
      </div>
      {adding && cafes.data && <StaffForm cafes={cafes.data} onClose={() => setAdding(false)} onSaved={staff.reload} />}
    </main>
  );
}

function StaffForm({ cafes, onClose, onSaved }: { cafes: Cafe[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [d, setD] = useState({ name: '', email: '', password: '', role: 'cafe_staff' as Role, cafeId: cafes[0]?.id ?? '' });
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));

  async function save() {
    await api.post('/v1/admin/staff', { ...d, cafeId: d.role === 'cafe_staff' ? d.cafeId : null });
    await onSaved();
  }

  return (
    <FormModal title="New staff login" submitLabel="Create login" onClose={onClose} onSubmit={save}>
      <Field label="Name" full><input className="field" required value={d.name} onChange={(e) => set('name', e.target.value)} /></Field>
      <Field label="Email" full><input className="field" type="email" required value={d.email} onChange={(e) => set('email', e.target.value)} /></Field>
      <Field label="Password" full>
        <input className="field" type="text" required minLength={8} value={d.password} placeholder="At least 8 characters"
          onChange={(e) => set('password', e.target.value)} />
      </Field>
      <Field label="Role" full>
        <div className="wrap">
          <button type="button" className={`pill${d.role === 'cafe_staff' ? ' on' : ''}`} onClick={() => set('role', 'cafe_staff')}>Cafe staff</button>
          <button type="button" className={`pill${d.role === 'super_admin' ? ' on' : ''}`} onClick={() => set('role', 'super_admin')}>Super admin</button>
        </div>
      </Field>
      {d.role === 'cafe_staff' && (
        <Field label="Cafe" full>
          <select className="field" value={d.cafeId} onChange={(e) => set('cafeId', e.target.value)}>
            {cafes.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
          </select>
        </Field>
      )}
    </FormModal>
  );
}
