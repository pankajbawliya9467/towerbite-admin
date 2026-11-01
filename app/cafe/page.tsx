'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { audioReady, chime, getSoundSettings, unlockAudio } from '@/lib/chime';
import { onCafeOrders } from '@/lib/supabase';
import type { Order, OrderStatus } from '@/lib/types';
import { useCafe } from '@/components/CafeContext';
import { OrderCard, type Action } from './OrderCard';
import { RejectDialog, DispatchDialog } from './OrderDialogs';
import styles from './board.module.css';

const COLUMNS: { status: OrderStatus; title: string; badge: string; dot: string }[] = [
  { status: 'placed', title: 'New', badge: 'warn', dot: '#D97706' },
  { status: 'preparing', title: 'Preparing', badge: 'acc', dot: 'var(--accent)' },
  { status: 'out_for_delivery', title: 'On the way', badge: 'info', dot: '#2563EB' },
];
const FRESH_MS = 15000;
/** Like delivery-app tablets: keep ringing while a new order is waiting to be accepted. */
const REMIND_MS = 30000;

export default function BoardPage() {
  const { cafe } = useCafe();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => Date.now());
  const [dialog, setDialog] = useState<{ order: Order; kind: 'reject' | 'dispatch' } | null>(null);
  const [toast, setToast] = useState('');
  const [soundOn, setSoundOn] = useState(false);
  /** On phones only one column fits: this picks which one. */
  const [mobileCol, setMobileCol] = useState<OrderStatus>('placed');
  const seen = useRef<Set<string> | null>(null);
  const waiting = useRef(false);

  const load = useCallback(async () => {
    const list = await api.get<Order[]>('/v1/cafe/orders').catch(() => null);
    if (!list) return;
    const newIds = list.filter((o) => o.status === 'placed' && seen.current && !seen.current.has(o.id)).map((o) => o.id);
    seen.current = new Set(list.map((o) => o.id));
    waiting.current = list.some((o) => o.status === 'placed');
    setOrders(list);
    if (newIds.length) {
      chime();
      setMobileCol('placed');
      setFresh((s) => new Set([...s, ...newIds]));
      setTimeout(() => setFresh((s) => new Set([...s].filter((id) => !newIds.includes(id)))), FRESH_MS);
    }
  }, []);

  useEffect(() => {
    void load();
    const poll = setInterval(load, 10000);
    const tick = setInterval(() => setNow(Date.now()), 20000);
    const remind = setInterval(() => waiting.current && getSoundSettings().repeat && chime(), REMIND_MS);
    const off = onCafeOrders(cafe.id, load);
    const unlock = () => void unlockAudio().then(() => setSoundOn(audioReady()));
    window.addEventListener('pointerdown', unlock);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
      clearInterval(remind);
      off();
      window.removeEventListener('pointerdown', unlock);
    };
  }, [cafe.id, load]);

  async function act(order: Order, action: Action, body: Record<string, string> = {}) {
    try {
      await api.post(`/v1/cafe/orders/${order.id}/${action}`, body);
      setDialog(null);
    } catch (e) {
      setToast((e as Error).message);
      setTimeout(() => setToast(''), 4000);
    }
    await load();
  }

  const riders = [...new Set((orders ?? []).map((o) => o.riderName).filter((r): r is string => !!r))];

  return (
    <main className={styles.board}>
      <div className={styles.switcher} role="tablist">
        {COLUMNS.map((col) => (
          <button key={col.status} role="tab" aria-selected={mobileCol === col.status}
            className={mobileCol === col.status ? styles.switchOn : undefined} onClick={() => setMobileCol(col.status)}>
            {col.title} <span className={`badge ${col.badge}`}>{(orders ?? []).filter((o) => o.status === col.status).length}</span>
          </button>
        ))}
      </div>
      {COLUMNS.map((col) => {
        const list = (orders ?? []).filter((o) => o.status === col.status);
        return (
          <section key={col.status} className={`${styles.col} ${mobileCol === col.status ? '' : styles.mobileHidden}`}>
            <div className="row">
              <div className="h2"><span className={styles.dot} style={{ background: col.dot }} />{col.title}</div>
              <span className={`badge ${col.badge} ${styles.count}`}>{list.length}</span>
            </div>
            {list.map((o) => (
              <OrderCard key={o.id} order={o} now={now} fresh={fresh.has(o.id)}
                onAction={(action) => (action === 'reject' || action === 'dispatch' ? setDialog({ order: o, kind: action }) : act(o, action))} />
            ))}
            {orders && !list.length && <div className={styles.empty}>No orders</div>}
          </section>
        );
      })}
      {dialog?.kind === 'reject' && (
        <RejectDialog order={dialog.order} onClose={() => setDialog(null)} onConfirm={(reason) => act(dialog.order, 'reject', { reason })} />
      )}
      {dialog?.kind === 'dispatch' && (
        <DispatchDialog order={dialog.order} riders={riders} onClose={() => setDialog(null)}
          onConfirm={(riderName) => act(dialog.order, 'dispatch', { riderName })} />
      )}
      {toast && <div className={styles.toast}>{toast}</div>}
      {!soundOn && <button className={styles.soundPrompt}>🔔 Tap anywhere to turn on the new-order sound</button>}
    </main>
  );
}
