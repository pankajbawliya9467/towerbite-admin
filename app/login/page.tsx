'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { finishTwoFactor, signIn, signOut, type SignInStep } from '@/lib/auth';
import { DEV_AUTH } from '@/lib/config';
import { useSession } from '@/components/Session';
import { Logo } from '@/components/Logo';
import { Field } from '@/components/Field';
import { BackupCodes, groupKey, QrCode } from '@/components/TwoFactor';

type Challenge = Exclude<SignInStep, { step: 'done' }>;

export default function LoginPage() {
  const { reload } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  /** Admins: waiting for the authenticator code (or the first-time QR setup). */
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  /** First-time setup done: the backup codes, shown once before going on. */
  const [backup, setBackup] = useState<string[] | null>(null);
  const [note, setNote] = useState('');

  async function enter() {
    const me = await reload();
    if (!me?.staff) {
      await signOut();
      await reload();
      setError(me ? 'This account has no cafe access' : 'Could not sign in. Try again.');
      return;
    }
    router.replace(me.staff.role === 'super_admin' ? '/admin' : '/cafe');
  }

  async function submitPassword(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const next = await signIn(email, password);
      if (next.step === 'done') return await enter();
      setPassword('');
      setCode('');
      setChallenge(next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    if (!challenge) return;
    setBusy(true);
    setError('');
    try {
      const r = await finishTwoFactor(challenge.challenge, code);
      if (r.backupCodes?.length) return setBackup(r.backupCodes);
      if (r.usedBackup) {
        setNote(r.backupCodesLeft
          ? `Backup code used. ${r.backupCodesLeft} left. Make new ones in My account.`
          : 'That was your last backup code. Make new ones in My account now.');
        setTimeout(() => void enter(), 2500);
        return;
      }
      await enter();
    } catch (err) {
      const e2 = err as Error & { expired?: boolean };
      setError(e2.message);
      setCode('');
      if (e2.expired) setChallenge(null);
    } finally {
      setBusy(false);
    }
  }

  function backToPassword() {
    setChallenge(null);
    setCode('');
    setError('');
  }

  // ---- First-time setup finished: backup codes ----
  if (backup) {
    return (
      <div className="center">
        <div className="card" style={{ width: '100%', maxWidth: 480, padding: 40 }}>
          <Logo />
          <div className="h1" style={{ marginTop: 28 }}>Save your backup codes</div>
          <p className="sub" style={{ marginTop: 6 }}>
            If you lose the phone with your authenticator app, log in with one of these. Each works once.
            They are shown only now: download them or write them down and keep them safe.
          </p>
          <div style={{ marginTop: 22 }}><BackupCodes codes={backup} email={challenge?.step === 'setup' ? challenge.email : email} /></div>
          <button className="btn block" style={{ marginTop: 24 }} onClick={() => void enter()}>I saved them, continue</button>
        </div>
      </div>
    );
  }

  // ---- Step 2: authenticator code (or first-time QR) ----
  if (challenge) {
    const setup = challenge.step === 'setup';
    return (
      <div className="center">
        <form className="card" onSubmit={submitCode} style={{ width: '100%', maxWidth: setup ? 520 : 440, padding: 40 }}>
          <Logo />
          <div className="h1" style={{ marginTop: 28 }}>{setup ? 'Set up 2-step login' : '2-step login'}</div>
          {setup ? (
            <>
              <p className="sub" style={{ marginTop: 6 }}>
                Admin logins need a code from an authenticator app as well as the password. This is a one-time setup.
              </p>
              <ol className="tf-steps">
                <li>Install <b>Google Authenticator</b> or <b>Microsoft Authenticator</b> on your phone.</li>
                <li>In the app, tap <b>+</b> → <b>Scan a QR code</b> and scan this:</li>
              </ol>
              <div className="tf-setup">
                <QrCode text={challenge.otpauthUrl} />
                <div className="small" style={{ minWidth: 0 }}>
                  Can't scan? Choose <b>Enter a setup key</b> and type:
                  <code className="tf-key">{groupKey(challenge.secret)}</code>
                  Account: {challenge.email}<br />Type: time based
                </div>
              </div>
              <ol className="tf-steps" start={3}><li>Type the 6-digit code the app shows for <b>TowerBites</b>.</li></ol>
            </>
          ) : (
            <p className="sub" style={{ marginTop: 6 }}>
              Open your authenticator app and type the 6-digit code for <b>TowerBites</b>. Lost your phone? Type one of your backup codes.
            </p>
          )}
          <div style={{ marginTop: 18 }}>
            <Field label={setup ? '6-digit code' : 'Code'}>
              <input className="field tf-input" required autoFocus autoComplete="one-time-code"
                inputMode={setup ? 'numeric' : 'text'} maxLength={setup ? 6 : 12} value={code}
                onChange={(e) => setCode(setup ? e.target.value.replace(/\D/g, '') : e.target.value.toUpperCase())}
                placeholder={setup ? '123456' : '123456 or backup code'} />
            </Field>
          </div>
          {error && <div className="err" style={{ marginTop: 16 }}>{error}</div>}
          {note && <div className="ok-note" style={{ marginTop: 16 }}>{note}</div>}
          <button className="btn block" style={{ marginTop: 22 }} disabled={busy || code.trim().length < 6}>
            {busy ? 'Checking…' : setup ? 'Turn on and sign in' : 'Sign in'}
          </button>
          <button type="button" className="link" style={{ marginTop: 16, width: '100%', justifyContent: 'center' }} onClick={backToPassword}>
            ← Use a different login
          </button>
          {!setup && <p className="small" style={{ marginTop: 14, textAlign: 'center' }}>No phone and no backup codes? Ask a super admin to reset your 2-step login.</p>}
        </form>
      </div>
    );
  }

  // ---- Step 1: email + password ----
  return (
    <div className="center">
      <form className="card" onSubmit={submitPassword} style={{ width: '100%', maxWidth: 440, padding: 40 }}>
        <Logo />
        <div className="h1" style={{ marginTop: 32 }}>Cafe login</div>
        <p className="sub" style={{ marginTop: 6 }}>Live orders, menu and admin for TowerBites cafes.</p>
        <div className="stack" style={{ gap: 18, marginTop: 28 }}>
          <Field label="Email">
            <input className="field" type="email" required autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@cafe.com" />
          </Field>
          <Field label="Password">
            <input className="field" type="password" required={!DEV_AUTH} autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
        </div>
        {error && <div className="err" style={{ marginTop: 16 }}>{error}</div>}
        <button className="btn block" style={{ marginTop: 24 }} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        {DEV_AUTH && <p className="small" style={{ marginTop: 16, textAlign: 'center' }}>Dev mode: any password works.</p>}
      </form>
    </div>
  );
}
