'use client';
import { memo, useEffect, useRef } from 'react';
import { addressLine, rupees, timeAgo } from '@/lib/format';
import type { Order, Rider } from '@/lib/types';
import styles from './board.module.css';

export type Action = 'accept' | 'reject' | 'dispatch' | 'deliver';

/** A new order waiting longer than this is flagged (it should be accepted quickly). */
const LATE_NEW_MIN = 5;
/** Being prepared longer than this is flagged too. */
const LATE_PREP_MIN = 20;

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

/**
 * A team order's note is written by the API: a summary line, then one line per person ("Name: 1× Item, …").
 * Shown as a packing list instead of a customer note (the summary is already on the card).
 */
function teamLines(order: Order) {
  if (!order.team || !order.note) return null;
  const lines = order.note.split('\n');
  if (!lines[0].startsWith('Team order')) return null;
  return lines.slice(1).filter(Boolean).map((l) => {
    const at = l.indexOf(': ');
    return at > 0 ? { name: l.slice(0, at), items: l.slice(at + 2) } : { name: '', items: l };
  });
}

export const OrderCard = memo(function OrderCard({ order, now, fresh, riders, selected, onSelect, onAction, onSendWith }: Props) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (fresh) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [fresh]);
  const placed = order.status === 'placed';
  const out = order.status === 'out_for_delivery';
  const since = order.status === 'preparing' ? order.acceptedAt ?? order.createdAt : order.createdAt;
  const minutes = (now - new Date(since).getTime()) / 60000;
  const late = (placed && minutes >= LATE_NEW_MIN) || (order.status === 'preparing' && minutes >= LATE_PREP_MIN);
  const who = [order.customerName, order.address.company].filter(Boolean).join(' · ');
  const canSelect = !!onSelect && (order.status === 'preparing' || out);
  const pack = teamLines(order);
  const cls = [styles.card, fresh && styles.fresh, selected && styles.selected, late && styles.late].filter(Boolean).join(' ');

  return (
    <article ref={ref} className={cls} aria-label={`Order ${order.orderNo}`}>
      <div className={styles.top}>
        <div className={styles.no}>
          {canSelect && (
            <input type="checkbox" className={styles.pick} checked={selected} onChange={() => onSelect!(order.id)} aria-label={`Select order ${order.orderNo}`} />
          )}
          #{order.orderNo}
        </div>
        {out
          ? <span className={`${styles.pill} ${styles.pillBlue}`}>with {order.riderName}{order.riderPhone ? ` · ${order.riderPhone}` : ''}</span>
          : <span className={`${styles.pill} ${late ? styles.pillRed : placed ? styles.pillAmber : styles.pillOrange}`}>{timeAgo(since, now)}</span>}
      </div>

      {order.team && <div className={styles.team}>Team order · {order.team.people} people · {order.team.name}</div>}
      <div>
        <div className={styles.addr}>{addressLine(order.address, out ? 'company' : 'desk')}</div>
        {!out && who && <div className={styles.who}>{who}</div>}
      </div>

      {!out && (
        <div className={`${styles.items}${placed ? ` ${styles.itemsNew}` : ''}`}>
          {order.items.map((i) => (
            <div key={i.id} className={styles.line}>
              <span className={styles.qty}>{i.qty}</span>
              <span style={{ minWidth: 0 }}>
                {i.comboId && <span className={styles.combo}>COMBO</span>}
                <span className={styles.itemName}>{i.name}</span>
                {i.detail && <span className={styles.detail}>{i.detail}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
      {!out && pack && pack.length > 0 && (
        <div className={styles.pack}>
          <span className={styles.sendLabel}>Pack per person</span>
          {pack.map((p, i) => (
            <div key={i} className={styles.packRow}><b>{p.name}</b><span>{p.items}</span></div>
          ))}
        </div>
      )}
      {!out && order.note && !pack && <div className={styles.note}>Note: {order.note}</div>}

      {out ? (
        <>
          <div className={styles.collect}><span>Collect cash</span><b>{rupees(order.total)}</b></div>
          <button className={`btn go ${styles.big}`} onClick={() => onAction(order, 'deliver')}>Delivered · cash taken</button>
        </>
      ) : (
        <>
          <div><span className={styles.cod}>COD {rupees(order.total)}</span></div>
          {placed ? (
            <div className={styles.actions}>
              <button className={`btn ${styles.big}`} style={{ flex: 2 }} onClick={() => onAction(order, 'accept')}>Accept</button>
              <button className={`btn sec ${styles.big}`} style={{ flex: 1 }} onClick={() => onAction(order, 'reject')}>Reject</button>
            </div>
          ) : riders.length ? (
            <div className={styles.sendWith}>
              <span className={styles.sendLabel}>Send out with</span>
              <div className={styles.riderBtns}>
                {riders.slice(0, 3).map((r) => (
                  <button key={r.id} className="btn dark" onClick={() => onSendWith(order, r)}>{r.name}</button>
                ))}
                <button className="btn sec" onClick={() => onAction(order, 'dispatch')} aria-label="Someone else">{riders.length > 3 ? 'More' : '+'}</button>
              </div>
            </div>
          ) : (
            <button className={`btn dark ${styles.big}`} onClick={() => onAction(order, 'dispatch')}>Send out</button>
          )}
        </>
      )}
    </article>
  );
});
