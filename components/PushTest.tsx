'use client';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';

type Result = {
  name: string | null; phone: string; devices: number; summary: string;
  results: { platform: string; registeredAt: string; state: 'delivered' | 'sent' | 'failed' | 'unknown'; error: string | null; fix: string | null }[];
};

/**
 * "Is push working?": sends a test notification to one customer's phones and shows what happened, including
 * setup problems on the Expo / Firebase side and how to fix them.
 */
export function PushTest() {
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [res, setRes] = useState<Result | null>(null);

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setRes(null);
    try {
      setRes(await api.post<Result>('/v1/admin/notifications/test', { phone }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const failed = res?.results.some((r) => r.state === 'failed') || (res && res.devices === 0);
  return (
    <section className="card" style={{ padding: 20, marginBottom: 18 }}>
      <div className="row" style={{ alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 260px' }}>
          <div className="h2" style={{ fontSize: 17 }}>Test notifications on a phone</div>
          <div className="small" style={{ marginTop: 4 }}>Sends &quot;Test from TowerBites&quot; to a customer&apos;s phone and tells you if it reached Google / Apple, or what to fix.</div>
        </div>
        <form onSubmit={send} style={{ display: 'flex', gap: 8, flex: '1 1 320px' }}>
          <input className="field" inputMode="tel" placeholder="Customer's mobile, e.g. 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Customer's mobile number" />
          <button className="btn sm" disabled={busy || phone.replace(/\D/g, '').length < 10}>{busy ? 'Sending…' : 'Send test'}</button>
        </form>
      </div>
      {error && <div className="err" style={{ marginTop: 12 }}>{error}</div>}
      {res && (
        <div className={failed ? 'err' : 'ok-note'} style={{ marginTop: 12 }}>
          <b>{res.name || res.phone}</b>: {res.summary}
          {res.results.length > 1 && (
            <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              {res.results.map((r, i) => (
                <li key={i}>{r.platform} · {r.state}{r.error ? ` · ${r.error}` : ''}{r.fix ? ` · ${r.fix}` : ''}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
