'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api, qs } from '@/lib/api';
import { useLoad } from '@/lib/useLoad';
import type { Cafe, CatalogCategory, CatalogList, CatalogProduct, MappingGroup } from '@/lib/types';
import { PageHead } from '@/components/PageHead';
import { Icon } from '@/components/Icon';
import { useCan } from '@/components/useCan';

type Preview = { id: string; name: string; now: string | null; goesTo: string | null }[];
type Page<T> = { rows: T[]; total: number; page: number; pageSize: number };
const POPULAR = '__popular';
const SKIP = '__skip';

/** Leaf categories (where a product may sit), grouped under their main category, for <select>s. */
function useTargets(cats: CatalogCategory[]) {
  return useMemo(() => {
    const order = (a: CatalogCategory, b: CatalogCategory) => a.sort - b.sort || a.name.localeCompare(b.name);
    const mains = cats.filter((c) => !c.parentId && c.isActive).sort(order);
    const groups = mains.map((m) => ({ main: m, subs: cats.filter((c) => c.parentId === m.id && c.isActive).sort(order) }));
    const name = new Map<string, string>();
    for (const g of groups) {
      name.set(g.main.id, g.main.name);
      for (const s of g.subs) name.set(s.id, `${g.main.name} › ${s.name}`);
    }
    return { groups, name };
  }, [cats]);
}

function TargetOptions({ targets }: { targets: ReturnType<typeof useTargets> }) {
  return (
    <>
      {targets.groups.map(({ main, subs }) => subs.length ? (
        <optgroup key={main.id} label={main.name}>
          {subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </optgroup>
      ) : <option key={main.id} value={main.id}>{main.name}</option>)}
    </>
  );
}

/**
 * Admin → Categories → Move old categories. Each old per-cafe category name (all cafes that have it) gets a
 * place in the global list; then Apply gives every product its global category. Export/Import carries the
 * whole result from a local copy to production.
 */
export default function MappingPage() {
  const ok = useCan();
  const cat = useLoad<CatalogList>('/v1/admin/catalog');
  const map = useLoad<MappingGroup[]>(ok('catalog.edit') ? '/v1/admin/catalog/mapping' : null);
  const targets = useTargets(cat.data?.categories ?? []);
  const [busy, setBusy] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [filter, setFilter] = useState<'todo' | 'all'>('todo');
  const [overwrite, setOverwrite] = useState(false);
  // Bumped after Apply / Import / Suggest, so the list of products without a category reloads too.
  const [stamp, setStamp] = useState(0);
  const file = useRef<HTMLInputElement>(null);

  const groups = map.data ?? [];
  const withProducts = groups.filter((g) => g.products > 0);
  const done = withProducts.filter((g) => g.approved).length;
  const shown = filter === 'todo' ? groups.filter((g) => !g.approved && g.products > 0) : groups;

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    try {
      await fn();
      await Promise.all([map.reload(), cat.reload()]);
      setStamp((n) => n + 1);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  const save = (g: MappingGroup, value: string, useKeywords: boolean, approved = true) =>
    run(g.key, () => api.put('/v1/admin/catalog/mapping', {
      key: g.key,
      action: value === POPULAR ? 'popular' : value === SKIP ? 'skip' : 'map',
      catalogCategoryId: value === POPULAR || value === SKIP ? null : value || null,
      useKeywords,
      approved,
    }));
  const valueOf = (g: MappingGroup) => (g.action === 'popular' ? POPULAR : g.action === 'skip' ? SKIP : g.target ?? '');

  async function approveAll() {
    const ready = groups.filter((g) => !g.approved && (g.action !== 'map' || g.target));
    if (!ready.length) return alert('Nothing ready: pick a place for the remaining names first.');
    if (!confirm(`Approve ${ready.length} suggestions as they are?`)) return;
    await run('all', async () => {
      for (const g of ready) await api.put('/v1/admin/catalog/mapping', { key: g.key, action: g.action, catalogCategoryId: g.target, useKeywords: g.useKeywords, approved: true });
    });
  }

  async function showPreview(g: MappingGroup) {
    if (open === g.key) return setOpen(null);
    setOpen(g.key);
    setPreview(null);
    setPreview(await api.get<Preview>(`/v1/admin/catalog/mapping/preview${qs({ key: g.key })}`).catch(() => []));
  }

  async function apply() {
    const msg = `Give products their category from the ${done} approved names?${overwrite ? '\n\nProducts that already have a category will be moved again.' : '\n\nProducts that already have a category keep it.'}`;
    if (!confirm(msg)) return;
    await run('apply', async () => {
      const r = await api.post<{ assigned: number; starred: number; notApproved: number; unassigned: number }>('/v1/admin/catalog/mapping/apply', { overwrite });
      alert(`${r.assigned} products got a category${r.starred ? `, ${r.starred} got the ★ Popular flag` : ''}.\n${r.unassigned} products still have none${r.notApproved ? ` (${r.notApproved} old names are not approved yet)` : ''}.`);
    });
  }

  async function importFile(f: File) {
    let body: unknown;
    try {
      body = JSON.parse(await f.text());
    } catch {
      return alert('This is not a TowerBites categories file (.json).');
    }
    const keep = confirm('Import categories, mapping and product categories from this file?\n\nOK = products that already have a category keep it.\nCancel = stop.');
    if (!keep) return;
    await run('import', async () => {
      const r = await api.post<{ categories: number; mapped: number; assigned: number }>('/v1/admin/catalog/import', { ...(body as object), overwrite: false });
      alert(`Imported ${r.categories} categories, ${r.mapped} old names and ${r.assigned} product categories.`);
    });
  }

  if (!ok('catalog.edit')) return <main className="page"><div className="card empty">You need the Categories “Edit” tick for this page.</div></main>;

  return (
    <main className="page">
      <div className="small" style={{ marginBottom: 10 }}><Link className="link" href="/admin/categories"><Icon name="back" /> Categories</Link></div>
      <PageHead title="Move old categories" sub="Every cafe's own category names, and where they go in the new list. Nothing changes on menus until the switch on the Categories page is on.">
        <button className="btn sec sm" disabled={!!busy} onClick={() => file.current?.click()}><Icon name="upload" /> Import</button>
        <button className="btn sec sm" disabled={!!busy} onClick={() => void api.download('/v1/admin/catalog/export', `towerbites-categories-${new Date().toISOString().slice(0, 10)}.json`).catch((e: Error) => alert(e.message))}>
          <Icon name="download" /> Export
        </button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void importFile(f); }} />
      </PageHead>

      <ol className="mp-steps">
        <li className={cat.data?.categories.length ? 'done' : ''}><b>1. Build the list</b><span>On Categories, or Import the starting file</span></li>
        <li className={withProducts.length && withProducts.every((g) => g.mapped) ? 'done' : ''}><b>2. Suggest</b><span>Matches old names by their “old names”</span></li>
        <li className={withProducts.length && done === withProducts.length ? 'done' : ''}><b>3. Check &amp; approve</b><span>{done} of {withProducts.length} names approved</span></li>
        <li className={cat.data && cat.data.totalProducts && !cat.data.unassigned ? 'done' : ''}><b>4. Apply</b><span>{cat.data ? `${cat.data.unassigned} products on menus without a category` : ''}</span></li>
      </ol>

      {(map.error || cat.error) && <div className="err">{map.error || cat.error}</div>}

      <div className="lt-bar" style={{ alignItems: 'center' }}>
        <div className="wrap">
          <button className={`pill${filter === 'todo' ? ' on' : ''}`} onClick={() => setFilter('todo')}>To check · {withProducts.length - done}</button>
          <button className={`pill${filter === 'all' ? ' on' : ''}`} onClick={() => setFilter('all')}>All names · {groups.length}</button>
        </div>
        <div className="wrap" style={{ marginLeft: 'auto' }}>
          <button className="btn sec sm" disabled={!!busy || !cat.data?.categories.length} onClick={() => run('suggest', () => api.post('/v1/admin/catalog/mapping/suggest'))}>
            {busy === 'suggest' ? 'Suggesting…' : 'Suggest'}
          </button>
          <button className="btn sec sm" disabled={!!busy} onClick={approveAll}>Approve all suggestions</button>
          <label className="small" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} /> Redo products that have one
          </label>
          <button className="btn sm" disabled={!!busy || !done} onClick={apply}>{busy === 'apply' ? 'Applying…' : 'Apply'}</button>
        </div>
      </div>

      <div className="card table-scroll">
        <table className="table">
          <thead>
            <tr><th>Old category</th><th className="num">Cafes</th><th className="num">Products</th><th style={{ minWidth: 240 }}>Goes to</th><th>Split by words</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {map.data && !shown.length && <tr><td colSpan={7} className="empty">{groups.length ? 'All names are checked.' : 'No old categories.'}</td></tr>}
            {shown.map((g) => {
              const value = valueOf(g);
              const missing = g.action === 'map' && !g.target && g.products > 0;
              return [
                <tr key={g.key}>
                  <td>
                    <b>{g.name}</b>{g.parent && <span className="small"> in {g.parent}</span>}
                    {g.sample.length > 0 && <div className="small mp-sample">{g.sample.join(' · ')}</div>}
                  </td>
                  <td className="num">{g.cafes}</td>
                  <td className="num">{g.products}</td>
                  <td>
                    <select className={`field mp-select${missing ? ' mp-missing' : ''}`} value={value} disabled={busy === g.key}
                      onChange={(e) => void save(g, e.target.value, g.useKeywords)} aria-label={`Where ${g.name} goes`}>
                      <option value="" disabled>Pick a category…</option>
                      <TargetOptions targets={targets} />
                      <option value={POPULAR}>★ Only the Popular flag</option>
                      <option value={SKIP}>Skip (nothing to move)</option>
                    </select>
                  </td>
                  <td>
                    {g.action === 'map' && (
                      <input type="checkbox" checked={g.useKeywords} disabled={busy === g.key || !g.target} aria-label={`Split ${g.name} by product words`}
                        onChange={(e) => void save(g, value, e.target.checked, g.approved)} />
                    )}
                  </td>
                  <td>
                    {g.approved ? <span className="badge ok">Approved</span>
                      : g.mapped && !missing ? <span className="badge info">Suggested</span>
                        : <span className="badge warn">Needs a place</span>}
                    {g.mixed && <span className="badge mute" title="Cafes with this name point to different places">mixed</span>}
                  </td>
                  <td>
                    <div className="ct-actions">
                      {g.products > 0 && <button className="btn sec sm" onClick={() => void showPreview(g)}>{open === g.key ? 'Hide' : 'Products'}</button>}
                      {!g.approved && !missing && <button className="btn sm" disabled={!!busy} onClick={() => void save(g, value, g.useKeywords)}>Approve</button>}
                    </div>
                  </td>
                </tr>,
                open === g.key && (
                  <tr key={`${g.key}-p`}>
                    <td colSpan={7} className="mp-preview">
                      {!preview ? <span className="small">Loading…</span> : (
                        <div className="mp-prev-grid">
                          {preview.map((p) => (
                            <div key={p.id} className={p.goesTo && p.goesTo !== g.target ? 'moved' : undefined}>
                              <b>{p.name}</b>
                              <span className="small">→ {p.goesTo ? targets.name.get(p.goesTo) ?? '—' : g.action === 'popular' ? '★ flag only' : 'no category'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="small" style={{ marginTop: 8 }}>Orange = sent somewhere else by a word in its name. Wrong? Untick “Split by words”, or move it below after Apply.</div>
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </div>

      <Unassigned targets={targets} stamp={stamp} onMoved={() => void cat.reload()} />
    </main>
  );
}

/** Products without a global category: pick some, pick a category, move. */
function Unassigned({ targets, stamp, onMoved }: { targets: ReturnType<typeof useTargets>; stamp: number; onMoved: () => void }) {
  const cafes = useLoad<Cafe[]>('/v1/admin/cafes');
  const [cafeId, setCafeId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [to, setTo] = useState('');
  const list = useLoad<Page<CatalogProduct>>(`/v1/admin/catalog/products${qs({ category: 'none', cafeId, search, page: String(page), pageSize: '50' })}`, undefined, true);
  const rows = list.data?.rows ?? [];
  const { reload } = list;
  useEffect(() => {
    if (stamp) void reload();
  }, [stamp, reload]);
  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / 50));

  async function move() {
    if (!to || !picked.size) return;
    try {
      await api.post('/v1/admin/catalog/assign', { itemIds: [...picked], catalogCategoryId: to });
      setPicked(new Set());
      await list.reload();
      onMoved();
    } catch (e) {
      alert((e as Error).message);
    }
  }
  const toggle = (id: string) => setPicked((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });

  return (
    <section id="fix" style={{ marginTop: 36 }}>
      <div className="row" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="h2">Products without a category · {list.data?.total ?? '…'}</div>
          <div className="small">After Apply, these are left (hidden products and closed cafes included). Tick them, pick a category, Move.</div>
        </div>
      </div>
      <div className="lt-bar" style={{ alignItems: 'center' }}>
        <select className="field" style={{ maxWidth: 240 }} value={cafeId} onChange={(e) => { setCafeId(e.target.value); setPage(1); }} aria-label="Cafe">
          <option value="">All cafes</option>
          {cafes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className="field" style={{ maxWidth: 240 }} type="search" placeholder="Search products" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Search products" />
        <div className="wrap" style={{ marginLeft: 'auto', alignItems: 'center' }}>
          <span className="small">{picked.size} picked</span>
          <select className="field" style={{ minWidth: 220 }} value={to} onChange={(e) => setTo(e.target.value)} aria-label="Move to">
            <option value="">Move to…</option>
            <TargetOptions targets={targets} />
          </select>
          <button className="btn sm" disabled={!to || !picked.size} onClick={() => void move()}>Move</button>
        </div>
      </div>
      <div className="card table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <input type="checkbox" aria-label="Pick all on this page" checked={!!rows.length && rows.every((r) => picked.has(r.id))}
                  onChange={(e) => setPicked(e.target.checked ? new Set([...picked, ...rows.map((r) => r.id)]) : new Set([...picked].filter((id) => !rows.some((r) => r.id === id))))} />
              </th>
              <th>Product</th><th>Cafe</th><th>Old category</th><th className="num">Price</th>
            </tr>
          </thead>
          <tbody>
            {list.data && !rows.length && <tr><td colSpan={5} className="empty">Every product has a category.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} onClick={() => toggle(r.id)} style={{ cursor: 'pointer' }}>
                <td><input type="checkbox" checked={picked.has(r.id)} onChange={() => toggle(r.id)} onClick={(e) => e.stopPropagation()} aria-label={`Pick ${r.name}`} /></td>
                <td><span className={`veg${r.isVeg ? '' : ' non'}`} /><b>{r.name}</b>{!r.isActive && <span className="badge mute" style={{ marginLeft: 6 }}>Hidden</span>}</td>
                <td>{r.cafeName}</td>
                <td className="small">{r.oldCategory ? `${r.oldParent ? `${r.oldParent} › ` : ''}${r.oldCategory}` : '—'}</td>
                <td className="num">₹{r.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="wrap" style={{ justifyContent: 'center', marginTop: 12 }}>
          <button className="btn sec sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="small" style={{ alignSelf: 'center' }}>Page {page} of {pages}</span>
          <button className="btn sec sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </section>
  );
}
