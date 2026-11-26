'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useLoad } from '@/lib/useLoad';
import type { Cafe, Location } from '@/lib/types';
import { Field } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { useCan } from '@/components/useCan';
import { PageHead } from '@/components/PageHead';
import { Modal } from '@/components/Modal';
import { useSession } from '@/components/Session';
import Link from 'next/link';
import { toQuery, useFilters } from '@/lib/useFilters';
import { Chips, DateRange, Empty, Pager, SearchBox, rangeLabel, type Paged } from '@/components/ListTools';

type AudienceType = 'all' | 'location' | 'company' | 'cafe' | 'user';
type Sent = {
  id: string; title: string; body: string; audienceLabel: string; users: number; devices: number; createdAt: string; sentBy?: string;
  skipped?: number; source?: 'manual' | 'ai'; angle?: string | null; taps?: number; orders?: number; sales?: number;
};
type Reach = { users: number; devices: number; label: string; skipped?: number; quiet?: boolean; lastSent?: { title: string; mins: number } | null };
type Target = { type: 'item' | 'combo' | 'lunch' | 'cafe' | 'none'; id: string };
type Idea = { angle: string; title: string; body: string; target: Target; ok: boolean; checks: { ok: boolean; label: string }[]; opens: string | null };
type Seen = { place: string; time: string; weather: string; openCafes: number; closedCafes: number; topToday: string[]; combos: number; lunches: string[] };
type AiStatus = { configured: boolean };
const ANGLE: Record<string, string> = { weather: 'Weather', time: 'Time', activity: 'Activity', special: 'Special' };
const ago = (m: number) => (m < 60 ? `${m} min` : `${Math.round(m / 60)} h`);

const TYPES: { key: AudienceType; label: string }[] = [
  { key: 'all', label: 'Everyone' },
  { key: 'location', label: 'One building' },
  { key: 'company', label: 'One company' },
  { key: 'cafe', label: "A cafe's customers" },
  { key: 'user', label: 'One person' },
];

/** Owner-only: send a custom push notification to the app users you pick. */
export default function NotificationsPage() {
  const canSend = useCan()('notifications.send');
  const locations = useLoad<Location[]>('/v1/admin/locations');
  const cafes = useLoad<Cafe[]>('/v1/admin/cafes');
  const hf = useFilters({ search: '', from: '', to: '', locationId: '', sentBy: '', source: '', orders: '', page: '1', pageSize: '25' });
  const history = useLoad<Paged<Sent> & { best: string | null; angles: Record<string, { users: number; taps: number }>; senders: { id: string; name: string }[] }>(
    hf.ready ? `/v1/admin/notifications${toQuery(hf.f)}` : null, undefined, true);
  const [type, setType] = useState<AudienceType>('location');
  const [locationId, setLocationId] = useState('');
  const [company, setCompany] = useState('');
  const [cafeId, setCafeId] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [reach, setReach] = useState<Reach | null>(null);
  const { state } = useSession();
  const isSuper = state.status === 'ready' && !!state.me.staff?.isSuper;
  const ai = useLoad<AiStatus>(canSend ? '/v1/admin/settings/ai' : null);
  const [note, setNote] = useState('');
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [seen, setSeen] = useState<Seen | null>(null);
  const [showSeen, setShowSeen] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [genBusy, setGenBusy] = useState(false);
  const [genErr, setGenErr] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [reachErr, setReachErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!locationId && locations.data?.[0]) setLocationId(locations.data[0].id);
    if (!cafeId && cafes.data?.[0]) setCafeId(cafes.data[0].id);
  }, [locations.data, cafes.data, locationId, cafeId]);

  const audience =
    type === 'all' ? { type }
    : type === 'location' ? (locationId ? { type, locationId } : null)
    : type === 'company' ? (company.trim().length >= 2 ? { type, company: company.trim(), ...(locationId ? { locationId } : {}) } : null)
    : type === 'cafe' ? (cafeId ? { type, cafeId } : null)
    : phone.replace(/\D/g, '').length >= 10 ? { type, phone } : null;
  const key = JSON.stringify(audience);

  // Live "who gets it" count while the audience is being picked.
  useEffect(() => {
    setReach(null);
    setReachErr('');
    if (!audience || !canSend) return;
    const t = setTimeout(() => {
      api.post<Reach>('/v1/admin/notifications/preview', { audience }).then(setReach, (e) => setReachErr(e.message));
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const idea = picked !== null && ideas ? ideas[picked] : null;

  // A small tip from this week's results (from the server): which kind of AI idea people tap most.
  const tip = (() => {
    const ranked = Object.entries(history.data?.angles ?? {}).filter(([, v]) => v.users >= 20)
      .map(([k, v]) => [k, v.taps / v.users] as const).sort((a, b) => b[1] - a[1]);
    if (ranked.length < 2 || ranked[0][1] === 0) return null;
    const name = (k: string) => ANGLE[k] ?? k;
    return `This week ${name(ranked[0][0])} ideas got the most taps (${Math.round(ranked[0][1] * 100)}% vs ${Math.round(ranked[ranked.length - 1][1] * 100)}% for ${name(ranked[ranked.length - 1][0])}).`;
  })();

  async function generate() {
    if (!audience) return;
    setGenBusy(true);
    setGenErr('');
    try {
      const r = await api.post<{ ideas: Idea[]; seen: Seen }>('/v1/admin/notifications/generate', { audience, note });
      setIdeas(r.ideas);
      setSeen(r.seen);
      const first = r.ideas.findIndex((i) => i.ok);
      pick(r.ideas, first >= 0 ? first : null);
    } catch (e) {
      setGenErr((e as Error).message);
    } finally {
      setGenBusy(false);
    }
  }
  function pick(list: Idea[], i: number | null) {
    setPicked(i);
    if (i !== null) {
      setTitle(list[i].title);
      setBody(list[i].body);
    }
  }

  async function send() {
    if (!audience || !reach) return;
    setConfirming(false);
    setBusy(true);
    setMsg(null);
    try {
      const fromAi = !!idea && idea.ok;
      const r = await api.post<Sent>('/v1/admin/notifications', {
        title, body, audience,
        // The tap still opens the picked item; if the text was changed by hand it counts as a manual message.
        ...(fromAi ? { target: idea!.target, angle: idea!.angle, source: idea!.title === title && idea!.body === body ? 'ai' : 'manual' } : {}),
      });
      setMsg({ ok: true, text: `Sent to ${r.users} ${r.users === 1 ? 'person' : 'people'} (${r.devices} phones)${r.skipped ? ` · ${r.skipped} skipped (already got a promo today)` : ''}.` });
      setTitle('');
      setBody('');
      setIdeas(null);
      setPicked(null);
      await history.reload();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const ready = !!audience && !!reach && reach.users > 0 && !reach.quiet && title.trim().length >= 2 && body.trim().length >= 2
    && (!idea || idea.ok);
  const best = history.data?.best ?? null;
  const { f: nf, set: nset, clear: nclear } = hf;
  const nloc = locations.data?.find((l) => l.id === nf.locationId);
  const nby = history.data?.senders.find((x) => x.id === nf.sentBy);
  const nchips = [
    nf.search && { label: `"${nf.search}"`, clear: () => nset({ search: '' }) },
    (nf.from || nf.to) && { label: rangeLabel(nf.from, nf.to), clear: () => nset({ from: '', to: '' }) },
    nloc && { label: nloc.name, clear: () => nset({ locationId: '' }) },
    nby && { label: `By ${nby.name}`, clear: () => nset({ sentBy: '' }) },
    nf.source && { label: nf.source === 'ai' ? '✨ AI' : 'Manual', clear: () => nset({ source: '' }) },
    nf.orders && { label: 'Got orders', clear: () => nset({ orders: '' }) },
  ].filter(Boolean) as { label: string; clear: () => void }[];
  const { page: _p, pageSize: _s, ...nfilters } = nf;

  return (
    <main className="page">
      <PageHead title="Notifications" sub="Send your own message to app users: offers, new cafes, festival wishes, service updates." />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        {!canSend ? (
          <section className="card" style={{ flex: '999 1 460px', minWidth: 0, padding: 22 }}>
            <div className="h2">Sent notifications</div>
            <div className="small" style={{ marginTop: 6 }}>You can see what was sent. Sending needs the &quot;Send&quot; tick from a super admin.</div>
          </section>
        ) : (
        <section className="card" style={{ flex: '999 1 460px', minWidth: 0, padding: 22 }}>
          <span className="label">Who gets it</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="radiogroup" aria-label="Who gets it">
            {TYPES.map((t) => (
              <button key={t.key} role="radio" aria-checked={type === t.key} className={`pill${type === t.key ? ' on' : ''}`} onClick={() => setType(t.key)}>{t.label}</button>
            ))}
          </div>
          <div className="form" style={{ marginTop: 16 }}>
            {(type === 'location' || type === 'company') && (
              <Field label={type === 'company' ? 'Building (optional filter)' : 'Building'}>
                <select className="field" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                  {type === 'company' && <option value="">All buildings</option>}
                  {locations.data?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </Field>
            )}
            {type === 'company' && (
              <Field label="Company name (as people typed it)">
                <input className="field" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="SolutionBowl" maxLength={80} />
              </Field>
            )}
            {type === 'cafe' && (
              <Field label="People who ordered from (last 90 days)">
                <select className="field" value={cafeId} onChange={(e) => setCafeId(e.target.value)}>
                  {cafes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            )}
            {type === 'user' && (
              <Field label="Mobile number">
                <input className="field" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" maxLength={16} />
              </Field>
            )}
            <div className="full ai-box">
              <div className="ai-row">
                <input className="field" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200}
                  placeholder="Kuch khas? (optional) e.g. Diwali offer, new cafe opened" aria-label="Optional theme for the AI" />
                <button type="button" className="btn ai-btn" disabled={!audience || genBusy || !ai.data?.configured} onClick={generate}>
                  ✨ {genBusy ? 'Thinking…' : ideas ? 'Generate again' : 'Generate ideas'}
                </button>
              </div>
              {ai.data && !ai.data.configured && (
                <div className="small" style={{ marginTop: 8 }}>
                  AI ideas need an OpenAI key. {isSuper ? <Link href="/admin/ai" className="link">Add it in AI settings</Link> : 'Ask a super admin to add it.'}
                </div>
              )}
              {genErr && <div className="err" style={{ marginTop: 8 }}>{genErr}</div>}
              {seen && (
                <button type="button" className="link" style={{ marginTop: 8, fontSize: 12.5 }} onClick={() => setShowSeen(!showSeen)}>
                  {showSeen ? 'Hide what the AI looked at' : 'AI ne kya dekha ›'}
                </button>
              )}
              {seen && showSeen && (
                <div className="ai-seen">
                  <span><b>{seen.weather}</b>Weather · {seen.place}</span>
                  <span><b>{seen.time}</b>Time</span>
                  <span><b>{seen.openCafes} cafes open</b>{seen.closedCafes ? `${seen.closedCafes} closed` : 'all open'}</span>
                  {seen.topToday.length > 0 && <span><b>{seen.topToday.join(', ')}</b>Ordered most today</span>}
                  <span><b>{seen.combos} combos live</b>Right now</span>
                  {seen.lunches.length > 0 && <span><b>{seen.lunches.join(', ')}</b>Lunch today</span>}
                </div>
              )}
              {ideas && (
                <div role="radiogroup" aria-label="AI ideas" style={{ marginTop: 6 }}>
                  {ideas.length === 0 && <div className="small" style={{ marginTop: 8 }}>No ideas this time. Try again.</div>}
                  {ideas.map((it, i) => (
                    <button key={i} type="button" role="radio" aria-checked={picked === i} disabled={!it.ok}
                      className={`ai-idea${picked === i ? ' on' : ''}${it.ok ? '' : ' bad'}`} onClick={() => pick(ideas, i)}>
                      <span className="ai-radio" aria-hidden />
                      <span style={{ minWidth: 0, textAlign: 'left' }}>
                        <b>{it.title}</b><span className="ai-tag">{ANGLE[it.angle] ?? it.angle}</span>
                        <span className="ai-body">{it.body}</span>
                        <span className="ai-checks">
                          {it.checks.map((c, j) => <span key={j} className={c.ok ? 'g' : 'r'}>{c.ok ? '✓' : '✗'} {c.label}</span>)}
                          {!it.ok && <span>Can&apos;t be sent</span>}
                        </span>
                        {it.ok && it.opens && <span className="ai-opens">Tap opens: {it.opens}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Field label={`Title · ${title.length}/60`} full>
              <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Diwali offer at Krunchy Kafe" />
            </Field>
            <Field label={`Message · ${body.length}/180`} full>
              <textarea className="field" value={body} onChange={(e) => setBody(e.target.value)} maxLength={180} rows={3} placeholder="Free gulab jamun with every order today. Order from your desk!" />
            </Field>
          </div>
          {reach?.quiet && <div className="ai-warn">Quiet hours (9 PM – 9 AM): promos wait till morning so nobody is woken up.</div>}
          {reach?.lastSent && !reach.quiet && (
            <div className="ai-warn">&quot;{reach.lastSent.title}&quot; went to these people {ago(reach.lastSent.mins)} ago.
              {reach.skipped ? ` ${reach.skipped} who already got a promo today will be skipped.` : ''}</div>
          )}
          <div className="row" style={{ marginTop: 18, gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: reachErr ? 'var(--red)' : 'var(--sub)' }}>
              {reachErr || (!audience ? 'Pick who gets it' : !reach ? 'Counting…' : reach.users
                ? `Reaches ${reach.users} ${reach.users === 1 ? 'person' : 'people'} · ${reach.devices} phones${reach.skipped ? ` (${reach.skipped} skipped: already got a promo today)` : ''}`
                : reach.skipped ? 'Everyone here already got a promo today' : 'Nobody here has the app with notifications on yet')}
            </span>
            <button className="btn" style={{ width: 'auto', padding: '0 22px' }} disabled={!ready || busy} onClick={() => setConfirming(true)}>
              <Icon name="send" size={16} /> {busy ? 'Sending…' : 'Send now'}
            </button>
          </div>
          {msg && <div className={msg.ok ? 'badge ok' : 'err'} style={{ marginTop: 14, padding: msg.ok ? '8px 12px' : undefined }}>{msg.text}</div>}
          {confirming && reach && (
            <Modal title="Send this notification?" onClose={() => setConfirming(false)}>
              <div className="ai-confirm">
                <span className="ai-confirm-ic"><Icon name="coffee" size={18} /></span>
                <span style={{ minWidth: 0 }}><b>{title}</b><span>{body}</span></span>
              </div>
              <div className="stack" style={{ gap: 6, marginTop: 14, fontSize: 14 }}>
                <span>To <b>{reach.label}</b>: <b>{reach.users}</b> {reach.users === 1 ? 'person' : 'people'} ({reach.devices} phones)</span>
                {reach.skipped ? <span className="small">{reach.skipped} skipped: they already got a promo today.</span> : null}
                {idea?.ok && idea.opens && <span className="small">Tapping it opens: {idea.opens}</span>}
                <span className="small" style={{ color: 'var(--red)' }}>It goes out right away and can&apos;t be taken back.</span>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn sec" style={{ flex: 1 }} onClick={() => setConfirming(false)}>Cancel</button>
                <button type="button" className="btn" style={{ flex: 2 }} onClick={send} autoFocus>Yes, send now</button>
              </div>
            </Modal>
          )}
        </section>
        )}

        <aside style={{ flex: '1 1 300px', minWidth: 0 }}>
          <span className="label">How it looks on the phone</span>
          <div style={{ background: '#1A1A1A', borderRadius: 28, padding: '18px 12px 28px' }}>
            <div style={{ background: 'rgba(255,255,255,.92)', borderRadius: 16, padding: 12, display: 'flex', gap: 10 }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name="coffee" size={18} /></span>
              <span style={{ minWidth: 0 }}>
                <span style={{ fontSize: 12, color: 'var(--sub)', fontWeight: 600 }}>TowerBites · now</span>
                <b style={{ display: 'block', fontSize: 14 }}>{title || 'Your title'}</b>
                <span style={{ display: 'block', fontSize: 13, color: '#333', wordBreak: 'break-word' }}>{body || 'Your message shows here.'}</span>
              </span>
            </div>
          </div>
          <p className="small" style={{ marginTop: 10 }}>Only people who logged in on the app and allowed notifications get it. Up to 20 sends an hour.</p>
        </aside>
      </div>

      <div className="card" style={{ marginTop: 20, overflow: 'hidden' }}>
        <div className="row" style={{ padding: '16px 18px 8px', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <span className="h2">Sent</span>
          <button className="btn sec sm" onClick={() => api.download(`/v1/admin/notifications.csv${toQuery(nfilters)}`, 'towerbites_notifications.csv').catch((e: Error) => alert(e.message))}>
            <Icon name="download" /> Download CSV
          </button>
        </div>
        <div style={{ padding: '0 18px' }}>
          <div className="lt-bar">
            <SearchBox value={nf.search} onChange={(search) => nset({ search })} placeholder="Search title or message" width={240} />
            <DateRange from={nf.from} to={nf.to} onChange={(from, to) => nset({ from, to })} />
            <select className="field lt-sel" value={nf.locationId} aria-label="Building" onChange={(e) => nset({ locationId: e.target.value })}>
              <option value="">All buildings</option>
              {locations.data?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <select className="field lt-sel" value={nf.sentBy} aria-label="Sent by" onChange={(e) => nset({ sentBy: e.target.value })}>
              <option value="">Sent by anyone</option>
              {history.data?.senders.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
            <span className="wrap" role="radiogroup" aria-label="Kind">
              {[['', 'All'], ['ai', '✨ AI'], ['manual', 'Manual']].map(([k, l]) => (
                <button key={k || 'all'} role="radio" aria-checked={nf.source === k} className={`pill${nf.source === k ? ' on' : ''}`} onClick={() => nset({ source: k })}>{l}</button>
              ))}
              <button role="checkbox" aria-checked={nf.orders === 'yes'} className={`pill${nf.orders === 'yes' ? ' on' : ''}`} onClick={() => nset({ orders: nf.orders ? '' : 'yes' })}>Got orders</button>
            </span>
          </div>
          <Chips items={nchips} onClear={() => nclear(['pageSize'])} />
        </div>
        {tip && <div className="ai-tip">💡 {tip}</div>}
        <div className="table-scroll">
        <table className="table">
          <thead><tr><th>When</th><th>Message</th><th>To</th><th className="num">People</th><th>Tapped</th><th className="num">Orders (2h)</th></tr></thead>
          <tbody>
            {history.data?.rows.map((n) => (
              <tr key={n.id}>
                <td style={{ whiteSpace: 'nowrap', color: 'var(--sub)' }}>{new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</td>
                <td>
                  <b>{n.title}</b>{n.id === best && <span className="badge ok" style={{ marginLeft: 6 }}>Best this week</span>}
                  <div className="small">{n.body}</div>
                  {n.source === 'ai' && <div className="small" style={{ color: 'var(--accentDark)', fontWeight: 700 }}>✨ AI{n.angle ? ` · ${ANGLE[n.angle] ?? n.angle}` : ''}</div>}
                </td>
                <td>{n.audienceLabel}{n.sentBy ? <div className="small">by {n.sentBy}</div> : null}{n.skipped ? <div className="small">{n.skipped} skipped</div> : null}</td>
                <td className="num">{n.users}</td>
                <td className="nowrap">
                  {n.users ? `${Math.round(((n.taps ?? 0) / n.users) * 100)}%` : '–'}
                  <div className="ai-bar"><i style={{ width: `${n.users ? Math.min(100, Math.round(((n.taps ?? 0) / n.users) * 400)) : 0}%` }} /></div>
                </td>
                <td className="num">{n.orders ?? 0}{n.sales ? <div className="small">₹{n.sales.toLocaleString('en-IN')}</div> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {history.data?.rows.length === 0 && <Empty>{nchips.length ? 'Nothing matches these filters.' : 'Nothing sent yet.'}</Empty>}
        {history.data && <Pager page={history.data.page} pageSize={history.data.pageSize} total={history.data.total} onPage={(p) => nset({ page: String(p) })} onSize={(x) => nset({ pageSize: String(x) })} />}
      </div>
    </main>
  );
}
