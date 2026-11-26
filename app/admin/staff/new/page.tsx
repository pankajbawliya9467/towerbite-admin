'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useLoad } from '@/lib/useLoad';
import type { Cafe } from '@/lib/types';
import { FormCard, FormPage } from '@/components/FormPage';
import { Field } from '@/components/Field';

/** New cafe login on its own page (cafe, name, email, password). */
function NewLogin({ cafes, cafeId }: { cafes: Cafe[]; cafeId: string }) {
  const router = useRouter();
  const [d, setD] = useState({ name: '', email: '', password: '', cafeId });
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));

  async function save() {
    await api.post('/v1/admin/staff', d);
    alert('Login created. Share the email and password with the cafe privately.');
    router.push('/admin/staff');
  }

  return (
    <FormPage crumbs={[{ label: 'Cafe logins', href: '/admin/staff' }, { label: 'New login' }]} title="New cafe login"
      back="/admin/staff" submitLabel="Create login" onSubmit={save}>
      <FormCard title="Login" note="The cafe uses this email and password for its live board.">
        <Field label="Cafe" full>
          <select className="field" value={d.cafeId} onChange={(e) => set('cafeId', e.target.value)}>
            {cafes.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
          </select>
        </Field>
        <Field label="Name"><input className="field" required value={d.name} placeholder="Counter tablet" onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Email"><input className="field" type="email" required value={d.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Password · at least 8" full>
          <input className="field" type="text" required minLength={8} maxLength={72} value={d.password} autoComplete="new-password"
            onChange={(e) => set('password', e.target.value)} />
        </Field>
      </FormCard>
    </FormPage>
  );
}

function Load() {
  const cafes = useLoad<Cafe[]>('/v1/admin/cafes');
  const want = useSearchParams().get('cafe');
  if (cafes.error) return <main className="page"><div className="err">{cafes.error}</div></main>;
  if (!cafes.data) return null;
  if (!cafes.data.length) return <main className="page"><div className="card empty">Add a cafe first.</div></main>;
  return <NewLogin cafes={cafes.data} cafeId={cafes.data.some((c) => c.id === want) ? want! : cafes.data[0].id} />;
}

export default function NewStaffPage() {
  return <Suspense><Load /></Suspense>;
}
