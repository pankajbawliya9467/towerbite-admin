'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { FormModal } from './FormModal';
import { Field } from './Field';
import { Icon } from './Icon';

export type PasswordTarget = { who: string; path: string };

/** Small popup: a new password typed twice for someone else's login (they are logged out everywhere). */
export function PasswordModal({ target, onClose, onDone }: { target: PasswordTarget; onClose: () => void; onDone?: () => void }) {
  const [pw, setPw] = useState('');
  const [again, setAgain] = useState('');
  const match = !!again && again === pw;

  async function save() {
    if (pw.length < 8) throw new Error('At least 8 characters.');
    if (pw !== again) throw new Error('The two passwords are not the same.');
    await api.post(target.path, { password: pw });
    alert(`Done. Share the new password with ${target.who} privately.`);
    onDone?.();
  }

  return (
    <FormModal title={`New password · ${target.who}`} submitLabel="Set password" onClose={onClose} onSubmit={save}>
      <Field label="New password · at least 8" full>
        <input className="field" type="password" autoFocus required minLength={8} maxLength={72} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
      </Field>
      <Field label="Again" full>
        <div style={{ position: 'relative' }}>
          <input className="field" type="password" required autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
          {match && <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--green)' }}><Icon name="check" /></span>}
        </div>
      </Field>
      <div className="small full">They are logged out on every device.</div>
    </FormModal>
  );
}
