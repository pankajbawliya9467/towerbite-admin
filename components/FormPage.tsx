'use client';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from './Icon';

export type Crumb = { label: string; href?: string };

/**
 * A big form on its own page (instead of a popup): path at the top, a back arrow, sections as cards, and a
 * Save bar that stays at the bottom of the screen. Leaving with unsaved changes asks first.
 * `tabs` sit under the title; `side` is a right-hand column on wide screens.
 */
export function FormPage({ crumbs, title, back, actions, tabs, submitLabel = 'Save changes', onSubmit, hideSave, children, side }: {
  crumbs: Crumb[]; title: string; back: string; actions?: ReactNode; tabs?: ReactNode; submitLabel?: string;
  /** Saves; throw an Error to show its message. Called again only after the user changes something. */
  onSubmit: () => Promise<void>;
  /** For a tab without a form (e.g. logins, which save on their own). */
  hideSave?: boolean;
  children: ReactNode;
  side?: ReactNode;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');

  // Closing the tab or reloading with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const leave = () => {
    if (dirty && !confirm('Leave without saving your changes?')) return;
    router.push(back);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (hideSave) return; // e.g. Enter in a field of a tab that saves on its own
    setBusy(true);
    setError('');
    try {
      await onSubmit();
      setDirty(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page fpage">
      <nav className="fp-crumbs small" aria-label="Path">
        {crumbs.map((c, i) => (
          <span key={i}>
            {i > 0 && <span className="fp-sep">›</span>}
            {c.href ? <Link href={c.href} onClick={(e) => { if (dirty && !confirm('Leave without saving your changes?')) e.preventDefault(); }}>{c.label}</Link> : <b>{c.label}</b>}
          </span>
        ))}
      </nav>
      <div className="fp-head">
        <button type="button" className="iconbtn" onClick={leave} aria-label="Back"><Icon name="back" /></button>
        <h1 className="h1">{title}</h1>
        <div className="fp-actions">{actions}</div>
      </div>
      {tabs && <div className="fp-tabs">{tabs}</div>}
      <form onSubmit={submit} onInput={() => !hideSave && setDirty(true)}
        onClick={(e) => {
          if (!hideSave && (e.target as HTMLElement).closest('.fp-main button[type="button"], .fp-side button[type="button"], [role="switch"], input[type="checkbox"]')) setDirty(true);
        }}>
        <div className={side ? 'fp-cols' : undefined}>
          <div className="fp-main">{children}</div>
          {side && <div className="fp-side">{side}</div>}
        </div>
        {!hideSave && (
          <div className="fp-bar">
            <span className={dirty ? 'fp-dirty' : 'small'}>{error ? <span className="err" style={{ padding: '6px 10px' }}>{error}</span> : dirty ? '● Changes not saved' : 'All changes saved'}</span>
            <span className="fp-bar-btns">
              <button type="button" className="btn sec" onClick={leave}>Cancel</button>
              <button className="btn" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
            </span>
          </div>
        )}
      </form>
    </main>
  );
}

/** One titled card of fields inside a FormPage (two columns on wide screens). */
export function FormCard({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section className="card fp-card">
      <div className="h2">{title}</div>
      {note && <div className="small" style={{ marginTop: 4 }}>{note}</div>}
      <div className="form" style={{ marginTop: 14 }}>{children}</div>
    </section>
  );
}
