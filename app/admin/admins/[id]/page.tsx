'use client';
import { useParams } from 'next/navigation';
import { useLoad } from '@/lib/useLoad';
import type { AdminRow } from '@/lib/types';
import { useSession } from '@/components/Session';
import { AdminEditor } from '../AdminEditor';

export default function EditAdminPage() {
  const { id } = useParams<{ id: string }>();
  const { state } = useSession();
  const me = state.status === 'ready' ? state.me.staff : null;
  const admins = useLoad<AdminRow[]>('/v1/admin/admins');
  if (admins.error) return <main className="page"><div className="err">{admins.error}</div></main>;
  if (!admins.data || !me) return null;
  const admin = admins.data.find((a) => a.id === id);
  if (!admin) return <main className="page"><div className="card empty">Admin not found.</div></main>;
  return <AdminEditor key={admin.id} admin={admin} mine={me.isSuper ? null : (me.permissions ?? [])} canSuper={!!me.isSuper} />;
}
