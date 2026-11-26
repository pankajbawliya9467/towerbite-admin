'use client';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { shortDate } from '@/lib/format';
import { useLoad } from '@/lib/useLoad';
import { SECTIONS, summary } from '@/lib/perms';
import type { AdminRow } from '@/lib/types';
import { useSession } from '@/components/Session';
import { PageHead } from '@/components/PageHead';
import { Icon } from '@/components/Icon';
import { PasswordModal, type PasswordTarget } from '@/components/PasswordModal';
import { useMemo, useState } from 'react';
import { Chips, Empty, Pager, SearchBox, useClientPage } from '@/components/ListTools';
import { useFilters } from '@/lib/useFilters';


export default function AdminsPage() {
  const admins = useLoad<AdminRow[]>('/v1/admin/admins');
  const { state } = useSession();
  const me = state.status === 'ready' ? state.me.staff : null;
  const router = useRouter();
  const [pw, setPw] = useState<PasswordTarget | null>(null);
  const { f, set, clear } = useFilters({ search: '', state: '', kind: '', page: '1', pageSize: '25' });
  const filtered = useMemo(() => {
    const t = f.search.toLowerCase();
    return (admins.data ?? []).filter((a) =>
      (!t || a.name.toLowerCase().includes(t) || a.email.toLowerCase().includes(t))
      && (!f.state || (f.state === 'on') === a.isActive)
      && (!f.kind || (f.kind === 'super') === a.isSuper));
  }, [admins.data, f.search, f.state, f.kind]);
  const pg = useClientPage(filtered, Number(f.page), Number(f.pageSize));
  const chips = [
    f.search && { label: `"${f.search}"`, clear: () => set({ search: '' }) },
    f.state && { label: f.state === 'on' ? 'Active' : 'Turned off', clear: () => set({ state: '' }) },
    f.kind && { label: f.kind === 'super' ? 'Super admins' : 'Limited admins', clear: () => set({ kind: '' }) },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  async function toggle(a: AdminRow) {
    const msg = a.isActive
      ? `Turn off ${a.name}? They are logged out at once and can't log in until turned on again.`
      : `Turn ${a.name} back on? They can log in again with their password.`;
    if (!confirm(msg)) return;
    await api.patch(`/v1/admin/admins/${a.id}`, { isActive: !a.isActive }).catch((e: Error) => alert(e.message));
    await admins.reload();
  }

  return (
    <main className="page">
      <PageHead title="Admins" sub="People who run TowerBites. Cafe logins are under each cafe.">
        <button className="btn sm" onClick={() => router.push('/admin/admins/new')}><Icon name="plus" /> New admin</button>
      </PageHead>
      <div className="lt-bar">
        <SearchBox value={f.search} onChange={(search) => set({ search })} placeholder="Name or email" />
        <select className="field lt-sel" value={f.state} aria-label="On or off" onChange={(e) => set({ state: e.target.value })}>
          <option value="">Active + turned off</option><option value="on">Active</option><option value="off">Turned off</option>
        </select>
        <select className="field lt-sel" value={f.kind} aria-label="Kind" onChange={(e) => set({ kind: e.target.value })}>
          <option value="">All admins</option><option value="super">Super admins</option><option value="limited">Limited admins</option>
        </select>
      </div>
      <Chips items={chips} onClear={() => clear(['pageSize'])} />
      {admins.error && <div className="err">{admins.error}</div>}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table" style={{ minWidth: 640 }}>
          <thead><tr><th>Name</th><th>Can manage</th><th>Added</th><th /></tr></thead>
          <tbody>
            {pg.rows.map((a) => {
              const self = a.id === me?.userId;
              // Same rule as the API: you can't change an admin who has access you don't have.
              const locked = !me?.isSuper && (a.isSuper || a.permissions.some((p) => !me?.permissions?.includes(p)));
              return (
                <tr key={a.id} style={a.isActive ? undefined : { opacity: 0.6 }}>
                  <td><b>{a.name || '—'}</b><div className="small">{a.email}</div></td>
                  <td>
                    <div className="wrap" style={{ gap: 6 }}>
                      {!a.isActive ? <span className="badge mute">Turned off</span>
                        : a.isSuper ? <span className="badge acc">Super admin · everything</span>
                        : SECTIONS.map((x) => {
                          const t = summary(a.permissions, x);
                          return t && <span key={x.key} className="perm-chip">{x.short} <i>{t}</i></span>;
                        })}
                    </div>
                  </td>
                  <td className="small nowrap">{shortDate(a.createdAt)}</td>
                  <td className="num nowrap">
                    {self ? <span className="small">You</span> : locked ? null : (
                      <>
                        {a.isActive && <button className="link" onClick={() => router.push(`/admin/admins/${a.id}`)}>Edit</button>}
                        {a.isActive && <button className="link" style={{ marginLeft: 14 }} onClick={() => setPw({ who: a.name || a.email, path: `/v1/admin/admins/${a.id}/password` })}>New password</button>}
                        <button className="link" style={{ marginLeft: 14, color: a.isActive ? 'var(--red)' : 'var(--green)' }} onClick={() => toggle(a)}>
                          {a.isActive ? 'Turn off' : 'Turn on'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {admins.data && !pg.total && <Empty>No admins match.</Empty>}
        <Pager page={pg.page} pageSize={Number(f.pageSize)} total={pg.total} onPage={(p) => set({ page: String(p) })} onSize={(x) => set({ pageSize: String(x) })} />
      </div>
      {pw && <PasswordModal target={pw} onClose={() => setPw(null)} />}
    </main>
  );
}

