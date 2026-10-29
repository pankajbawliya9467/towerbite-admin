'use client';
import { useState, type FormEvent } from 'react';
import type { Order } from '@/lib/types';
import { Modal } from '@/components/Modal';
import { Field } from '@/components/Field';

const REASONS = ['Item out of stock', 'Kitchen is closing', 'Too many orders right now'];

function Choices({ options, value, onPick }: { options: string[]; value: string; onPick: (v: string) => void }) {
  if (!options.length) return null;
  return (
    <div className="wrap" style={{ marginBottom: 16 }}>
      {options.map((o) => (
        <button type="button" key={o} className={`pill${value === o ? ' on' : ''}`} style={{ marginRight: 0 }} onClick={() => onPick(o)}>{o}</button>
      ))}
    </div>
  );
}

function TextDialog({ title, label, placeholder, options, confirm, danger, onClose, onConfirm }: {
  title: string; label: string; placeholder: string; options: string[]; confirm: string; danger?: boolean;
  onClose: () => void; onConfirm: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    await onConfirm(value.trim());
    setBusy(false);
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit}>
        <Choices options={options} value={value} onPick={setValue} />
        <Field label={label}>
          <input className="field" autoFocus required maxLength={label === 'Reason' ? 120 : 40} value={value}
            onChange={(e) => setValue(e.target.value)} placeholder={placeholder} />
        </Field>
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button type="button" className="btn sec" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className={`btn${danger ? ' dark' : ''}`} style={{ flex: 2 }} disabled={busy || !value.trim()}>{confirm}</button>
        </div>
      </form>
    </Modal>
  );
}

export function RejectDialog({ order, onClose, onConfirm }: {
  order: Order; onClose: () => void; onConfirm: (reason: string) => Promise<void>;
}) {
  return (
    <TextDialog title={`Reject #${order.orderNo}?`} label="Reason" placeholder="Tell the customer why" options={REASONS}
      confirm="Reject order" danger onClose={onClose} onConfirm={onConfirm} />
  );
}

export function DispatchDialog({ order, riders, onClose, onConfirm }: {
  order: Order; riders: string[]; onClose: () => void; onConfirm: (riderName: string) => Promise<void>;
}) {
  return (
    <TextDialog title={`Send out #${order.orderNo}`} label="Who is delivering it?" placeholder="Delivery person's name"
      options={riders} confirm="Out for delivery" onClose={onClose} onConfirm={onConfirm} />
  );
}
