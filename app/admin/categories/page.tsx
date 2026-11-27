'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useLoad } from '@/lib/useLoad';
import { confirmDelete } from '@/lib/confirm';
import type { CatalogCategory, CatalogList } from '@/lib/types';
import { PageHead } from '@/components/PageHead';
import { FormModal } from '@/components/FormModal';
import { Field } from '@/components/Field';
import { Icon } from '@/components/Icon';
import { useCan } from '@/components/useCan';
import { useSession } from '@/components/Session';

type Draft = { id?: string; parentId: string | null; name: string; emoji: string; aliases: string; keywords: string };
const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
const byOrder = (a: CatalogCategory, b: CatalogCategory) => a.sort - b.sort || a.name.localeCompare(b.name);

/**
 * Admin → Categories: one list of categories and sub-categories for every cafe. Products pick from it.
 * The switch on top decides whether menus already use it (else each cafe's own categories still show).
 */
export default function CategoriesPage() {
  const cat = useLoad<CatalogList>('/v1/admin/catalog');
  const ok = useCan();
  const { state } = useSession();
  const isSuper = state.status === 'ready' && !!state.me.staff?.isSuper;
  const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [merging, setMerging] = useState(false);
  const [busy, setBusy] = useState(false);

  const all = cat.data?.categories ?? [];
  const mains = useMemo(() => all.filter((c) => !c.parentId).sort(byOrder), [all]);
  const subsOf = (id: string) => all.filter((c) => c.parentId === id).sort(byOrder);
  const main = mains.find((m) => m.id === sel) ?? mains[0];
  const subs = main ? subsOf(main.id) : [];
  const total = (m: CatalogCategory) => m.products + subsOf(m.id).reduce((s, x) => s + x.products, 0);
  useEffect(() => {
    if (!sel && mains[0]) setSel(mains[0].id);
  }, [sel, mains]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await cat.reload();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const move = (rows: CatalogCategory[], i: number, dir: -1 | 1, parentId: string | null) => {
    const ids = rows.map((r) => r.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    void run(() => api.put('/v1/admin/catalog/order', { parentId, ids }));
  };
  const turn = (c: CatalogCategory) => run(() => api.patch(`/v1/admin/catalog/${c.id}`, { isActive: !c.isActive }));
  const remove = (c: CatalogCategory) => {
    if (!confirmDelete(`“${c.name}”`, 'Only an empty category can be deleted.')) return;
    void run(async () => {
      await api.del(`/v1/admin/catalog/${c.id}`);
      if (c.id === sel) setSel(null);
    });
  };
  const edit = (c: CatalogCategory) =>
    setDraft({ id: c.id, parentId: c.parentId, name: c.name, emoji: c.emoji, aliases: c.aliases.join(', '), keywords: c.keywords.join(', ') });

  function toggleSwitch() {
    const d = cat.data!;
    const msg = d.enabled
      ? 'Turn OFF global categories?\n\nMenus in the app, website and cafe panel go back to each cafe\'s own categories.'
      : `Turn ON global categories?\n\nMenus in the app, website and cafe panel will use this list straight away.${d.unassigned ? `\n\n${d.unassigned} products have no category yet: they will show under "More". Fix them first on the Move old categories page.` : ''}`;
    if (!confirm(msg)) return;
    void run(() => api.put('/v1/admin/catalog/switch', { on: !d.enabled }));
  }

  const d = cat.data;
  return (
    <main className="page">
      <PageHead title="Categories" sub="One list for every cafe. Products pick their category and sub-category from here.">
        {ok('catalog.edit') && <Link className="btn sec sm" href="/admin/categories/mapping"><Icon name="history" /> Move old categories</Link>}
        {ok('catalog.edit') && <button className="btn sec sm" disabled={!all.length} onClick={() => setMerging(true)}>Merge</button>}
        {ok('catalog.add') && (
          <button className="btn sm" onClick={() => setDraft({ parentId: null, name: '', emoji: '', aliases: '', keywords: '' })}>
            <Icon name="plus" /> New category
          </button>
        )}
      </PageHead>
      {cat.error && <div className="err">{cat.error}</div>}

      {d && (
        <div className={`card ct-switch${d.enabled ? ' on' : ''}`}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div className="h3">{d.enabled ? 'Menus use these categories' : 'Menus still use each cafe\'s own categories'}</div>
            <div className="small" style={{ marginTop: 4 }}>
              {d.enabled
                ? 'The app, website and cafe panel show this list. Products without a category show under "More".'
                : 'Build this list and move the old categories first. Then turn it on: every menu changes at once, and you can turn it off again.'}
            </div>
          </div>
          {isSuper
            ? <button className={`btn sm${d.enabled ? ' sec' : ' go'}`} disabled={busy} onClick={toggleSwitch}>{d.enabled ? 'Turn off' : 'Turn on for all menus'}</button>
            : <span className="small">Only a super admin can switch this.</span>}
        </div>
      )}

      {d && (
        <div className="ct-stats">
          <div className="card stat"><div className="small">Categories</div><div className="h2">{mains.filter((m) => m.isActive).length}</div></div>
          <div className="card stat"><div className="small">Sub-categories</div><div className="h2">{all.filter((c) => c.parentId && c.isActive).length}</div></div>
          <div className="card stat"><div className="small">Products with a category</div><div className="h2">{d.totalProducts - d.unassigned}</div></div>
          <div className={`card stat${d.unassigned ? ' ct-warn' : ''}`}>
            <div className="small">Products without a category</div>
            <div className="h2">{d.unassigned} {d.unassigned > 0 && ok('catalog.edit') && <Link className="link" href="/admin/categories/mapping#fix">Fix now →</Link>}</div>
          </div>
        </div>
      )}

      {d && !all.length && (
        <div className="card empty">
          No categories yet. Add your first one, or import the starting list on <Link className="link" href="/admin/categories/mapping">Move old categories</Link>.
        </div>
      )}

      {main && (
        <div className="ct-grid">
          <section className="card ct-list" aria-label="Main categories">
            <div className="cap" style={{ padding: '4px 8px 10px' }}>Main categories · order in apps</div>
            {mains.map((m, i) => (
              <div key={m.id} className={`ct-item${m.id === main.id ? ' on' : ''}${m.isActive ? '' : ' off'}`}>
                <button type="button" className="ct-pick" onClick={() => setSel(m.id)} aria-pressed={m.id === main.id}>
                  <span className="ct-emoji">{m.emoji || m.name.charAt(0)}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b>{m.name}</b>
                    <span className="small" style={{ display: 'block' }}>
                      {m.isActive ? `${subsOf(m.id).length} sub-categories · ${total(m)} products` : 'Turned off'}
                    </span>
                  </span>
                </button>
                {ok('catalog.edit') && (
                  <span className="ct-arrows">
                    <button type="button" aria-label={`Move ${m.name} up`} disabled={busy || i === 0} onClick={() => move(mains, i, -1, null)}>▲</button>
                    <button type="button" aria-label={`Move ${m.name} down`} disabled={busy || i === mains.length - 1} onClick={() => move(mains, i, 1, null)}>▼</button>
                  </span>
                )}
              </div>
            ))}
          </section>

          <section className="card ct-detail" aria-label={main.name}>
            <div className="row" style={{ gap: 14, flexWrap: 'wrap' }}>
              <span className="ct-emoji big">{main.emoji || main.name.charAt(0)}</span>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="h2">{main.name}</div>
                  <span className={`badge ${main.isActive ? 'ok' : 'mute'}`}>{main.isActive ? 'On' : 'Off'}</span>
                </div>
                <div className="small" style={{ marginTop: 4 }}>
                  {total(main)} products · {main.cafes} cafes directly{main.aliases.length ? ` · old names: ${main.aliases.slice(0, 4).join(', ')}${main.aliases.length > 4 ? '…' : ''}` : ''}
                </div>
              </div>
              {ok('catalog.edit') && <button className="btn sec sm" onClick={() => edit(main)}><Icon name="edit" /> Edit</button>}
              {ok('catalog.delete') && <button className="btn sec sm" disabled={busy} onClick={() => turn(main)}>{main.isActive ? 'Turn off' : 'Turn on'}</button>}
              {ok('catalog.delete') && !total(main) && !subs.length && (
                <button className="iconbtn" aria-label={`Delete ${main.name}`} onClick={() => remove(main)}><Icon name="trash" /></button>
              )}
            </div>

            <div className="row" style={{ margin: '24px 0 10px' }}>
              <div className="h3">Sub-categories</div>
              {ok('catalog.add') && main.isActive && (
                <button className="btn sm ct-soft" onClick={() => setDraft({ parentId: main.id, name: '', emoji: '', aliases: '', keywords: '' })}>
                  <Icon name="plus" /> Add sub-category
                </button>
              )}
            </div>
            {!subs.length ? (
              <div className="ct-note">No sub-categories: products go straight into <b>{main.name}</b>. Add sub-categories to split it (for example Tea, Coffee, Shakes).</div>
            ) : (
              <div className="table-scroll ct-table">
                <table className="table">
                  <thead><tr><th>Name</th><th className="num">Products</th><th className="num">Cafes</th><th>Status</th><th /></tr></thead>
                  <tbody>
                    {subs.map((s, i) => (
                      <tr key={s.id} className={s.isActive ? undefined : 'ct-off'}>
                        <td>
                          <b>{s.name}</b>
                          {s.keywords.length > 0 && <div className="small">Words: {s.keywords.slice(0, 5).join(', ')}{s.keywords.length > 5 ? '…' : ''}</div>}
                        </td>
                        <td className="num">{s.products}</td>
                        <td className="num">{s.cafes}</td>
                        <td><span className={`badge ${s.isActive ? 'ok' : 'mute'}`}>{s.isActive ? 'On' : 'Off'}</span></td>
                        <td>
                          <div className="ct-actions">
                            {ok('catalog.edit') && <>
                              <button type="button" className="iconbtn" aria-label={`Move ${s.name} up`} disabled={busy || i === 0} onClick={() => move(subs, i, -1, main.id)}>▲</button>
                              <button type="button" className="iconbtn" aria-label={`Move ${s.name} down`} disabled={busy || i === subs.length - 1} onClick={() => move(subs, i, 1, main.id)}>▼</button>
                              <button type="button" className="iconbtn" aria-label={`Edit ${s.name}`} onClick={() => edit(s)}><Icon name="edit" /></button>
                            </>}
                            {ok('catalog.delete') && <button type="button" className="btn sec sm" disabled={busy} onClick={() => turn(s)}>{s.isActive ? 'Turn off' : 'Turn on'}</button>}
                            {ok('catalog.delete') && !s.products && (
                              <button type="button" className="iconbtn" aria-label={`Delete ${s.name}`} onClick={() => remove(s)}><Icon name="trash" /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="ct-note" style={{ marginTop: 16 }}>
              A category with products can't be deleted or turned off: use <b>Merge</b> to move its products into another one first.
              Renaming here changes it in every cafe at once.
            </div>
          </section>
        </div>
      )}

      {draft && (
        <FormModal
          title={draft.id ? `Edit ${draft.name}` : draft.parentId ? `New sub-category in ${mains.find((m) => m.id === draft.parentId)?.name ?? ''}` : 'New category'}
          submitLabel={draft.id ? 'Save' : 'Create'}
          onClose={() => setDraft(null)}
          onSubmit={async () => {
            const body = { name: draft.name, emoji: draft.emoji, parentId: draft.parentId, aliases: list(draft.aliases), keywords: list(draft.keywords) };
            if (draft.id) await api.patch(`/v1/admin/catalog/${draft.id}`, body);
            else {
              const made = await api.post<CatalogCategory>('/v1/admin/catalog', body);
              if (!made.parentId) setSel(made.id);
            }
            await cat.reload();
          }}
        >
          <Field label="Name" full>
            <input className="field" required autoFocus maxLength={40} value={draft.name} placeholder={draft.parentId ? 'Cold coffee' : 'Beverages'}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <Field label="Emoji (optional)">
            <input className="field" maxLength={8} value={draft.emoji} placeholder="☕" onChange={(e) => setDraft({ ...draft, emoji: e.target.value })} />
          </Field>
          <Field label="Inside">
            <select className="field" value={draft.parentId ?? ''} onChange={(e) => setDraft({ ...draft, parentId: e.target.value || null })}
              disabled={!!draft.id && all.some((c) => c.parentId === draft.id)}>
              <option value="">— Main category —</option>
              {mains.filter((m) => m.id !== draft.id && m.isActive).map((m) => <option key={m.id} value={m.id}>Sub-category of {m.name}</option>)}
            </select>
          </Field>
          <Field label="Old names (comma separated, used to move old categories)" full>
            <input className="field" value={draft.aliases} placeholder="cold drinks, juices & coolers" onChange={(e) => setDraft({ ...draft, aliases: e.target.value })} />
          </Field>
          <Field label="Words in product names (comma separated, used to split mixed old categories)" full>
            <input className="field" value={draft.keywords} placeholder="mojito, mocktail, fizz" onChange={(e) => setDraft({ ...draft, keywords: e.target.value })} />
          </Field>
        </FormModal>
      )}

      {merging && <MergeModal categories={all} onClose={() => setMerging(false)} onDone={() => void cat.reload()} />}
    </main>
  );
}

/** Moves all products of one category into another and turns the first one off. */
function MergeModal({ categories, onClose, onDone }: { categories: CatalogCategory[]; onClose: () => void; onDone: () => void }) {
  const [fromId, setFrom] = useState('');
  const [toId, setTo] = useState('');
  const mains = categories.filter((c) => !c.parentId).sort(byOrder);
  const label = (c: CatalogCategory) => {
    const p = categories.find((x) => x.id === c.parentId);
    return `${p ? `${p.name} › ` : ''}${c.name} (${c.products})`;
  };
  const hasSubs = (c: CatalogCategory) => categories.some((x) => x.parentId === c.id && x.isActive);
  const options = (pick: (c: CatalogCategory) => boolean) => mains.flatMap((m) => [m, ...categories.filter((c) => c.parentId === m.id).sort(byOrder)]).filter(pick);
  const from = categories.find((c) => c.id === fromId);
  return (
    <FormModal title="Merge categories" submitLabel="Merge" onClose={onClose}
      onSubmit={async () => {
        if (!fromId || !toId) throw new Error('Pick both categories');
        const r = await api.post<{ moved: number }>('/v1/admin/catalog/merge', { fromId, toId });
        alert(`${r.moved} products moved. "${from?.name}" is now turned off.`);
        onDone();
      }}>
      <Field label="Move all products from" full>
        <select className="field" required value={fromId} onChange={(e) => setFrom(e.target.value)}>
          <option value="">Pick a category…</option>
          {options((c) => c.isActive && !categories.some((x) => x.parentId === c.id)).map((c) => <option key={c.id} value={c.id}>{label(c)}</option>)}
        </select>
      </Field>
      <Field label="Into" full>
        <select className="field" required value={toId} onChange={(e) => setTo(e.target.value)}>
          <option value="">Pick a category…</option>
          {options((c) => c.isActive && !hasSubs(c) && c.id !== fromId).map((c) => <option key={c.id} value={c.id}>{label(c)}</option>)}
        </select>
      </Field>
      <div className="full small">The first category is turned off and its name is kept as an old name of the second, so future mapping finds it.</div>
    </FormModal>
  );
}
