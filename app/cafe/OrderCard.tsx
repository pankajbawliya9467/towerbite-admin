'use client';
import { memo, useEffect, useRef } from 'react';
import { addressLine, rupees, timeAgo } from '@/lib/format';
import type { Order, Rider } from '@/lib/types';
import styles from './board.module.css';

export type Action = 'accept' | 'reject' | 'dispatch' | 'deliver';

const TONE = { placed: '#D97706', preparing: 'var(--accent)', out_for_delivery: '#2563EB' } as Record<string, string>;

type Props = {
  order: Order;
  now: number;
  fresh: boolean;
  /** saved delivery staff, last-used first */
  riders: Rider[];
  selected: boolean;
  onSelect?: (id: string) => void;
  onAction: (order: Order, a: Action) => void;
  /** one tap send out with a saved delivery person */
  onSendWith: (order: Order, rider: Rider) => void;
};

export const OrderCard = memo(function OrderCard({ order, now, fresh, riders, selected, onSelect, onAction, onSendWith }: Props) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (fresh) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [fresh]);
  const out = order.status === 'out_for_delivery';
  const tone = TONE[order.status];
  const who = [order.customerName, order.address.company].filter(Boolean).join(' · ');
  const canSelect = !!onSelect && (order.status === 'preparing' || out);

  return (
    <article ref={ref} className={`card ${styles.card}${fresh ? ` ${styles.fresh}` : ''}${selected ? ` ${styles.selected}` : ''}`} style={{ borderTopColor: tone }}>
      <div className="row">
        <div className={styles.no}>
          {canSelect && (
            <input type="checkbox" className={styles.pick} checked={selected} onChange={() => onSelect!(order.id)} aria-label={`Select order ${order.orderNo}`} />
          )}
          #{order.orderNo}
        </div>
        {out
          ? <span className={styles.rider}>with {order.riderName}{order.riderPhone ? ` · ${order.riderPhone}` : ''}</span>
          : <span className={styles.ago} style={{ color: tone }}>{timeAgo(order.createdAt, now)}</span>}
      </div>
      {order.team && <div className={styles.team}>Team order · {order.team.people} people · {order.team.name}</div>}
      <div className={styles.addr}>{addressLine(order.address, out ? 'company' : 'desk')}</div>
      {out ? (
        <>
          <div className="row" style={{ marginTop: 12 }}>
            <span className={`badge ${styles.cod}`}>Collect {rupees(order.total)}</span>
          </div>
          <div className={styles.actions}>
            <button className="btn go" style={{ flex: 1 }} onClick={() => onAction(order, 'deliver')}>Delivered · cash taken</button>
          </div>
        </>
      ) : (
        <>
          {who && <div className={styles.who}>{who}</div>}
          <div className={styles.items}>
            {order.items.map((i) => (
              <div key={i.id}>
                <b>{i.qty}</b> {i.comboId && <span className="badge acc" style={{ fontSize: 10, padding: '1px 6px', marginRight: 4 }}>COMBO</span>}{i.name}
                {i.detail && <div className="small" style={{ marginLeft: 22 }}>{i.detail}</div>}
              </div>
            ))}
          </div>
          {order.note && <div className={styles.note}>Note: {order.note}</div>}
          <div className="row" style={{ marginTop: 12 }}>
            <span className={`badge ${styles.cod}`}>COD {rupees(order.total)}</span>
          </div>
          {order.status === 'placed' ? (
            <div className={styles.actions}>
              <button className="btn" style={{ flex: 2 }} onClick={() => onAction(order, 'accept')}>Accept</button>
              <button className="btn sec" style={{ flex: 1 }} onClick={() => onAction(order, 'reject')}>Reject</button>
            </div>
          ) : riders.length ? (
            <div className={styles.sendWith}>
              <span className={styles.sendLabel}>Send out with</span>
              <div className={styles.riderBtns}>
                {riders.slice(0, 3).map((r, i) => (
                  <button key={r.id} className={`btn ${i === 0 ? 'dark' : 'sec'}`} onClick={() => onSendWith(order, r)}>{r.name}</button>
                ))}
                <button className="btn sec" onClick={() => onAction(order, 'dispatch')} aria-label="Someone else">{riders.length > 3 ? 'More' : 'Other'}</button>
              </div>
            </div>
          ) : (
            <div className={styles.actions}>
              <button className="btn dark" style={{ flex: 1 }} onClick={() => onAction(order, 'dispatch')}>Send out</button>
            </div>
          )}
        </>
      )}
    </article>
  );
});
