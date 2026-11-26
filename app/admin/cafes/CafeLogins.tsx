'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { shortDate } from '@/lib/format';
import { PasswordModal, type PasswordTarget } from '@/components/PasswordModal';
import { confirmDelete } from '@/lib/confirm';
import { useLoad } from '@/lib/useLoad';
import type { StaffRow } from '@/lib/types';

/** A cafe's CRM logins: change the email, set a new password, add or remove a login. */
export function CafeLogins({ cafeId }: { cafeId: string }) {
  const all = useLoad<StaffRow[]>('/v1/admin/staff');
  const logins = (all.data ?? []).filter((s) => s.cafeId === cafeId);
  const [adding, setAdding] = useState(false);

  return (
    // Saves on its own: typing here must not mark the cafe page as "changes not saved".
    <div className="stack" style={{ gap: 14 }} onInput={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      {all.error && <div className="err">{all.error}</div>}
      {all.data && !logins.length && <div className="small">This cafe has no login yet. Add one so the cafe can see its orders.</div>}
      {logins.map((s) => <LoginRow key={s.userId} s={s} onChanged={all.reload} />)}
      <div className="note-warn">
        After a change the cafe is logged out on every device
        <small>Share the new email / password with the cafe owner privately.</small>
      </div>
      {adding ? <AddLogin cafeId={cafeId} onDone={async () => { setAdding(false); await all.reload(); }} onCancel={() => setAdding(false)} />
        : <button type="button" className="btn sec sm" style={{ alignSelf: 'flex-start' }} onClick={() => setAdding(true)}>{logins.length ? "+ Add another login" : "+ Add login"}</button>}
    </div>
  );
}

function LoginRow({ s, onChanged }: { s: StaffRow; onChanged: () => Promise<void> }) {
  const [email, setEmail] = useState(s.email);
  const [err, setErr] = useState('');
  const [pw, setPw] = useState<PasswordTarget | null>(null);
  const changed = email.trim().toLowerCase() !== s.email.toLowerCase();

  async function changeEmail() {
    setErr('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr('Type a valid email');
    if (!confirm(`Change the login email to ${email.trim()}? ${s.name || 'The cafe'} is logged out on every device.`)) return;
    try {
      await api.patch(`/v1/admin/staff/${s.userId}`, { email: email.trim() });
      await onChanged();
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  async function remove() {
    if (!confirmDelete(`the login ${s.email}`, 'They will no longer be able to log in.')) return;
    await api.del(`/v1/admin/staff/${s.userId}`).catch((e: Error) => alert(e.message));
    await onChanged();
  }

  return (
    <div className="card" style={{ padding: 16, boxShadow: 'none', border: '1.5px solid var(--line)' }}>
      <div className="row"><b>{s.name || 'Cafe login'}</b><span className="small">{s.activeLogins} device{s.activeLogins === 1 ? '' : 's'} logged in</span></div>
      <div className="label" style={{ marginTop: 10 }}>Cafe login email</div>
      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="button" className="btn sec sm" disabled={!changed} onClick={changeEmail}>Change email</button>
      </div>
      {err && <div className="err" style={{ marginTop: 8 }}>{err}</div>}
      <div className="row" style={{ marginTop: 12 }}>
        <span className="small">Password · {s.passwordSetAt ? `last changed ${shortDate(s.passwordSetAt)}` : 'not changed yet'}</span>
        <span className="nowrap">
          <button type="button" className="btn sec sm" onClick={() => setPw({ who: s.name || s.email, path: `/v1/admin/staff/${s.userId}/password` })}>Set new password</button>
          <button type="button" className="link" style={{ color: 'var(--red)', marginLeft: 12 }} onClick={remove}>Remove</button>
        </span>
      </div>
      {pw && <PasswordModal target={pw} onClose={() => setPw(null)} onDone={() => void onChanged()} />}
    </div>
  );
}

function AddLogin({ cafeId, onDone, onCancel }: { cafeId: string; onDone: () => Promise<void>; onCancel: () => void }) {
  const [d, setD] = useState({ name: 'Counter', email: '', password: '' });
  const [err, setErr] = useState('');
  async function add() {
    setErr('');
    try {
      await api.post('/v1/admin/staff', { ...d, cafeId });
      await onDone();
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  return (
    <div className="card" style={{ padding: 16, boxShadow: 'none', border: '1.5px dashed var(--line)' }}>
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <input className="field" placeholder="Name (e.g. Counter tablet)" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
        <input className="field" type="email" placeholder="Email" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} />
        <input className="field" placeholder="Password · at least 8" value={d.password} autoComplete="new-password" onChange={(e) => setD({ ...d, password: e.target.value })} />
      </div>
      {err && <div className="err" style={{ marginTop: 8 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <button type="button" className="btn sm" onClick={add}>Create login</button>
        <button type="button" className="btn sec sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
