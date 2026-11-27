'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { rupees } from '@/lib/format';
import type { CafeWithMenu } from '@/lib/types';
import { useCafe } from '@/components/CafeContext';
import { useCan } from '@/components/useCan';

/**
 * The cafe's minimum order value (items + combos). Customers see "Min order ₹X" on the menu and in the cart,
 * and can't place an order below it. 0 = no minimum. An admin working here needs the "edit cafe" tick.
 */
export function MinOrder() {
  const { cafe, setCafe, isAdmin } = useCafe();
  const ok = useCan();
  const allowed = !isAdmin || ok('cafes.edit');
  const [value, setValue] = useState(String(cafe.minOrder ?? 0));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => setValue(String(cafe.minOrder ?? 0)), [cafe.minOrder]);

  const n = Math.round(Number(value));
  const valid = value.trim() !== '' && Number.isFinite(n) && n >= 0 && n <= 10000;
  const changed = valid && n !== (cafe.minOrder ?? 0);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!changed) return;
    setBusy(true);
    setMsg(null);
    try {
      const next = await api.patch<CafeWithMenu>('/v1/cafe', { minOrder: n });
      setCafe({ ...cafe, ...next });
      setMsg({ ok: true, text: n ? `Saved. Orders below ${rupees(n)} can't be placed.` : 'Saved. No minimum order.' });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card mo-card" onSubmit={save}>
      <div className="mo-text">
        <div style={{ fontWeight: 800, fontSize: 16 }}>Minimum order value</div>
        <div className="small" style={{ marginTop: 4 }}>
          {cafe.minOrder ? <>Now <b>{rupees(cafe.minOrder)}</b>. Customers see it on your menu and can&apos;t order below it.</> : 'No minimum now. Set an amount to stop very small orders. 0 = no minimum.'}
        </div>
        {msg && <div className={msg.ok ? 'ok-note' : 'err'} style={{ marginTop: 10 }}>{msg.text}</div>}
      </div>
      <div className="mo-form">
        <label className="mo-input" aria-label="Minimum order in rupees">
          <span>₹</span>
          <input className="field" type="number" inputMode="numeric" min={0} max={10000} step={10} value={value}
            disabled={!allowed || busy} onChange={(e) => setValue(e.target.value)} />
        </label>
        <button className="btn sm" disabled={!allowed || busy || !changed} title={allowed ? undefined : "You don't have the edit cafe tick"}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
