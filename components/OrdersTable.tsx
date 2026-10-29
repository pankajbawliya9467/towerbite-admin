import { addressLine, rupees, STATUS, timeOfDay, shortDate } from '@/lib/format';
import type { Order } from '@/lib/types';

/** Shared order list for cafe history and admin orders. */
export function OrdersTable({ orders, showCafe, showDate }: { orders: Order[]; showCafe?: boolean; showDate?: boolean }) {
  if (!orders.length) return <div className="empty">No orders here yet.</div>;
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Order</th>
          <th>{showDate ? 'Placed' : 'Time'}</th>
          {showCafe && <th>Cafe</th>}
          <th>Customer</th>
          <th>Deliver to</th>
          <th>Items</th>
          <th className="num">Total</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o) => (
          <tr key={o.id}>
            <td style={{ fontWeight: 700 }}>#{o.orderNo}</td>
            <td style={{ whiteSpace: 'nowrap' }}>
              {timeOfDay(o.createdAt)}
              {showDate && <div className="small">{shortDate(o.createdAt)}</div>}
            </td>
            {showCafe && <td className="nowrap">{o.cafe.emoji} {o.cafe.name}<div className="small">{o.location.name}</div></td>}
            <td className="nowrap">{o.customerName || '—'}<div className="small">{o.customerPhone}</div></td>
            <td className="nowrap">{addressLine(o.address)}<div className="small">{o.address.company}</div></td>
            <td style={{ minWidth: 200 }}>{o.items.map((i) => `${i.qty} × ${i.name}`).join(', ')}</td>
            <td className="num" style={{ fontWeight: 600 }}>{rupees(o.total)}</td>
            <td className="nowrap">
              <span className={`badge ${STATUS[o.status].cls}`}>{STATUS[o.status].label}</span>
              {o.rejectReason && <div className="small" style={{ marginTop: 4 }}>{o.rejectReason}</div>}
              {o.riderName && o.status === 'delivered' && <div className="small" style={{ marginTop: 4 }}>by {o.riderName}</div>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
