'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { audioReady, chime, getSoundSettings, unlockAudio } from '@/lib/chime';
import { onCafeOrders } from '@/lib/live';
import type { Order, OrderStatus, Rider } from '@/lib/types';
import { useCafe } from '@/components/CafeContext';
import { OrderCard, type Action } from './OrderCard';
import { RejectDialog, DispatchDialog } from './OrderDialogs';
import { Icon } from '@/components/Icon';
import styles from './board.module.css';

const COLUMNS: { status: OrderStatus; title: string; badge: string; dot: string; hint: string; empty: string }[] = [
  { status: 'placed', title: 'New', badge: 'warn', dot: '#D97706', hint: 'Accept within 2 min', empty: "No new orders. You'll hear the bell when one comes in." },
  { status: 'preparing', title: 'Preparing', badge: 'acc', dot: 'var(--accent)', hint: 'Send out when ready', empty: 'Nothing is being prepared.' },
  { status: 'out_for_delivery', title: 'On the way', badge: 'info', dot: '#2563EB', hint: 'Collect the cash', empty: 'No orders out for delivery.' },
];
const FRESH_MS = 15000;
const ACTIVE: OrderStatus[] = ['placed', 'preparing', 'out_for_delivery'];
const NEXT: Record<Action, OrderStatus> = { accept: 'preparing', reject: 'rejected', dispatch: 'out_for_delivery', deliver: 'delivered' };
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
  /** Orders moved on screen but not yet confirmed by the server (a refresh mustn't jump them back). */
  const pending = useRef(new Map<string, Order>());
  const [riders, setRiders] = useState<Rider[]>([]);
  const [lastRider, setLastRider] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /** Find an order on a busy board: "#2041", a customer name or a desk. */
  const [query, setQuery] = useState('');

  const withPending = (list: Order[]) =>
    list.map((o) => pending.current.get(o.id) ?? o).filter((o) => ACTIVE.includes(o.status));

  const load = useCallback(async () => {
    const raw = await api.get<Order[]>('/v1/cafe/orders').catch(() => null);
    if (!raw) return;
    const list = withPending(raw);
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
    api.get<Rider[]>('/v1/cafe/riders').then(setRiders, () => undefined);
    try {
      setLastRider(localStorage.getItem(`tb.lastRider.${cafe.id}`));
    } catch {}
  }, [cafe.id]);

  useEffect(() => {
    waiting.current = (orders ?? []).some((o) => o.status === 'placed');
  }, [orders]);

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

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 4000);
  };

  /** Moves the cards on screen straight away; the server confirms in the background (or they move back). */
  function moveNow(list: Order[], action: Action, body: { riderName?: string }) {
    for (const o of list) {
      pending.current.set(o.id, { ...o, status: NEXT[action], ...(action === 'dispatch' ? { riderName: body.riderName ?? o.riderName } : {}) });
    }
    setOrders((cur) => cur && withPending(cur));
    setSelected((s) => new Set([...s].filter((id) => !list.some((o) => o.id === id))));
  }
  function settle(id: string, order?: Order) {
    pending.current.delete(id);
    if (order) setOrders((cur) => cur && withPending(cur.map((o) => (o.id === id ? order : o))));
  }

  async function act(order: Order, action: Action, body: { reason?: string; riderName?: string; riderId?: string } = {}) {
    setDialog(null);
    moveNow([order], action, body);
    try {
      settle(order.id, await api.post<Order>(`/v1/cafe/orders/${order.id}/${action}`, body));
    } catch (e) {
      settle(order.id);
      showToast((e as Error).message);
      void load();
    }
  }

  async function batch(action: 'dispatch' | 'deliver', rider?: Rider) {
    const list = (orders ?? []).filter((o) => selected.has(o.id));
    if (!list.length) return;
    if (rider) rememberRider(rider);
    moveNow(list, action, { riderName: rider?.name });
    try {
      const { results } = await api.post<{ results: { id: string; ok: boolean; order?: Order; error?: string }[] }>('/v1/cafe/orders/batch', {
        action, ids: list.map((o) => o.id), ...(rider ? { riderId: rider.id } : {}),
      });
      for (const r of results) settle(r.id, r.ok ? r.order : undefined);
      const failed = results.filter((r) => !r.ok);
      if (failed.length) {
        showToast(`${failed.length} not updated: ${failed[0].error}`);
        void load();
      }
    } catch (e) {
      for (const o of list) settle(o.id);
      showToast((e as Error).message);
      void load();
    }
  }

  function rememberRider(r: Rider) {
    setLastRider(r.id);
    try {
      localStorage.setItem(`tb.lastRider.${cafe.id}`, r.id);
    } catch {}
  }

  // Last-used delivery person first.
  const ridersOrdered = useMemo(
    () => [...riders].sort((a, b) => Number(b.id === lastRider) - Number(a.id === lastRider)),
    [riders, lastRider],
  );
  const pastNames = [...new Set((orders ?? []).map((o) => o.riderName).filter((r): r is string => !!r))];
  const dialogNames = [...new Set([...riders.map((r) => r.name), ...pastNames])];

  const onAction = useCallback((o: Order, action: Action) => {
    if (action === 'reject' || action === 'dispatch') setDialog({ order: o, kind: action });
    else void actRef.current(o, action);
  }, []);
  const onSendWith = useCallback((o: Order, r: Rider) => {
    rememberRiderRef.current(r);
    void actRef.current(o, 'dispatch', { riderId: r.id, riderName: r.name });
  }, []);
  const onSelect = useCallback((id: string) => {
    setSelected((s) => {
      const order = ordersRef.current?.find((o) => o.id === id);
      const sameCol = [...s].filter((x) => ordersRef.current?.find((o) => o.id === x)?.status === order?.status);
      const next = new Set(sameCol);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const actRef = useRef(act);
  actRef.current = act;
  const rememberRiderRef = useRef(rememberRider);
  rememberRiderRef.current = rememberRider;
  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  const picked = (orders ?? []).filter((o) => selected.has(o.id));
  const q = query.trim().toLowerCase().replace(/^#/, '');
  const matches = (o: Order) => !q || String(o.orderNo).includes(q) || o.customerName.toLowerCase().includes(q)
    || `${o.address.tower} ${o.address.floor} ${o.address.desk} ${o.address.company}`.toLowerCase().includes(q);
  const countOf = (s: OrderStatus) => (orders ?? []).filter((o) => o.status === s).length;
  const pickedStatus = picked[0]?.status;

  return (
    <main className={styles.wrap}>
      <div className={styles.head}>
        <div className={styles.title}>
          <h1>Live orders</h1>
          <span className={styles.live}><i />Live</span>
          <div className={styles.summary}>
            {COLUMNS.map((col) => (
              <span key={col.status}><i className={styles.dot} style={{ background: col.dot }} />{col.title} <b>{countOf(col.status)}</b></span>
            ))}
          </div>
        </div>
        <label className={styles.find}>
          <Icon name="search" />
          <input type="search" placeholder="Order #, name or desk" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Find an order" />
        </label>
      </div>
      <div className={styles.board}>
      <div className={styles.switcher} role="tablist">
        {COLUMNS.map((col) => (
          <button key={col.status} role="tab" aria-selected={mobileCol === col.status}
            className={mobileCol === col.status ? styles.switchOn : undefined} onClick={() => setMobileCol(col.status)}>
            {col.title} <span className={`badge ${col.badge}`}>{(orders ?? []).filter((o) => o.status === col.status).length}</span>
          </button>
        ))}
      </div>
      {COLUMNS.map((col) => {
        const all = (orders ?? []).filter((o) => o.status === col.status);
        const list = all.filter(matches);
        return (
          <section key={col.status} className={`${styles.col} ${mobileCol === col.status ? '' : styles.mobileHidden}`}>
            <div className={styles.colHead}>
              <span className={styles.dot} style={{ background: col.dot }} />
              <h2>{col.title}</h2>
              <span className={styles.hint}>{col.hint}</span>
              <span className={styles.count}>{all.length}</span>
            </div>
            {list.map((o) => (
              <OrderCard key={o.id} order={o} now={now} fresh={fresh.has(o.id)} riders={ridersOrdered}
                selected={selected.has(o.id)} onSelect={onSelect} onAction={onAction} onSendWith={onSendWith} />
            ))}
            {col.status === 'preparing' && !riders.length && list.length > 0 && (
              <Link href="/cafe/riders" className="link" style={{ display: 'block', textAlign: 'center', marginTop: 12 }}>
                Save your delivery staff for one-tap “Send out”
              </Link>
            )}
            {orders && !list.length && <div className={styles.empty}>{all.length ? 'No order matches your search.' : col.empty}</div>}
          </section>
        );
      })}
      </div>
      {dialog?.kind === 'reject' && (
        <RejectDialog order={dialog.order} onClose={() => setDialog(null)} onConfirm={(reason) => act(dialog.order, 'reject', { reason })} />
      )}
      {dialog?.kind === 'dispatch' && (
        <DispatchDialog order={dialog.order} riders={dialogNames} onClose={() => setDialog(null)}
          onConfirm={(riderName) => {
            const saved = riders.find((r) => r.name.toLowerCase() === riderName.toLowerCase());
            if (saved) rememberRider(saved);
            return act(dialog.order, 'dispatch', saved ? { riderId: saved.id, riderName: saved.name } : { riderName });
          }} />
      )}
      {picked.length > 0 && (
        <div className={styles.batchBar} role="toolbar" aria-label="Selected orders">
          <b>{picked.length} selected</b>
          {pickedStatus === 'preparing' && (
            ridersOrdered.length ? (
              <>
                <span style={{ fontSize: 14, color: '#D6D3CD' }}>Send out with</span>
                {ridersOrdered.slice(0, 4).map((r) => (
                  <button key={r.id} className="btn" onClick={() => batch('dispatch', r)}>{r.name}</button>
                ))}
              </>
            ) : (
              <Link href="/cafe/riders" className="btn">Add delivery staff to send together</Link>
            )
          )}
          {pickedStatus === 'out_for_delivery' && (
            <button className="btn go" onClick={() => batch('deliver')}>Mark {picked.length} delivered · cash taken</button>
          )}
          <button className={styles.clear} onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}
      {toast && <div className={styles.toast}>{toast}</div>}
      {!soundOn && <button className={styles.soundPrompt}>🔔 Tap anywhere to turn on the new-order sound</button>}
    </main>
  );
}
