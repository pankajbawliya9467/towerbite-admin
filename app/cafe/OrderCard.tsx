'use client';
import { useEffect, useRef } from 'react';
import { addressLine, rupees, timeAgo } from '@/lib/format';
import type { Order } from '@/lib/types';
import styles from './board.module.css';

export type Action = 'accept' | 'reject' | 'dispatch' | 'deliver';

const TONE = { placed: '#D97706', preparing: 'var(--accent)', out_for_delivery: '#2563EB' } as Record<string, string>;

export function OrderCard({ order, now, fresh, onAction }: {
  order: Order; now: number; fresh: boolean; onAction: (a: Action) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (fresh) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [fresh]);
  const out = order.status === 'out_for_delivery';
  const tone = TONE[order.status];
  const who = [order.customerName, order.address.company].filter(Boolean).join(' · ');

  return (
    <article ref={ref} className={`card ${styles.card}${fresh ? ` ${styles.fresh}` : ''}`} style={{ borderTopColor: tone }}>
      <div className="row">
        <div className={styles.no}>#{order.orderNo}</div>
        {out
          ? <span className={styles.rider}>with {order.riderName}</span>
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
            <button className="btn go" style={{ flex: 1 }} onClick={() => onAction('deliver')}>Delivered · cash taken</button>
          </div>
        </>
      ) : (
        <>
          {who && <div className={styles.who}>{who}</div>}
          <div className={styles.items}>
            {order.items.map((i) => <div key={i.id}><b>{i.qty}</b> {i.name}</div>)}
          </div>
          {order.note && <div className={styles.note}>Note: {order.note}</div>}
          <div className="row" style={{ marginTop: 12 }}>
            <span className={`badge ${styles.cod}`}>COD {rupees(order.total)}</span>
          </div>
          {order.status === 'placed' ? (
            <div className={styles.actions}>
              <button className="btn" style={{ flex: 2 }} onClick={() => onAction('accept')}>Accept</button>
              <button className="btn sec" style={{ flex: 1 }} onClick={() => onAction('reject')}>Reject</button>
            </div>
          ) : (
            <div className={styles.actions}>
              <button className="btn dark" style={{ flex: 1 }} onClick={() => onAction('dispatch')}>Send out</button>
            </div>
          )}
        </>
      )}
    </article>
  );
}
