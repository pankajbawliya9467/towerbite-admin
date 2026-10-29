'use client';
import { useSession } from './Session';
import { Logo } from './Logo';

export function NoAccess() {
  const { logout } = useSession();
  return (
    <div className="center">
      <div className="card" style={{ padding: 36, maxWidth: 420, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}><Logo /></div>
        <div className="h2" style={{ marginTop: 28 }}>This account has no cafe access</div>
        <p className="sub" style={{ marginTop: 8 }}>Ask your TowerBites admin to add your email as cafe staff.</p>
        <button className="btn sec block" style={{ marginTop: 24 }} onClick={logout}>Use another account</button>
      </div>
    </div>
  );
}
