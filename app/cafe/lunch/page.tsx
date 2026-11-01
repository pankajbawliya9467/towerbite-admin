'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { addressLine, rupees, todayIST } from '@/lib/format';
import { onCafeOrders } from '@/lib/supabase';
import { useLoad } from '@/lib/useLoad';
import type { Lunch, LunchBooking } from '@/lib/types';
import { useCafe } from '@/components/CafeContext';
import { Field } from '@/components/Field';
import { FormModal } from '@/components/FormModal';
import { Icon } from '@/components/Icon';
import { PageHead } from '@/components/PageHead';
import styles from './lunch.module.css';

const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400_000).toISOString().slice(0, 10);
const weekday = (d: string) => new Date(`${d}T00:00:00Z`).getUTCDay();
const nice = (d: string, opts: Intl.DateTimeFormatOptions) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { ...opts, timeZone: 'UTC' });

/** "13:30" → "1:30 PM" */
function time12(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
/** "12:30-13:00" → "12:30–1:00 PM" */
function slotLabel(slot: string) {
  const [a, b] = slot.split('-');
  const short = (t: string) => time12(t).replace(/ [AP]M$/, '');
  return `${short(a)}–${time12(b)}`;
}

const DEFAULT_SLOTS = ['12:30-13:00', '13:00-13:30', '13:30-14:00'];
const STATUS = {
  booked: { label: 'Booked', cls: 'warn' },
  out: { label: 'On the way', cls: 'info' },
  delivered: { label: 'Delivered', cls: 'ok' },
  cancelled: { label: 'Cancelled', cls: 'mute' },
} as const;

type FormState = { mode: 'new' | 'edit'; lunch: Partial<Lunch> };

export default function LunchPage() {
  const { cafe } = useCafe();
  const today = todayIST();
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), [today]);
  const [day, setDay] = useState(today);
  const [form, setForm] = useState<FormState | null>(null);
  const [toast, setToast] = useState('');

  const lunches = useLoad<Lunch[]>(`/v1/cafe/lunch?from=${today}&to=${days[days.length - 1]}`, 30000);
  const bookings = useLoad<LunchBooking[]>(`/v1/cafe/lunch/bookings?day=${day}`, 20000);
  const { reload: reloadLunches } = lunches;
  const { reload: reloadBookings } = bookings;
  // A new booking or cancellation shows up straight away.
  useEffect(() => onCafeOrders(cafe.id, () => (void reloadLunches(), void reloadBookings()), 'lunch'), [cafe.id, reloadLunches, reloadBookings]);

  const dayLunches = (lunches.data ?? []).filter((l) => l.day === day);
  const live = (bookings.data ?? []).filter((b) => b.status !== 'cancelled');
  const plan = useMemo(() => {
    const slots = [...new Set([...dayLunches.flatMap((l) => l.slots), ...live.map((b) => b.slot)])].sort();
    return slots.map((slot) => {
      const list = live.filter((b) => b.slot === slot);
      const mix = new Map<string, number>();
      for (const b of list) mix.set(b.lunch.name, (mix.get(b.lunch.name) ?? 0) + b.qty);
      return {
        slot,
        plates: list.reduce((s, b) => s + b.qty, 0),
        waiting: list.filter((b) => b.status === 'booked').length,
        mix: [...mix].map(([name, n]) => `${n} ${name}`).join(' · '),
      };
    });
  }, [dayLunches, live]);

  const flash = (m: string) => (setToast(m), setTimeout(() => setToast(''), 4000));
  async function run(fn: () => Promise<unknown>) {
    try {
      await fn();
    } catch (e) {
      flash((e as Error).message);
    }
    await Promise.all([reloadLunches(), reloadBookings()]);
  }

  const dayName = (d: string) => (d === today ? 'Today' : d === addDays(today, 1) ? 'Tomorrow' : nice(d, { weekday: 'short' }));

  return (
    <main className={`page ${styles.page}`}>
      <PageHead title="Lunch" sub="Post lunch for today and the coming days. Employees book plates in advance in the app.">
        <button className="btn sec sm" disabled={!live.length}
          onClick={() => run(() => api.download(`/v1/cafe/lunch/bookings.csv?day=${day}`, `${cafe.slug}-lunch-${day}.csv`))}>
          <Icon name="download" size={16} /> Booking list
        </button>
        <button className="btn sm" onClick={() => setForm({ mode: 'new', lunch: { day, slots: DEFAULT_SLOTS } })}>
          <Icon name="plus" size={16} /> Add lunch
        </button>
      </PageHead>

      <div className={styles.days} role="tablist" aria-label="Day">
        {days.map((d) => {
          const list = (lunches.data ?? []).filter((l) => l.day === d);
          const booked = list.reduce((s, l) => s + l.booked, 0);
          return (
            <button key={d} role="tab" aria-selected={d === day} className={d === day ? styles.dayOn : undefined} onClick={() => setDay(d)}>
              <b>{dayName(d)}</b>
              <span>{nice(d, { day: 'numeric', month: 'short' })}</span>
              <small>{list.length ? `${booked} booked` : 'No lunch'}</small>
            </button>
          );
        })}
      </div>

      {lunches.error && <div className="err">{lunches.error}</div>}

      <div className={styles.cols}>
        <section className={styles.main}>
          {lunches.data && !dayLunches.length && (
            <div className={`card ${styles.empty}`}>
              <b>No lunch on {dayName(day) === 'Today' || dayName(day) === 'Tomorrow' ? dayName(day).toLowerCase() : nice(day, { weekday: 'long', day: 'numeric', month: 'short' })} yet</b>
              <span>Add one and it shows on the app's home screen straight away.</span>
              <button className="btn sm" onClick={() => setForm({ mode: 'new', lunch: { day, slots: DEFAULT_SLOTS } })}>Add lunch</button>
            </div>
          )}
          {dayLunches.map((l) => {
            const sold = l.left === 0;
            const state = !l.isActive ? ['Bookings stopped', 'mute'] : sold ? ['Sold out', 'no'] : l.bookable ? ['Booking open', 'ok'] : ['Booking closed', 'mute'];
            return (
              <article key={l.id} className={`card ${styles.lunch}`}>
                <div className={styles.lunchTop}>
                  <span className={`veg${l.isVeg ? '' : ' non'}`} aria-label={l.isVeg ? 'Veg' : 'Non-veg'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={styles.lunchName}>{l.name} <span>· {rupees(l.price)}</span></div>
                    {l.items && <div className={styles.lunchItems}>{l.items}</div>}
                    <div className={styles.lunchMeta}>Book by {time12(l.closesAt)} · free cancel till {time12(l.cancelUntil)} · {l.slots.map(slotLabel).join(', ')}</div>
                  </div>
                  <span className={`badge ${state[1]}`}>{state[0]}</span>
                </div>
                <div className={styles.progress}>
                  <div className={styles.progressText}><b>{l.booked}</b> of {l.plates} plates booked</div>
                  <div className={styles.track}><div style={{ width: `${Math.min(100, (l.booked / l.plates) * 100)}%`, background: sold ? 'var(--red)' : 'var(--accent)' }} /></div>
                </div>
                <div className={styles.lunchActions}>
                  <button className="btn sec sm" onClick={() => setForm({ mode: 'edit', lunch: l })}><Icon name="edit" size={15} /> Edit</button>
                  <button className="btn sec sm" onClick={() => setForm({ mode: 'new', lunch: { ...l, day: addDays(l.day, 1) } })}>Copy to another day</button>
                  <button className="btn sec sm" onClick={() => run(() => api.patch(`/v1/cafe/lunch/${l.id}`, { isActive: !l.isActive }))}>
                    {l.isActive ? 'Stop bookings' : 'Open bookings'}
                  </button>
                  {!l.booked && (
                    <button className="btn danger sm" aria-label="Delete lunch"
                      onClick={() => confirm(`Delete ${l.name}?`) && run(() => api.del(`/v1/cafe/lunch/${l.id}`))}>
                      <Icon name="trash" size={15} />
                    </button>
                  )}
                </div>
              </article>
            );
          })}

          {live.length > 0 && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className={styles.cardHead}>Bookings · {live.length}</div>
              <table className="table">
                <thead>
                  <tr><th>Time</th><th>Who · where</th><th>Lunch</th><th className="num">Amount</th><th>Status</th><th /></tr>
                </thead>
                <tbody>
                  {(bookings.data ?? []).map((b) => (
                    <tr key={b.id} style={{ opacity: b.status === 'cancelled' ? 0.5 : 1 }}>
                      <td style={{ whiteSpace: 'nowrap' }}><b>{slotLabel(b.slot)}</b><div className="small">#{b.bookingNo}</div></td>
                      <td><b>{b.customerName || 'Employee'}</b><div className="small">{addressLine(b.address)}{b.address.company ? ` · ${b.address.company}` : ''}</div>
                        {b.note && <div className={styles.noteSm}>Note: {b.note}</div>}</td>
                      <td>{b.qty}× {b.lunch.name}</td>
                      <td className="num">{rupees(b.total)}</td>
                      <td><span className={`badge ${STATUS[b.status].cls}`}>{STATUS[b.status].label}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        {(b.status === 'booked' || b.status === 'out') && (
                          <button className="btn go sm" onClick={() => run(() => api.post(`/v1/cafe/lunch/bookings/${b.id}/deliver`))}>Delivered</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className={styles.side}>
          <div className={`card ${styles.plan}`}>
            <div className={styles.cardHead} style={{ padding: 0 }}>Kitchen plan · {dayName(day)}</div>
            {!plan.length && <div className="small" style={{ marginTop: 10 }}>No delivery times yet.</div>}
            {plan.map((p) => (
              <div key={p.slot} className={styles.slot}>
                <div>
                  <div className="small" style={{ fontWeight: 700 }}>{slotLabel(p.slot)}</div>
                  <div className={styles.slotPlates}>{p.plates} {p.plates === 1 ? "plate" : "plates"}</div>
                  {p.mix && <div className="small">{p.mix}</div>}
                </div>
                {p.waiting > 0 && (
                  <button className="btn dark sm" onClick={() => run(async () => {
                    const r = await api.post<{ updated: number }>('/v1/cafe/lunch/dispatch', { day, slot: p.slot });
                    flash(`${r.updated} bookings sent out. Employees got a notification.`);
                  })}>Send out</button>
                )}
              </div>
            ))}
          </div>
          <div className={`card ${styles.plan}`}>
            <div className={styles.cardHead} style={{ padding: 0 }}>How it works</div>
            <ol className={styles.how}>
              <li>Add the lunch with how many plates you can make.</li>
              <li>Employees book in the app until the booking time.</li>
              <li>Cook from the kitchen plan, then press <b>Send out</b> for each delivery time.</li>
            </ol>
          </div>
        </aside>
      </div>

      {form && (
        <LunchForm
          state={form}
          today={today}
          onClose={() => setForm(null)}
          onSaved={async (d) => {
            setDay(d);
            await Promise.all([reloadLunches(), reloadBookings()]);
          }}
        />
      )}
      {toast && <div className={styles.toast}>{toast}</div>}
    </main>
  );
}

function LunchForm({ state, today, onClose, onSaved }: {
  state: FormState; today: string; onClose: () => void; onSaved: (day: string) => Promise<void>;
}) {
  const l = state.lunch;
  const [v, setV] = useState({
    day: l.day && l.day >= today ? l.day : today,
    name: l.name ?? '',
    items: l.items ?? '',
    price: l.price ? String(l.price) : '',
    plates: l.plates ? String(l.plates) : '40',
    isVeg: l.isVeg ?? true,
    closesAt: l.closesAt ?? '11:30',
    cancelUntil: l.cancelUntil ?? '10:30',
    slots: l.slots ?? DEFAULT_SLOTS,
    repeat: 'none' as 'none' | 'weekdays' | 'weekly',
  });
  const [from, setFrom] = useState('14:00');
  const [to, setTo] = useState('14:30');
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }));

  const alsoOn = useMemo(() => {
    if (state.mode === 'edit' || v.repeat === 'none') return [];
    if (v.repeat === 'weekly') return [7, 14, 21].map((n) => addDays(v.day, n));
    // Mon–Fri for the next two weeks
    return Array.from({ length: 14 }, (_, i) => addDays(v.day, i + 1)).filter((d) => weekday(d) >= 1 && weekday(d) <= 5);
  }, [state.mode, v.repeat, v.day]);

  function addSlot() {
    const s = `${from}-${to}`;
    if (from >= to || v.slots.includes(s)) return;
    set({ slots: [...v.slots, s].sort() });
  }

  async function submit() {
    const body = {
      day: v.day, name: v.name, items: v.items, price: Number(v.price), plates: Number(v.plates), isVeg: v.isVeg,
      closesAt: v.closesAt, cancelUntil: v.cancelUntil, slots: v.slots, alsoOn,
    };
    if (!v.name.trim()) throw new Error('Give the lunch a name');
    if (!(body.price >= 0) || v.price === '') throw new Error('Enter the price');
    if (!(body.plates > 0)) throw new Error('Enter how many plates you can make');
    if (!v.slots.length) throw new Error('Add at least one delivery time');
    if (state.mode === 'edit') await api.put(`/v1/cafe/lunch/${l.id}`, body);
    else await api.post('/v1/cafe/lunch', body);
    await onSaved(v.day);
  }

  return (
    <FormModal wide title={state.mode === 'edit' ? 'Edit lunch' : 'Add lunch'} submitLabel={state.mode === 'edit' ? 'Save' : alsoOn.length ? `Post on ${alsoOn.length + 1} days` : 'Post lunch'}
      onClose={onClose} onSubmit={submit}>
      <Field label="Dish name">
        <input className="field" value={v.name} maxLength={60} placeholder="Veg Thali" onChange={(e) => set({ name: e.target.value })} required />
      </Field>
      <Field label="Day">
        <input className="field" type="date" min={today} value={v.day} onChange={(e) => set({ day: e.target.value })} required />
      </Field>
      <Field label="What's included" full>
        <input className="field" value={v.items} maxLength={240} placeholder="Dal makhani, Paneer masala, Jeera rice, 3 roti, Salad" onChange={(e) => set({ items: e.target.value })} />
      </Field>
      <Field label="Price per plate (₹)">
        <input className="field" inputMode="numeric" value={v.price} onChange={(e) => set({ price: e.target.value.replace(/\D/g, '') })} required />
      </Field>
      <Field label="Plates you can make">
        <input className="field" inputMode="numeric" value={v.plates} onChange={(e) => set({ plates: e.target.value.replace(/\D/g, '') })} required />
      </Field>
      <Field label="Booking closes at">
        <input className="field" type="time" value={v.closesAt} onChange={(e) => set({ closesAt: e.target.value })} required />
      </Field>
      <Field label="Free cancel till">
        <input className="field" type="time" value={v.cancelUntil} onChange={(e) => set({ cancelUntil: e.target.value })} required />
      </Field>
      <Field label="Type">
        <div className={styles.seg}>
          <button type="button" className={v.isVeg ? styles.segOn : undefined} onClick={() => set({ isVeg: true })}><span className="veg" /> Veg</button>
          <button type="button" className={!v.isVeg ? styles.segOn : undefined} onClick={() => set({ isVeg: false })}><span className="veg non" /> Non-veg</button>
        </div>
      </Field>
      {state.mode === 'new' ? (
        <Field label="Repeat">
          <select className="field" value={v.repeat} onChange={(e) => set({ repeat: e.target.value as typeof v.repeat })}>
            <option value="none">Only this day</option>
            <option value="weekdays">Every weekday (Mon–Fri), next 2 weeks</option>
            <option value="weekly">Same day every week, next 3 weeks</option>
          </select>
        </Field>
      ) : <div />}
      <Field label="Delivery times" full>
        <div className={styles.slots}>
          {v.slots.map((s) => (
            <span key={s} className={styles.slotChip}>
              {slotLabel(s)}
              <button type="button" aria-label={`Remove ${slotLabel(s)}`} onClick={() => set({ slots: v.slots.filter((x) => x !== s) })}><Icon name="x" size={14} /></button>
            </span>
          ))}
          <span className={styles.slotAdd}>
            <input className="field" type="time" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
            <span>to</span>
            <input className="field" type="time" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" />
            <button type="button" className="btn sec sm" onClick={addSlot}>Add</button>
          </span>
        </div>
      </Field>
    </FormModal>
  );
}
