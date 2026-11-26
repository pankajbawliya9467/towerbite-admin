'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ALL_PERMS, COLS, SECTIONS, sectionKeys } from '@/lib/perms';
import type { AdminRow, Permission } from '@/lib/types';
import { FormCard, FormPage } from '@/components/FormPage';
import { Field } from '@/components/Field';

/** New / edit admin on its own page: name, email, password (new only) and what they can do. */
export function AdminEditor({ admin, mine, canSuper }: { admin: AdminRow | null; mine: Permission[] | null; canSuper: boolean }) {
  const router = useRouter();
  const [d, setD] = useState({
    name: admin?.name ?? '', email: admin?.email ?? '', password: '',
    isSuper: admin?.isSuper ?? false, permissions: admin?.permissions ?? ([] as Permission[]),
  });
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));
  const has = (k: Permission) => d.permissions.includes(k);
  const allowed = (k: Permission) => mine === null || mine.includes(k);
  /** Ticking any action also ticks View; unticking View clears the whole section. */
  function flip(k: Permission) {
    const sec = k.split('.')[0];
    let next = has(k) ? d.permissions.filter((x) => x !== k) : [...d.permissions, k];
    if (!has(k) && !k.endsWith('.view')) next.push(`${sec}.view`);
    if (has(k) && k.endsWith('.view')) next = next.filter((x) => !x.startsWith(`${sec}.`));
    set('permissions', ALL_PERMS.filter((x) => next.includes(x)));
  }
  function flipSection(keys: Permission[]) {
    const mineKeys = keys.filter(allowed);
    const full = mineKeys.every(has);
    const rest = d.permissions.filter((x) => !keys.includes(x));
    set('permissions', ALL_PERMS.filter((x) => (full ? rest : [...rest, ...mineKeys]).includes(x)));
  }
  const viewOnly = () => setD((x) => ({ ...x, isSuper: false, permissions: SECTIONS.map((s) => `${s.key}.view` as Permission).filter(allowed) }));
  const make = () => set('password', Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join(''));

  async function save() {
    if (!d.isSuper && !d.permissions.length) throw new Error('Tick at least one thing this admin can do.');
    if (admin) {
      await api.patch(`/v1/admin/admins/${admin.id}`, { name: d.name, email: d.email, isSuper: d.isSuper, permissions: d.permissions });
      if (d.email.toLowerCase() !== admin.email.toLowerCase()) alert(`Email changed. ${d.name} was logged out and logs in with the new email.`);
    } else {
      await api.post('/v1/admin/admins', d);
      alert(`Admin created. Share the email and password with ${d.name} privately.`);
    }
    router.push('/admin/admins');
  }

  return (
    <FormPage crumbs={[{ label: 'Admins', href: '/admin/admins' }, { label: admin ? admin.name : 'New admin' }]}
      title={admin ? admin.name : 'New admin'} back="/admin/admins" submitLabel={admin ? 'Save changes' : 'Create admin'} onSubmit={save}>
      <FormCard title="Who">
      <Field label="Name"><input className="field" required maxLength={80} value={d.name} onChange={(e) => set('name', e.target.value)} /></Field>
      <Field label="Email (login)"><input className="field" type="email" required value={d.email} onChange={(e) => set('email', e.target.value)} /></Field>
      {!admin && (
        <Field label="Password · at least 8" full>
          <div style={{ display: 'flex', gap: 10 }}>
            <input className="field" type="text" required minLength={8} maxLength={72} value={d.password} autoComplete="new-password"
              onChange={(e) => set('password', e.target.value)} />
            <button type="button" className="btn sec sm" onClick={make}>Make one</button>
          </div>
        </Field>
      )}
      </FormCard>
      <FormCard title="What they can do" note="They only see the sections and buttons you tick here.">
      <Field label="Quick start" full>
        <div className="wrap">
          <button type="button" className="pill" onClick={viewOnly}>Only view everything</button>
          <button type="button" className={`pill${!d.isSuper ? ' on' : ''}`} onClick={() => set('isSuper', false)}>Custom</button>
          {canSuper && <button type="button" className={`pill${d.isSuper ? ' on' : ''}`} onClick={() => set('isSuper', true)}>Super admin · everything</button>}
        </div>
      </Field>
      {d.isSuper ? (
        <div className="note-warn">Super admin can do everything, including making other admins. Keep it to 1–2 people.</div>
      ) : (
        <div className="full perm-wrap">
          <table className="perm-table">
            <thead><tr><th>Section</th>{COLS.map((c) => <th key={c.key} className="c">{c.label}</th>)}<th>Extra</th></tr></thead>
            <tbody>
              {SECTIONS.map((x) => {
                const keys = sectionKeys(x);
                const n = keys.filter(has).length;
                const state = n === 0 ? '' : n === keys.length ? 'on' : 'part';
                return (
                  <tr key={x.key} className={n ? 'on' : undefined}>
                    <td>
                      <label className="perm-sec">
                        <input type="checkbox" checked={state === 'on'} ref={(el) => { if (el) el.indeterminate = state === 'part'; }}
                          disabled={!keys.some(allowed)} onChange={() => flipSection(keys)} />
                        {x.label}
                      </label>
                    </td>
                    {COLS.map((c) => {
                      const k = `${x.key}.${c.key}` as Permission;
                      return (
                        <td key={c.key} className="c">
                          {x.cols.includes(c.key)
                            ? <input type="checkbox" aria-label={`${x.label}: ${c.label}`} checked={has(k)} disabled={!allowed(k)} onChange={() => flip(k)} />
                            : <span className="na">—</span>}
                        </td>
                      );
                    })}
                    <td>
                      {x.extras.map((e) => {
                        const k = `${x.key}.${e.key}` as Permission;
                        return (
                          <label key={e.key} className="perm-ex" data-on={has(k) || undefined} data-off={!allowed(k) || undefined} title={e.hint}>
                            <input type="checkbox" checked={has(k)} disabled={!allowed(k)} onChange={() => flip(k)} />{e.label}
                          </label>
                        );
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="small" style={{ marginTop: 8 }}>
            — = this action doesn&apos;t exist in that section. &quot;Admins&quot; lets them add other admins, so give it carefully. Nobody can give more than they have.
          </div>
        </div>
      )}
      </FormCard>
    </FormPage>
  );
}
