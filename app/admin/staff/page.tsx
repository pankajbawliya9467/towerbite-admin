'use client';
import { useMemo, useState } from 'react';
import { Chips, Empty, Pager, SearchBox, useClientPage } from '@/components/ListTools';
import { useFilters } from '@/lib/useFilters';

import { useRouter } from 'next/navigation';
import { confirmDelete } from '@/lib/confirm';
import { api } from '@/lib/api';
import { shortDate } from '@/lib/format';
import { PasswordModal, type PasswordTarget } from '@/components/PasswordModal';
import { useLoad } from '@/lib/useLoad';
import type { Cafe, StaffRow } from '@/lib/types';
import { PageHead } from '@/components/PageHead';
import { FormModal } from '@/components/FormModal';
import { Field } from '@/components/Field';
import { Icon } from '@/components/Icon';

/** Every cafe's CRM logins in one list. Admins are on the Admins page. */
export default function StaffPage() {
  const staff = useLoad<StaffRow[]>('/v1/admin/staff');
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [pw, setPw] = useState<PasswordTarget | null>(null);
  const router = useRouter();
  const { f, set, clear } = useFilters({ search: '', cafe: '', page: '1', pageSize: '25' });
  const cafes = useMemo(() => [...new Set((staff.data ?? []).map((s) => s.cafeName ?? '').filter(Boolean))].sort(), [staff.data]);
  const filtered = useMemo(() => {
    const t = f.search.toLowerCase();
    return (staff.data ?? []).filter((s) =>
      (!t || [s.name, s.email, s.cafeName ?? ''].some((x) => (x ?? '').toLowerCase().includes(t))) && (!f.cafe || s.cafeName === f.cafe));
  }, [staff.data, f.search, f.cafe]);
  const pg = useClientPage(filtered, Number(f.page), Number(f.pageSize));
  const chips = [
    f.search && { label: `"${f.search}"`, clear: () => set({ search: '' }) },
    f.cafe && { label: f.cafe, clear: () => set({ cafe: '' }) },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  async function remove(s: StaffRow) {
    if (!confirmDelete(`the login of ${s.name || s.email}`, 'They will no longer be able to log in.')) return;
    await api.del(`/v1/admin/staff/${s.userId}`).catch((e: Error) => alert(e.message));
    await staff.reload();
  }

  return (
    <main className="page">
      <PageHead title="Cafe logins" sub="Each cafe logs in to see its own live board, menu and reports. Admins are on the Admins page.">
        <button className="btn sm" onClick={() => router.push('/admin/staff/new')}><Icon name="plus" /> Add login</button>
      </PageHead>
      <div className="lt-bar">
        <SearchBox value={f.search} onChange={(search) => set({ search })} placeholder="Cafe, name or email" />
        <select className="field lt-sel" value={f.cafe} aria-label="Cafe" onChange={(e) => set({ cafe: e.target.value })}>
          <option value="">All cafes</option>
          {cafes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <Chips items={chips} onClear={() => clear(['pageSize'])} />
      {staff.error && <div className="err">{staff.error}</div>}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table" style={{ minWidth: 680 }}>
          <thead><tr><th>Cafe</th><th>Name</th><th>Email</th><th>Password</th><th /></tr></thead>
          <tbody>
            {pg.rows.map((s) => (
              <tr key={s.userId}>
                <td style={{ fontWeight: 700 }}>{s.cafeName ?? '—'}</td>
                <td>{s.name || '—'}<div className="small">{s.activeLogins} device{s.activeLogins === 1 ? '' : 's'}</div></td>
                <td>{s.email}</td>
                <td className="small nowrap">{s.passwordSetAt ? `changed ${shortDate(s.passwordSetAt)}` : '—'}</td>
                <td className="num nowrap">
                  <button className="link" onClick={() => setEditing(s)}>Change email</button>
                  <button className="link" style={{ marginLeft: 14 }} onClick={() => setPw({ who: s.name || s.email, path: `/v1/admin/staff/${s.userId}/password` })}>New password</button>
                  <button className="link" style={{ color: 'var(--red)', marginLeft: 14 }} onClick={() => remove(s)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {staff.data && !pg.total && <Empty>{chips.length ? 'No logins match.' : 'No cafe logins yet.'}</Empty>}
        <Pager page={pg.page} pageSize={Number(f.pageSize)} total={pg.total} onPage={(p) => set({ page: String(p) })} onSize={(x) => set({ pageSize: String(x) })} />
      </div>
      {editing && <EmailForm s={editing} onClose={() => setEditing(null)} onSaved={staff.reload} />}
      {pw && <PasswordModal target={pw} onClose={() => setPw(null)} onDone={() => void staff.reload()} />}
    </main>
  );
}

function EmailForm({ s, onClose, onSaved }: { s: StaffRow; onClose: () => void; onSaved: () => Promise<void> }) {
  const [d, setD] = useState({ name: s.name, email: s.email });
  async function save() {
    const r = await api.patch<{ loggedOut: boolean }>(`/v1/admin/staff/${s.userId}`, d);
    if (r.loggedOut) alert(`${s.cafeName ?? 'The cafe'} was logged out on every device. Share the new email privately.`);
    await onSaved();
  }
  return (
    <FormModal title={`Login of ${s.cafeName ?? s.name}`} onClose={onClose} onSubmit={save}>
      <Field label="Name" full><input className="field" required value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
      <Field label="Login email" full><input className="field" type="email" required value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} /></Field>
      <div className="note-warn">Changing the email logs the cafe out on every device.</div>
    </FormModal>
  );
}

