'use client';
import { useMemo } from 'react';
import { api } from '@/lib/api';
import { useLoad } from '@/lib/useLoad';
import { PageHead } from '@/components/PageHead';
import { Chips, DateRange, Empty, Pager, SearchBox, rangeLabel, useClientPage } from '@/components/ListTools';
import { useFilters } from '@/lib/useFilters';
import { useCan } from '@/components/useCan';

type Req = {
  id: string; phone: string; name: string; kind: 'delete_account' | 'delete_data'; reason: string;
  status: 'pending' | 'done' | 'rejected'; note: string; createdAt: string; handledAt: string | null; hasAccount: boolean; verified?: boolean;
};
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
const daysLeft = (iso: string) => 30 - Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000);

/** Deletion requests from the website form (towerbite-web.vercel.app/delete-account). Play Store expects them handled within 30 days. */
export default function RequestsPage() {
  const canEdit = useCan()('requests.edit');
  const { f, set, clear, ready } = useFilters({ status: 'pending', search: '', from: '', to: '', page: '1', pageSize: '25' });
  const status = f.status as Req['status'] | '';
  const list = useLoad<Req[]>(ready ? `/v1/admin/account-requests${status ? `?status=${status}` : ''}` : null, undefined, true);
  const filtered = useMemo(() => {
    const t = f.search.toLowerCase();
    const day = (iso: string) => new Date(new Date(iso).getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
    return (list.data ?? []).filter((r) =>
      (!t || r.phone.includes(t) || r.name.toLowerCase().includes(t))
      && (!f.from || day(r.createdAt) >= f.from) && (!f.to || day(r.createdAt) <= f.to));
  }, [list.data, f.search, f.from, f.to]);
  const pg = useClientPage(filtered, Number(f.page), Number(f.pageSize));
  const chips = [
    f.search && { label: `"${f.search}"`, clear: () => set({ search: '' }) },
    (f.from || f.to) && { label: rangeLabel(f.from, f.to), clear: () => set({ from: '', to: '' }) },
  ].filter(Boolean) as { label: string; clear: () => void }[];

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
          <button key={s || 'all'} className={`pill${status === s ? ' on' : ''}`} onClick={() => set({ status: s })}>{s ? s[0].toUpperCase() + s.slice(1) : 'All'}</button>
        ))}
      </div>
      <div className="lt-bar">
        <SearchBox value={f.search} onChange={(search) => set({ search })} placeholder="Phone or name" />
        <DateRange from={f.from} to={f.to} onChange={(from, to) => set({ from, to })} anyLabel="Received: any time" />
      </div>
      <Chips items={chips} onClear={() => clear(['pageSize', 'status'])} />
      {list.error && <div className="err">{list.error}</div>}
      <div className="card">
        {list.data && !pg.total && <Empty>No requests here.</Empty>}
        {pg.rows.map((r, i) => (
          <div key={r.id} className="row" style={{ padding: '16px 20px', borderTop: i ? '1px solid var(--line)' : 0, gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div><b>{r.phone}</b>{r.name && <span className="small"> · {r.name}</span>}{' '}
                <span className={`badge ${r.kind === 'delete_account' ? 'acc' : 'mute'}`}>{r.kind === 'delete_account' ? 'Delete account' : 'Delete some data'}</span>{' '}
                {!r.hasAccount && <span className="badge mute">No account with this number</span>}{' '}
                {r.verified ? <span className="badge ok">Sent from this number</span>
                  : <span className="badge warn" title="Anyone can type a number here. Call or message this number to confirm before deleting.">Not verified · confirm on the phone first</span>}
              </div>
              {r.reason && <div style={{ marginTop: 4 }}>“{r.reason}”</div>}
              <div className="small" style={{ marginTop: 4 }}>
                {when(r.createdAt)}
                {r.status === 'pending' ? ` · ${Math.max(0, daysLeft(r.createdAt))} days left` : ` · ${r.status} ${r.handledAt ? when(r.handledAt) : ''}${r.note ? ` · ${r.note}` : ''}`}
              </div>
            </div>
            {canEdit && <div style={{ display: 'flex', gap: 8 }}>
              {r.status === 'pending' ? (
                <>
                  <button className="btn sm" onClick={() => mark(r, 'done')}>Mark done</button>
                  <button className="btn sec sm" onClick={() => mark(r, 'rejected')}>Reject</button>
                </>
              ) : (
                <button className="btn sec sm" onClick={() => mark(r, 'pending')}>Reopen</button>
              )}
            </div>}
          </div>
        ))}
        <Pager page={pg.page} pageSize={Number(f.pageSize)} total={pg.total} onPage={(p) => set({ page: String(p) })} onSize={(x) => set({ pageSize: String(x) })} />
      </div>
    </main>
  );
}
