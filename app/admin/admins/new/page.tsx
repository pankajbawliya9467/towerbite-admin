'use client';
import { useSession } from '@/components/Session';
import { AdminEditor } from '../AdminEditor';

export default function NewAdminPage() {
  const { state } = useSession();
  const me = state.status === 'ready' ? state.me.staff : null;
  if (!me) return null;
  return <AdminEditor admin={null} mine={me.isSuper ? null : (me.permissions ?? [])} canSuper={!!me.isSuper} />;
}
