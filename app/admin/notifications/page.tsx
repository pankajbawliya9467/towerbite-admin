'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useLoad } from '@/lib/useLoad';
import type { Cafe, Location } from '@/lib/types';
import { Field } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { PageHead } from '@/components/PageHead';

type AudienceType = 'all' | 'location' | 'company' | 'cafe' | 'user';
type Sent = { id: string; title: string; body: string; audienceLabel: string; users: number; devices: number; createdAt: string; sentBy?: string };

const TYPES: { key: AudienceType; label: string }[] = [
  { key: 'all', label: 'Everyone' },
  { key: 'location', label: 'One building' },
  { key: 'company', label: 'One company' },
  { key: 'cafe', label: "A cafe's customers" },
  { key: 'user', label: 'One person' },
];

/** Owner-only: send a custom push notification to the app users you pick. */
export default function NotificationsPage() {
  const locations = useLoad<Location[]>('/v1/admin/locations');
  const cafes = useLoad<Cafe[]>('/v1/admin/cafes');
  const history = useLoad<Sent[]>('/v1/admin/notifications');
  const [type, setType] = useState<AudienceType>('location');
  const [locationId, setLocationId] = useState('');
  const [company, setCompany] = useState('');
  const [cafeId, setCafeId] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [reach, setReach] = useState<{ users: number; devices: number; label: string } | null>(null);
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
    if (!audience) return;
    const t = setTimeout(() => {
      api.post<{ users: number; devices: number; label: string }>('/v1/admin/notifications/preview', { audience }).then(setReach, (e) => setReachErr(e.message));
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function send() {
    if (!audience || !reach) return;
    if (!confirm(`Send "${title}" to ${reach.label}?\n\nIt goes to ${reach.users} ${reach.users === 1 ? 'person' : 'people'} right now and can't be taken back.`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await api.post<Sent>('/v1/admin/notifications', { title, body, audience });
      setMsg({ ok: true, text: `Sent to ${r.users} ${r.users === 1 ? 'person' : 'people'} (${r.devices} phones).` });
      setTitle('');
      setBody('');
      await history.reload();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const ready = !!audience && !!reach && reach.users > 0 && title.trim().length >= 2 && body.trim().length >= 2;

  return (
    <main className="page">
      <PageHead title="Notifications" sub="Send your own message to app users: offers, new cafes, festival wishes, service updates." />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
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
            <Field label={`Title · ${title.length}/60`} full>
              <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Diwali offer at Krunchy Kafe" />
            </Field>
            <Field label={`Message · ${body.length}/180`} full>
              <textarea className="field" value={body} onChange={(e) => setBody(e.target.value)} maxLength={180} rows={3} placeholder="Free gulab jamun with every order today. Order from your desk!" />
            </Field>
          </div>
          <div className="row" style={{ marginTop: 18, gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: reachErr ? 'var(--red)' : 'var(--sub)' }}>
              {reachErr || (!audience ? 'Pick who gets it' : !reach ? 'Counting…' : reach.users ? `Reaches ${reach.users} ${reach.users === 1 ? 'person' : 'people'} · ${reach.devices} phones` : 'Nobody here has the app with notifications on yet')}
            </span>
            <button className="btn" style={{ width: 'auto', padding: '0 22px' }} disabled={!ready || busy} onClick={send}>
              <Icon name="send" size={16} /> {busy ? 'Sending…' : 'Send now'}
            </button>
          </div>
          {msg && <div className={msg.ok ? 'badge ok' : 'err'} style={{ marginTop: 14, padding: msg.ok ? '8px 12px' : undefined }}>{msg.text}</div>}
        </section>

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
        <div className="h2" style={{ padding: '16px 18px 4px' }}>Sent</div>
        <table className="table">
          <thead><tr><th>When</th><th>Message</th><th>To</th><th className="num">People</th></tr></thead>
          <tbody>
            {history.data?.map((n) => (
              <tr key={n.id}>
                <td style={{ whiteSpace: 'nowrap', color: 'var(--sub)' }}>{new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</td>
                <td><b>{n.title}</b><div className="small">{n.body}</div></td>
                <td>{n.audienceLabel}{n.sentBy ? <div className="small">by {n.sentBy}</div> : null}</td>
                <td className="num">{n.users}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {history.data?.length === 0 && <div className="empty">Nothing sent yet.</div>}
      </div>
    </main>
  );
}
