'use client';
import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import { FoodTile } from './FoodTile';
import { Icon } from './Icon';

/** Uploads to /v1/admin/upload and reports the public URL. */
export function ImageField({ value, onChange, folder, emoji, color }: {
  value: string | null; onChange: (url: string | null) => void; folder: string; emoji: string; color: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      onChange((await api.upload(file, folder)).url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <FoodTile emoji={emoji || '🍽️'} imageUrl={value} color={color} size={64} />
        <button type="button" className="btn sec sm" disabled={busy} onClick={() => input.current?.click()}>
          <Icon name="upload" /> {busy ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
        </button>
        {value && <button type="button" className="link" style={{ color: 'var(--sub)' }} onClick={() => onChange(null)}>Remove</button>}
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      {error && <div className="err" style={{ marginTop: 8 }}>{error}</div>}
    </div>
  );
}
