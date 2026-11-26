'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useLoad } from '@/lib/useLoad';
import { Field } from '@/components/Field';
import { PageHead } from '@/components/PageHead';
import { useSession } from '@/components/Session';

type AiSettings = {
  configured: boolean; keyEnding: string | null; fromServerEnv: boolean;
  model: string; style: string; dailyLimit: number; usedToday: number; models: string[];
};
const STYLES = [
  { key: 'fun_hinglish', label: 'Fun & Hinglish', eg: '"Baarish + garma garam chai ☔"' },
  { key: 'english', label: 'Simple English', eg: '"Rainy day? Hot chai at your desk"' },
  { key: 'hindi', label: 'Hindi', eg: '"बारिश में गरम चाय ☔"' },
];

/** AI settings for notification ideas. Everyone who can send sees it; only super admins change it. */
export default function AiSettingsPage() {
  const { state } = useSession();
  const isSuper = state.status === 'ready' && !!state.me.staff?.isSuper;
  const s = useLoad<AiSettings>('/v1/admin/settings/ai');
  const [key, setKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [style, setStyle] = useState('fun_hinglish');
  const [limit, setLimit] = useState(30);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!s.data) return;
    setModel(s.data.model);
    setStyle(s.data.style);
    setLimit(s.data.dailyLimit);
  }, [s.data]);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await api.put('/v1/admin/settings/ai', { ...(key.trim() ? { apiKey: key.trim() } : {}), model, style, dailyLimit: limit });
      setKey('');
      setMsg({ ok: true, text: key.trim() ? 'Saved. The key works.' : 'Saved.' });
      await s.reload();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }
  async function removeKey() {
    if (!confirm('Remove the OpenAI key? AI ideas stop until a new key is added.')) return;
    setBusy(true);
    try {
      await api.del('/v1/admin/settings/ai/key');
      setMsg({ ok: true, text: 'Key removed.' });
      await s.reload();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const d = s.data;
  return (
    <>
      <PageHead title="AI settings" sub="ChatGPT writes notification ideas from the weather, time and what's selling. You always pick and send." />
      {s.error && <div className="err">{s.error}</div>}
      {d && (
        <section className="card" style={{ maxWidth: 640, padding: 22 }}>
          {!isSuper && <div className="ai-warn" style={{ marginTop: 0, marginBottom: 14 }}>Only a super admin can change these.</div>}
          <div className="form">
            <Field label="OpenAI key" full>
              <div className="small" style={{ marginBottom: 6 }}>
                {d.configured
                  ? <>Saved{d.keyEnding ? <> · ends in <b>…{d.keyEnding}</b></> : null}{d.fromServerEnv ? ' (from the server settings)' : ''}. It is stored encrypted and never shown again.</>
                  : 'No key yet. Get one at platform.openai.com → API keys.'}
              </div>
              {isSuper && (
                <div className="ai-row">
                  <input className="field" type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)}
                    placeholder={d.configured ? 'Paste a new key to replace it' : 'sk-…'} aria-label="OpenAI key" />
                  {d.configured && !d.fromServerEnv && <button type="button" className="btn sec" style={{ width: 'auto', padding: '0 16px' }} disabled={busy} onClick={removeKey}>Remove</button>}
                </div>
              )}
            </Field>
            <Field label="Model">
              <select className="field" value={model} disabled={!isSuper} onChange={(e) => setModel(e.target.value)}>
                {d.models.map((m) => <option key={m} value={m}>{m}{m === 'gpt-4o-mini' ? ' (cheapest, good enough)' : ''}</option>)}
              </select>
            </Field>
            <Field label={`Ideas per day · ${d.usedToday} used today`}>
              <input className="field" type="number" min={1} max={500} value={limit} disabled={!isSuper} onChange={(e) => setLimit(Math.max(1, Math.min(500, Number(e.target.value) || 1)))} />
            </Field>
            <Field label="Writing style" full>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="radiogroup" aria-label="Writing style">
                {STYLES.map((x) => (
                  <button key={x.key} type="button" role="radio" aria-checked={style === x.key} disabled={!isSuper}
                    className={`pill${style === x.key ? ' on' : ''}`} onClick={() => setStyle(x.key)} title={x.eg}>{x.label}</button>
                ))}
              </div>
              <div className="small" style={{ marginTop: 6 }}>e.g. {STYLES.find((x) => x.key === style)?.eg}</div>
            </Field>
          </div>
          <div className="small" style={{ marginTop: 14 }}>
            What goes to OpenAI: building name, time, weather, open cafes and their menu with prices. Never customer names, numbers or orders.
          </div>
          {isSuper && (
            <div className="row" style={{ marginTop: 18, justifyContent: 'flex-end' }}>
              <button className="btn" style={{ width: 'auto', padding: '0 22px' }} disabled={busy} onClick={save}>{busy ? 'Checking…' : 'Save'}</button>
            </div>
          )}
          {msg && <div className={msg.ok ? 'badge ok' : 'err'} style={{ marginTop: 14, padding: msg.ok ? '8px 12px' : undefined }}>{msg.text}</div>}
        </section>
      )}
    </>
  );
}
