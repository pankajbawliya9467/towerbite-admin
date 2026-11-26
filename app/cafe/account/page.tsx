'use client';
import { useSession } from '@/components/Session';
import { AccountForm } from '@/components/AccountForm';

export default function CafeAccount() {
  const { state } = useSession();
  return <AccountForm email={state.status === 'ready' ? state.me.email : null} forgotHint="Forgot it? Ask TowerBites admin to set a new one." />;
}
