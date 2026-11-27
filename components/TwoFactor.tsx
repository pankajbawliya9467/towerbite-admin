'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { Icon } from './Icon';

/** The QR code an authenticator app scans (drawn in the browser; the secret never goes to another site). */
export function QrCode({ text, size = 200 }: { text: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    import('qrcode')
      .then((m) => (m.default ?? m).toDataURL(text, { margin: 1, width: size, errorCorrectionLevel: 'M' }))
      .then((url: string) => live && setSrc(url))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [text, size]);
  if (failed) return <div className="tf-qr tf-qr-empty small">QR could not be drawn. Type the key below into the app instead.</div>;
  return (
    <div className="tf-qr" style={{ width: size + 16, height: size + 16 }}>
      {src ? <img src={src} width={size} height={size} alt="QR code for your authenticator app" /> : <span className="small">Loading…</span>}
    </div>
  );
}

/** "ABCD EFGH …" so the key is easy to type by hand. */
export const groupKey = (s: string) => s.replace(/(.{4})/g, '$1 ').trim();

/** The one-time backup codes, shown once, with copy and download. */
export function BackupCodes({ codes, email }: { codes: string[]; email?: string | null }) {
  const [copied, setCopied] = useState(false);
  const text = [
    `TowerBites admin backup codes${email ? ` for ${email}` : ''}`,
    `Made ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
    'Each code works once. Use one if you lose the phone with your authenticator app.',
    '',
    ...codes,
  ].join('\n');

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: they can still download */
    }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'towerbites-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="tf-codes">{codes.map((c) => <code key={c}>{c}</code>)}</div>
      <div className="row" style={{ gap: 10, justifyContent: 'flex-start' }}>
        <button type="button" className="btn sec sm" onClick={copy}>{copied && <Icon name="check" size={14} />} {copied ? 'Copied' : 'Copy codes'}</button>
        <button type="button" className="btn sec sm" onClick={download}><Icon name="download" size={14} /> Download .txt</button>
      </div>
    </div>
  );
}

type Status = { enabled: boolean; enabledAt: string | null; backupCodesLeft: number };

/** "My account" (admins): 2-step login status and new backup codes. */
export function TwoFactorCard({ email }: { email: string | null }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);

  useEffect(() => {
    api.get<Status>('/v1/auth/2fa').then(setStatus, () => undefined);
  }, []);

  async function makeNew(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api.post<{ backupCodes: string[] }>('/v1/auth/2fa/backup-codes', { code });
      setCodes(r.backupCodes);
      setCode('');
      setStatus((s) => (s ? { ...s, backupCodesLeft: r.backupCodes.length } : s));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!status) return null;
  const low = status.backupCodesLeft <= 2;
  return (
    <div className="card stack" style={{ padding: 20, gap: 14, marginTop: 18 }}>
      <div className="row">
        <div className="h2" style={{ fontSize: 17 }}><Icon name="shield" size={18} /> 2-step login</div>
        <span className={`badge ${status.enabled ? 'ok' : 'mute'}`}>{status.enabled ? 'On' : 'Off'}</span>
      </div>
      <div className="small">
        Every login needs a code from your authenticator app.{' '}
        {status.enabled && <>Backup codes left: <b style={{ color: low ? 'var(--red)' : undefined }}>{status.backupCodesLeft}</b>.</>}
      </div>
      {codes ? (
        <>
          <div className="ok-note">New backup codes made. The old ones no longer work. Save these now: they are shown only once.</div>
          <BackupCodes codes={codes} email={email} />
          <button type="button" className="btn sec sm" onClick={() => setCodes(null)}>Done</button>
        </>
      ) : status.enabled && (
        <form className="stack" style={{ gap: 10 }} onSubmit={makeNew}>
          <label><span className="label">New backup codes · type the current code from your app</span>
            <input className="field tf-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </label>
          {error && <div className="err">{error}</div>}
          <button className="btn sec" disabled={busy || code.length !== 6}>{busy ? 'Making…' : 'Make new backup codes'}</button>
        </form>
      )}
      <div className="small">Lost your phone? Ask another admin to reset your 2-step login, then scan a new QR code at your next login.</div>
    </div>
  );
}
