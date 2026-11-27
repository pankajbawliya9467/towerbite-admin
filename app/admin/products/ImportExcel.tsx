'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import type { Cafe } from '@/lib/types';
import { Modal } from '@/components/Modal';
import { Icon } from '@/components/Icon';

type Row = {
  row: number; name: string; status: 'new' | 'update' | 'same' | 'error'; errors: string[];
  changes: { field: string; from: string; to: string }[]; categoryPath: string;
};
type Answer = { saved: boolean; summary: Record<Row['status'], number>; rows: Row[]; switchOff: boolean };
const LABEL: Record<Row['status'], { text: string; cls: string }> = {
  new: { text: 'New', cls: 'ok' },
  update: { text: 'Update', cls: 'info' },
  same: { text: 'No change', cls: 'mute' },
  error: { text: 'Error', cls: 'no' },
};

/** Download the cafe's Excel template (its products filled in, with the category list). */
export function downloadTemplate(cafe: Cafe) {
  return api.download(`/v1/admin/menu-items/template.xlsx?cafeId=${cafe.id}`, `${cafe.slug}-products.xlsx`).catch((e: Error) => alert(e.message));
}

/**
 * Products from an Excel file: pick the file, see what will be added / changed / is wrong, then Import.
 * The same file is sent twice: first for the preview, then (on Import) to save.
 */
export function ImportExcel({ cafe, onClose, onDone }: { cafe: Cafe; onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [show, setShow] = useState<Row['status'] | 'all'>('all');

  async function send(f: File, commit: boolean) {
    const form = new FormData();
    form.append('file', f);
    return api.post<Answer>(`/v1/admin/menu-items/import?cafeId=${cafe.id}&commit=${commit ? 1 : 0}`, form);
  }

  async function pick(f: File | undefined) {
    if (!f) return;
    setFile(f);
    setAnswer(null);
    setError('');
    setBusy(true);
    try {
      const a = await send(f, false);
      setAnswer(a);
      setShow(a.summary.error ? 'error' : 'all');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!file || !answer) return;
    setBusy(true);
    setError('');
    try {
      const a = await send(file, true);
      alert(`${a.summary.new} products added, ${a.summary.update} updated${a.summary.error ? `, ${a.summary.error} rows with errors skipped` : ''}.`);
      onDone();
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const rows = (answer?.rows ?? []).filter((r) => show === 'all' || r.status === show);
  const toSave = answer ? answer.summary.new + answer.summary.update : 0;

  return (
    <Modal title={`Import products · ${cafe.name}`} wide onClose={onClose}>
      <div className="stack" style={{ gap: 16 }}>
        <div className="ix-steps">
          <span><b>1</b> Download the template (this cafe's products are already in it)</span>
          <span><b>2</b> Add or change rows in Excel and save</span>
          <span><b>3</b> Upload it here, check the preview, Import</span>
        </div>
        <div className="wrap">
          <button type="button" className="btn sec sm" onClick={() => void downloadTemplate(cafe)}><Icon name="download" /> Download template</button>
          <label className="btn sm ix-file">
            <Icon name="upload" /> {file ? 'Choose another file' : 'Choose Excel file'}
            <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; void pick(f); }} />
          </label>
          <a className="link" style={{ alignSelf: 'center' }} href="/templates/towerbites-products-sample.xlsx" download>See a sample file</a>
          {file && <span className="small" style={{ alignSelf: 'center' }}>{file.name}</span>}
        </div>

        {busy && !answer && <div className="small">Reading the file…</div>}
        {error && <div className="err">{error}</div>}

        {answer && (
          <>
            {answer.switchOff && (
              <div className="note-warn">
                Menus still use each cafe's own categories
                <small>New products from this file only show on menus after the switch on Admin → Categories is on.</small>
              </div>
            )}
            <div className="wrap">
              {(['all', 'new', 'update', 'error', 'same'] as const).map((k) => (
                <button key={k} type="button" className={`pill${show === k ? ' on' : ''}`} onClick={() => setShow(k)}>
                  {k === 'all' ? `All ${answer.rows.length}` : `${LABEL[k].text} ${answer.summary[k]}`}
                </button>
              ))}
            </div>
            <div className="table-scroll ix-table">
              <table className="table">
                <thead><tr><th className="num">Row</th><th>Product</th><th>Category</th><th>What happens</th></tr></thead>
                <tbody>
                  {!rows.length && <tr><td colSpan={4} className="empty">Nothing here.</td></tr>}
                  {rows.map((r) => (
                    <tr key={r.row}>
                      <td className="num">{r.row}</td>
                      <td><b>{r.name || '—'}</b></td>
                      <td className="small">{r.categoryPath || '—'}</td>
                      <td>
                        <span className={`badge ${LABEL[r.status].cls}`}>{LABEL[r.status].text}</span>
                        {r.errors.map((e) => <div key={e} className="err" style={{ fontSize: 13, marginTop: 4 }}>{e}</div>)}
                        {r.status === 'update' && r.changes.map((c) => (
                          <div key={c.field} className="small" style={{ marginTop: 4 }}>{c.field}: {c.from} → <b>{c.to}</b></div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {answer.summary.error > 0 && (
              <div className="small">Rows with errors are skipped. Fix them in Excel and upload again, or import the rest now.</div>
            )}
          </>
        )}

        <div className="modal-actions">
          <button type="button" className="btn sec" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button type="button" className="btn" style={{ flex: 2 }} disabled={busy || !toSave} onClick={() => void save()}>
            {busy && answer ? 'Importing…' : toSave ? `Import ${toSave} product${toSave === 1 ? '' : 's'}` : 'Nothing to import'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
