'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signOut } from '@/lib/auth';
import { DEV_AUTH } from '@/lib/config';
import { useSession } from '@/components/Session';
import { Logo } from '@/components/Logo';
import { Field } from '@/components/Field';

export default function LoginPage() {
  const { reload } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signIn(email, password);
      const me = await reload();
      if (!me?.staff) {
        await signOut();
        await reload();
        setError(me ? 'This account has no cafe access' : 'Could not sign in. Try again.');
        return;
      }
      router.replace(me.staff.role === 'super_admin' ? '/admin' : '/cafe');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center">
      <form className="card" onSubmit={submit} style={{ width: '100%', maxWidth: 440, padding: 40 }}>
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
