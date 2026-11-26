'use client';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { rupees } from '@/lib/format';
import type { Category, MenuItem } from '@/lib/types';
import { categoryOrder, categoryPath, categoryTree, itemsIn } from '@/lib/menuTree';
import { FoodTile } from './FoodTile';
import { Icon } from './Icon';
import { Switch } from './Switch';

const NONE = '__none';
const PAGE_SIZES = [25, 50, 100];

/**
 * A cafe's menu for 100+ products: categories (with sub-categories) on the left, then search,
 * stock / veg filters and pages of products. The admin passes the edit buttons.
 */
export function MenuManager({ categories, items, coverColor, onAvailable, onPopular, onHidden, categoryActions, itemActions, onCategoryChange }: {
  categories: Category[];
  items: MenuItem[];
  coverColor: string;
  /** Without it the in-stock switch is shown read-only. */
  onAvailable?: (item: MenuItem, on: boolean) => void;
  /** ★ button (popular on the customer menu); without it the star only shows. */
  onPopular?: (item: MenuItem, on: boolean) => void;
  /** Hide / Show again (hidden = customers can't see it); without it there is no button. */
  onHidden?: (item: MenuItem, hidden: boolean) => void;
  categoryActions?: (c: Category, isMain: boolean) => ReactNode;
  itemActions?: (i: MenuItem) => ReactNode;
  /** tells the page which category is picked, e.g. so "New product" starts in it */
  onCategoryChange?: (id: string | null) => void;
}) {
  const tree = useMemo(() => categoryTree(categories), [categories]);
  const order = useMemo(() => categoryOrder(tree), [tree]);
  const [cat, setCat] = useState<string>(''); // '' = all, NONE = no category, else a category id
  const [query, setQuery] = useState('');
  const [stock, setStock] = useState<'' | 'out' | 'hidden' | 'popular'>('');
  const [veg, setVeg] = useState<'' | 'veg' | 'non'>('');
  const [size, setSize] = useState(25);
  const [page, setPage] = useState(1);

  // A deleted category can't stay picked.
  useEffect(() => {
    if (cat && cat !== NONE && !categories.some((c) => c.id === cat)) setCat('');
  }, [categories, cat]);
  useEffect(() => onCategoryChange?.(cat && cat !== NONE ? cat : null), [cat, onCategoryChange]);
  useEffect(() => setPage(1), [cat, query, stock, veg, size]);

  const loose = useMemo(() => items.filter((i) => !i.categoryId || !order.has(i.categoryId)), [items, order]);
  const countIn = (id: string) => itemsIn(items, tree, id).length;
  const hidden = (i: MenuItem) => i.isActive === false;
  const outCount = items.filter((i) => !i.isAvailable && !hidden(i)).length;
  const hiddenCount = items.filter(hidden).length;
  const popularCount = items.filter((i) => i.isPopular && !hidden(i)).length;

  const list = useMemo(() => {
    let l = !cat ? items : cat === NONE ? loose : itemsIn(items, tree, cat);
    const q = query.trim().toLowerCase();
    if (q) l = l.filter((i) => `${i.name} ${i.description}`.toLowerCase().includes(q));
    if (stock === 'out') l = l.filter((i) => !i.isAvailable && !hidden(i));
    if (stock === 'hidden') l = l.filter(hidden);
    if (stock === 'popular') l = l.filter((i) => i.isPopular && !hidden(i));
    if (veg) l = l.filter((i) => i.isVeg === (veg === 'veg'));
    const rank = (i: MenuItem) => (i.categoryId && order.has(i.categoryId) ? order.get(i.categoryId)! : 1e6);
    return [...l].sort((a, b) => rank(a) - rank(b) || a.sort - b.sort || a.name.localeCompare(b.name));
  }, [items, loose, tree, order, cat, query, stock, veg]);

  const pages = Math.max(1, Math.ceil(list.length / size));
  const current = Math.min(page, pages);
  const shown = list.slice((current - 1) * size, current * size);
  const filtered = !!(query || stock || veg);

  const catButton = (id: string, label: string, count: number, sub = false, actions?: ReactNode) => (
    <div className={`mm-cat${cat === id ? ' on' : ''}${sub ? ' sub' : ''}`} key={id || 'all'}>
      <button type="button" onClick={() => setCat(id)} aria-pressed={cat === id}>
        <span className="mm-cat-name">{sub ? '↳ ' : ''}{label}</span>
        <span className="mm-count">{count}</span>
      </button>
      {categoryActions && <div className="mm-cat-actions">{actions}</div>}
    </div>
  );

  return (
    <div className="mm">
      <aside className="card mm-side" aria-label="Categories">
        <div className="cap mm-side-title">Categories</div>
        {catButton('', 'All products', items.length)}
        {tree.map((m) => (
          <div key={m.id}>
            {catButton(m.id, m.name, countIn(m.id), false, categoryActions?.(m, true))}
            {m.subs.map((s) => catButton(s.id, s.name, countIn(s.id), true, categoryActions?.(s, false)))}
          </div>
        ))}
        {loose.length > 0 && catButton(NONE, 'No category', loose.length)}
        {!tree.length && <div className="small" style={{ padding: '6px 10px' }}>No categories yet.</div>}
      </aside>

      <section className="mm-main">
        <div className="mm-tools">
          <label className="mm-search">
            <Icon name="search" />
            <input className="field" type="search" placeholder="Search products" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search products" />
          </label>
          <select className="field" value={veg} onChange={(e) => setVeg(e.target.value as typeof veg)} aria-label="Veg or non-veg">
            <option value="">Veg + non-veg</option>
            <option value="veg">Veg only</option>
            <option value="non">Non-veg only</option>
          </select>
        </div>

        <div className="wrap mm-quick" role="group" aria-label="Show">
          {([['', `All ${items.length}`], ['out', `Out of stock ${outCount}`], ['hidden', `Hidden ${hiddenCount}`], ['popular', `★ Popular ${popularCount}`]] as const).map(([k, label]) => (
            <button key={k || 'all'} type="button" className={`pill${stock === k ? ' on' : ''}`} aria-pressed={stock === k} onClick={() => setStock(k)}>{label}</button>
          ))}
        </div>

        <div className="mm-summary small">
          <span>
            {list.length ? `${(current - 1) * size + 1}–${(current - 1) * size + shown.length} of ${list.length}` : '0'} products
            {cat ? ` in ${cat === NONE ? 'No category' : categoryPath(categories, cat)}` : ''}
          </span>
          {(filtered || cat) && (
            <button type="button" className="link" onClick={() => { setCat(''); setQuery(''); setStock(''); setVeg(''); }}>Clear filters</button>
          )}
        </div>

        <div className="card">
          {shown.length === 0 && <div className="empty">{items.length ? 'No products match.' : 'No products yet.'}</div>}
          {shown.map((item, idx) => (
            <div key={item.id} className={`menurow${hidden(item) ? ' mm-hidden' : ''}`} style={{ borderTop: idx ? '1px solid var(--line)' : 0 }}>
              <FoodTile emoji={item.emoji} imageUrl={item.imageUrl} color={coverColor} />
              <div style={{ flex: 1, minWidth: 0, opacity: item.isAvailable && !hidden(item) ? 1 : 0.55 }}>
                <div className="menuname">
                  <span className={`veg${item.isVeg ? '' : ' non'}`} style={{ marginRight: 0 }} />
                  <span className="h3">{item.name}</span>
                  {hidden(item) && <span className="badge mute">Hidden</span>}
                  {item.isPopular && !onPopular && <span className="badge acc">Popular</span>}
                </div>
                <div className="small mm-path">
                  {hidden(item) ? "Customers can't see it · " : ''}{categoryPath(categories, item.categoryId)}{item.description ? ` · ${item.description}` : ''}
                </div>
              </div>
              <div className="menuprice" style={hidden(item) ? { opacity: 0.55 } : undefined}>{rupees(item.price)}</div>
              {onPopular && (
                <button type="button" className={`mm-star${item.isPopular ? ' on' : ''}`} aria-pressed={item.isPopular}
                  onClick={() => onPopular(item, !item.isPopular)}
                  title={item.isPopular ? 'Popular: shown at the top for customers. Tap to remove.' : 'Mark as popular'}
                  aria-label={`${item.name}: popular`}>★</button>
              )}
              <div className="menustock">
                <span className="small" style={{ color: item.isAvailable ? 'var(--green)' : 'var(--sub)', fontWeight: 600 }}>
                  {item.isAvailable ? 'In stock' : 'Out of stock'}
                </span>
                {onAvailable && <Switch on={item.isAvailable} onChange={(on) => onAvailable(item, on)} label={`${item.name} in stock`} />}
              </div>
              {onHidden && (
                <button type="button" className={`mm-hide${hidden(item) ? ' show' : ''}`} onClick={() => onHidden(item, !hidden(item))}
                  title={hidden(item) ? 'Show it to customers again' : 'Hide from customers (not deleted: orders and reports stay)'}>
                  {hidden(item) ? 'Show again' : 'Hide'}
                </button>
              )}
              {itemActions?.(item)}
            </div>
          ))}
        </div>

        {list.length > PAGE_SIZES[0] && (
          <nav className="mm-pager" aria-label="Pages">
            <select className="field" value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label="Products per page">
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} per page</option>)}
            </select>
            <div className="mm-pages">
              <button type="button" className="iconbtn" disabled={current <= 1} onClick={() => setPage(current - 1)} aria-label="Previous page"><Icon name="back" /></button>
              {pageNumbers(current, pages).map((n, i) =>
                n === 0 ? <span key={`gap${i}`} className="small">…</span> : (
                  <button type="button" key={n} className={`mm-page${n === current ? ' on' : ''}`} onClick={() => setPage(n)} aria-current={n === current ? 'page' : undefined}>{n}</button>
                ),
              )}
              <button type="button" className="iconbtn" disabled={current >= pages} onClick={() => setPage(current + 1)} aria-label="Next page" style={{ transform: 'scaleX(-1)' }}><Icon name="back" /></button>
            </div>
          </nav>
        )}
      </section>
    </div>
  );
}

/** 1 … 4 5 6 … 12 (0 = gap) */
function pageNumbers(current: number, pages: number): number[] {
  const set = new Set([1, pages, current - 1, current, current + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out: number[] = [];
  sorted.forEach((n, i) => {
    if (i && n - sorted[i - 1] > 1) out.push(0);
    out.push(n);
  });
  return out;
}
