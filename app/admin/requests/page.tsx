'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useLoad } from '@/lib/useLoad';
import { PageHead } from '@/components/PageHead';

type Req = {
  id: string; phone: string; name: string; kind: 'delete_account' | 'delete_data'; reason: string;
  status: 'pending' | 'done' | 'rejected'; note: string; createdAt: string; handledAt: string | null; hasAccount: boolean;
};
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
const daysLeft = (iso: string) => 30 - Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000);

/** Deletion requests from the website form (towerbite-web.vercel.app/delete-account). Play Store expects them handled within 30 days. */
export default function RequestsPage() {
  const [status, setStatus] = useState<'pending' | 'done' | 'rejected' | ''>('pending');
  const list = useLoad<Req[]>(`/v1/admin/account-requests${status ? `?status=${status}` : ''}`);

  async function mark(r: Req, next: Req['status']) {
    const note = next === 'pending' ? '' : prompt(next === 'done' ? 'Note (what you deleted):' : 'Why rejected?', '') ?? null;
    if (note === null) return;
    await api.patch(`/v1/admin/account-requests/${r.id}`, { status: next, note }).catch((e: Error) => alert(e.message));
    await list.reload();
  }

  return (
    <main className="page">
      <PageHead title="Account requests" sub="Delete-account and delete-data requests from the website. Handle each within 30 days, then mark it done." />
      <div className="wrap" style={{ marginBottom: 18 }}>
        {(['pending', 'done', 'rejected', ''] as const).map((s) => (
          <button key={s || 'all'} className={`pill${status === s ? ' on' : ''}`} onClick={() => setStatus(s)}>{s ? s[0].toUpperCase() + s.slice(1) : 'All'}</button>
        ))}
      </div>
      {list.error && <div className="err">{list.error}</div>}
      <div className="card">
        {list.data?.length === 0 && <div className="empty">No requests here.</div>}
        {list.data?.map((r, i) => (
          <div key={r.id} className="row" style={{ padding: '16px 20px', borderTop: i ? '1px solid var(--line)' : 0, gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div><b>{r.phone}</b>{r.name && <span className="small"> · {r.name}</span>}{' '}
                <span className={`badge ${r.kind === 'delete_account' ? 'acc' : 'mute'}`}>{r.kind === 'delete_account' ? 'Delete account' : 'Delete some data'}</span>{' '}
                {!r.hasAccount && <span className="badge mute">No account with this number</span>}
              </div>
              {r.reason && <div style={{ marginTop: 4 }}>“{r.reason}”</div>}
              <div className="small" style={{ marginTop: 4 }}>
                {when(r.createdAt)}
                {r.status === 'pending' ? ` · ${Math.max(0, daysLeft(r.createdAt))} days left` : ` · ${r.status} ${r.handledAt ? when(r.handledAt) : ''}${r.note ? ` · ${r.note}` : ''}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {r.status === 'pending' ? (
                <>
                  <button className="btn sm" onClick={() => mark(r, 'done')}>Mark done</button>
                  <button className="btn sec sm" onClick={() => mark(r, 'rejected')}>Reject</button>
                </>
              ) : (
                <button className="btn sec sm" onClick={() => mark(r, 'pending')}>Reopen</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
