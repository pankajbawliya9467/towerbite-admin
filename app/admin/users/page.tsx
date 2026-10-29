'use client';
import { addressLine, rupees, shortDate } from '@/lib/format';
import { useLoad } from '@/lib/useLoad';
import type { UserRow } from '@/lib/types';
import { PageHead } from '@/components/PageHead';

export default function UsersPage() {
  const users = useLoad<UserRow[]>('/v1/admin/users');
  return (
    <main className="page">
      <PageHead title="Users" sub={users.data ? `${users.data.length} employees have signed up (newest first).` : 'Employees who order on TowerBites.'} />
      {users.error && <div className="err">{users.error}</div>}
      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Company</th><th>Desk</th><th>Location</th><th className="num">Orders</th><th className="num">Spent</th><th>Joined</th></tr>
          </thead>
          <tbody>
            {users.data?.map((u) => (
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
        {users.data?.length === 0 && <div className="empty">No users yet.</div>}
      </div>
    </main>
  );
}
