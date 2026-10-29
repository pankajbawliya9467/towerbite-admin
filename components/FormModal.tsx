'use client';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Modal } from './Modal';

/** Modal with a two-column form, a save button and inline errors. */
export function FormModal({ title, wide, submitLabel = 'Save', onClose, onSubmit, children }: {
  title: string; wide?: boolean; submitLabel?: string; onClose: () => void; onSubmit: () => Promise<void>; children: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSubmit();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal title={title} wide={wide} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form">{children}</div>
        {error && <div className="err" style={{ marginTop: 16 }}>{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn sec" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn" style={{ flex: 2 }} disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
        </div>
      </form>
    </Modal>
  );
}
