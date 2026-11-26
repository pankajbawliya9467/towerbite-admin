'use client';
import { addressLine, rupees, shortDate } from '@/lib/format';
import { useLoad } from '@/lib/useLoad';
import { toQuery, useFilters } from '@/lib/useFilters';
import type { Location, UserRow } from '@/lib/types';
import { PageHead } from '@/components/PageHead';
import { useCan } from '@/components/useCan';
import { Chips, DateRange, Empty, Pager, SearchBox, rangeLabel, type Paged } from '@/components/ListTools';

export default function UsersPage() {
  const ok = useCan();
  const { f, set, clear, ready } = useFilters({ search: '', locationId: '', company: '', from: '', to: '', orders: '', page: '1', pageSize: '25' });
  const locations = useLoad<Location[]>('/v1/admin/locations');
  const users = useLoad<Paged<UserRow>>(ready ? `/v1/admin/users${toQuery(f)}` : null, undefined, true);
  const loc = locations.data?.find((l) => l.id === f.locationId);
  const chips = [
    f.search && { label: `"${f.search}"`, clear: () => set({ search: '' }) },
    loc && { label: loc.name, clear: () => set({ locationId: '' }) },
    f.company && { label: `Company: ${f.company}`, clear: () => set({ company: '' }) },
    (f.from || f.to) && { label: `Joined ${rangeLabel(f.from, f.to).toLowerCase()}`, clear: () => set({ from: '', to: '' }) },
    f.orders && { label: f.orders === 'yes' ? 'Has ordered' : 'Never ordered', clear: () => set({ orders: '' }) },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  return (
    <main className="page">
      <PageHead title="Users" sub={users.data ? `${users.data.total.toLocaleString('en-IN')} employees match (newest first).` : 'Employees who order on TowerBites.'} />
      <div className="lt-bar">
        <SearchBox value={f.search} onChange={(search) => set({ search })} placeholder={ok('users.phone') ? 'Name, phone or email' : 'Name'} />
        <select className="field lt-sel" value={f.locationId} aria-label="Building" onChange={(e) => set({ locationId: e.target.value })}>
          <option value="">All buildings</option>
          {locations.data?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <SearchBox value={f.company} onChange={(company) => set({ company })} placeholder="Company" width={170} />
        <DateRange from={f.from} to={f.to} onChange={(from, to) => set({ from, to })} anyLabel="Joined: any time" />
        <select className="field lt-sel" value={f.orders} aria-label="Orders" onChange={(e) => set({ orders: e.target.value })}>
          <option value="">With or without orders</option>
          <option value="yes">Has ordered</option>
          <option value="no">Never ordered</option>
        </select>
      </div>
      <Chips items={chips} onClear={() => clear(['pageSize'])} />
      {users.error && <div className="err">{users.error}</div>}
      <div className="card">
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Phone</th><th>Company</th><th>Desk</th><th>Location</th><th className="num">Orders</th><th className="num">Spent</th><th>Joined</th></tr>
            </thead>
            <tbody>
              {users.data?.rows.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.name || <span style={{ color: 'var(--faint)', fontWeight: 400 }}>No name</span>}<div className="small" style={{ fontWeight: 400 }}>{u.email}</div></td>
                  <td>{u.phone ?? '—'}</td>
                  <td>{u.company || '—'}</td>
                  <td>{addressLine({ tower: u.tower, floor: u.floor, desk: u.desk, company: '' }) || '—'}</td>
                  <td style={{ color: 'var(--sub)' }}>{u.locationName ?? '—'}</td>
                  <td className="num">{u.orderCount}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{rupees(u.spent)}</td>
                  <td style={{ color: 'var(--sub)', whiteSpace: 'nowrap' }}>{shortDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.data?.rows.length === 0 && <Empty>No users match these filters.</Empty>}
        {users.data && <Pager page={users.data.page} pageSize={users.data.pageSize} total={users.data.total} onPage={(p) => set({ page: String(p) })} onSize={(s) => set({ pageSize: String(s) })} />}
      </div>
    </main>
  );
}
