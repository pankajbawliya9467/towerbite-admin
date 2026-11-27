'use client';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { Icon } from './Icon';
import { TwoFactorCard } from './TwoFactor';

/** Change your own password with the current one. This device stays logged in; other devices are logged out. */
export function AccountForm({ email, forgotHint, admin }: { email: string | null; forgotHint: string; admin?: boolean }) {
  const [d, setD] = useState({ current: '', next: '', again: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const matches = !!d.again && d.again === d.next;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (d.next.length < 8) return setMsg({ ok: false, text: 'New password: at least 8 characters.' });
    if (d.next !== d.again) return setMsg({ ok: false, text: 'The two new passwords are not the same.' });
    setBusy(true);
    try {
      await api.post('/v1/auth/password', { current: d.current, next: d.next });
      setD({ current: '', next: '', again: '' });
      setMsg({ ok: true, text: 'Password updated. Other phones and tablets were logged out.' });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page" style={{ maxWidth: 520 }}>
      <div className="h1">My account</div>
      {email && <div className="small" style={{ marginTop: 4 }}>{email}</div>}
      <form className="card stack" style={{ padding: 20, gap: 14, marginTop: 18 }} onSubmit={submit}>
        <label><span className="label">Current password</span>
          <input className="field" type="password" required autoComplete="current-password" value={d.current} onChange={(e) => setD({ ...d, current: e.target.value })} />
        </label>
        <label><span className="label">New password · at least 8</span>
          <input className="field" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={d.next} onChange={(e) => setD({ ...d, next: e.target.value })} />
        </label>
        <label><span className="label">New password again</span>
          <div style={{ position: 'relative' }}>
            <input className="field" type="password" required autoComplete="new-password" value={d.again} onChange={(e) => setD({ ...d, again: e.target.value })} />
            {matches && <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--green)', fontWeight: 700, fontSize: 13 }}><Icon name="check" size={14} /> Matches</span>}
          </div>
        </label>
        <div className="small">You stay logged in here; other phones and tablets are logged out.</div>
        {msg && <div className={msg.ok ? 'ok-note' : 'err'}>{msg.text}</div>}
        <button className="btn" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
        <div className="small" style={{ textAlign: 'center' }}>{forgotHint}</div>
      </form>
      {admin && <TwoFactorCard email={email} />}
    </main>
  );
}
