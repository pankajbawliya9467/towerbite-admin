'use client';
import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { confirmDelete } from '@/lib/confirm';
import { api } from '@/lib/api';
import { useLoad } from '@/lib/useLoad';
import type { Cafe, CatalogList, Category, MenuItem } from '@/lib/types';
import { MenuManager } from '@/components/MenuManager';
import { Icon } from '@/components/Icon';
import { useCan } from '@/components/useCan';
import { ImportExcel } from './ImportExcel';

/** Where the product / category forms go back to: an admin page path only. */
export const safeBack = (v: string | null | undefined) => (v && /^\/admin\/[A-Za-z0-9/_-]*$/.test(v) ? v : '/admin/products');

/**
 * One cafe's products for admins: categories on the left, search, stock / popular / hide switches, edit.
 * Used on Admin → Products (with a cafe picker) and on a cafe's details page. `back` is where the product and
 * category forms return to. `tools` adds controls next to the add buttons (the cafe picker).
 */
export function CafeProducts({ cafe, back, tools }: { cafe: Cafe; back: string; tools?: ReactNode }) {
  const router = useRouter();
  const ok = useCan();
  const categories = useLoad<Category[]>(`/v1/admin/categories?cafeId=${cafe.id}`);
  const items = useLoad<MenuItem[]>(`/v1/admin/menu-items?cafeId=${cafe.id}`);
  const [picked, setPicked] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  // Once menus use the global categories, the list shows them (the same for every cafe, edited on
  // Admin → Categories) instead of the cafe's own ones.
  const catalog = useLoad<CatalogList>('/v1/admin/catalog');
  const global = !!catalog.data?.enabled;
  const view = useMemo(() => {
    if (!global || !items.data || !catalog.data) return { categories: categories.data, items: items.data };
    const used = new Set(items.data.map((i) => i.catalogCategoryId).filter(Boolean));
    const cats = catalog.data.categories.filter((c) => used.has(c.id) || catalog.data!.categories.some((x) => x.parentId === c.id && used.has(x.id)));
    return {
      categories: cats.map((c) => ({ id: c.id, cafeId: cafe.id, parentId: c.parentId, name: c.name, sort: c.sort })) as Category[],
      items: items.data.map((i) => ({ ...i, categoryId: i.catalogCategoryId ?? null })),
    };
  }, [global, items.data, catalog.data, categories.data, cafe.id]);
  const canEditItem = ok('menu.edit') || ok('menu.price') || ok('menu.soldout');
  const backQ = `back=${encodeURIComponent(back)}`;

  async function patch(i: MenuItem, body: Partial<MenuItem>) {
    await api.patch(`/v1/admin/menu-items/${i.id}`, body).catch((e: Error) => alert(e.message));
    await items.reload();
  }
  async function setHidden(i: MenuItem, hide: boolean) {
    if (hide && !confirm(`Hide ${i.name} from customers?\n\nIt disappears from the app and website until it is shown again. Nothing is deleted.`)) return;
    await patch(i, { isActive: !hide });
  }
  async function removeCategory(c: Category, isMain: boolean) {
    const subs = categories.data?.filter((x) => x.parentId === c.id).length ?? 0;
    const msg = `Its products stay on the menu without a category.`
      + (isMain && subs ? ` Its ${subs} sub-categor${subs === 1 ? 'y becomes a main category' : 'ies become main categories'}.` : '');
    if (!confirmDelete(`“${c.name}”`, msg)) return;
    await api.del(`/v1/admin/categories/${c.id}`).catch((e: Error) => alert(e.message));
    await Promise.all([categories.reload(), items.reload()]);
  }

  return (
    <>
      <div className="lt-bar cp-tools">
        {tools}
        <div className="wrap" style={{ marginLeft: 'auto' }}>
          {global
            ? ok('catalog.view') && <Link className="btn sec sm" href="/admin/categories"><Icon name="layers" /> Categories</Link>
            : ok('menu.add') && (
              <button className="btn sec sm" onClick={() => router.push(`/admin/products/category/new?cafe=${cafe.id}&${backQ}`)}>
                <Icon name="plus" /> Category
              </button>
            )}
          {(ok('menu.add') || ok('menu.edit') || ok('menu.price')) && (
            <button className="btn sec sm" onClick={() => setImporting(true)}><Icon name="upload" /> Import Excel</button>
          )}
          {ok('menu.add') && (
            <button className="btn sm"
              onClick={() => router.push(`/admin/products/new?cafe=${cafe.id}${picked ? `&${global ? 'catalog' : 'category'}=${picked}` : ''}&sort=${(items.data?.length ?? 0) + 1}&${backQ}`)}>
              <Icon name="plus" /> Add product
            </button>
          )}
        </div>
      </div>
      {importing && <ImportExcel cafe={cafe} onClose={() => setImporting(false)} onDone={() => void items.reload()} />}
      {(categories.error || items.error) && <div className="err">{categories.error || items.error}</div>}
      {view.categories && view.items && (
        <MenuManager
          key={`${cafe.id}${global ? '-global' : ''}`}
          categories={view.categories}
          items={view.items}
          coverColor={cafe.coverColor}
          onAvailable={ok('menu.soldout') ? (i, isAvailable) => void patch(i, { isAvailable }) : undefined}
          onPopular={ok('menu.edit') ? (i, isPopular) => void patch(i, { isPopular }) : undefined}
          onHidden={ok('menu.delete') ? setHidden : undefined}
          onCategoryChange={setPicked}
          categoryActions={global ? undefined : (c, isMain) => (
            <>
              {isMain && ok('menu.add') && (
                <button type="button" title="Add sub-category" aria-label={`Add sub-category in ${c.name}`}
                  onClick={() => router.push(`/admin/products/category/new?cafe=${cafe.id}&parent=${c.id}&${backQ}`)}><Icon name="plus" /></button>
              )}
              {ok('menu.edit') && <button type="button" title="Edit" aria-label={`Edit ${c.name}`} onClick={() => router.push(`/admin/products/category/${c.id}?${backQ}`)}><Icon name="edit" /></button>}
              {ok('menu.delete') && <button type="button" title="Delete" aria-label={`Delete ${c.name}`} onClick={() => removeCategory(c, isMain)}><Icon name="trash" /></button>}
            </>
          )}
          itemActions={canEditItem
            ? (i) => <button className="iconbtn" onClick={() => router.push(`/admin/products/${i.id}?${backQ}`)} aria-label={`Edit ${i.name}`}><Icon name="edit" /></button>
            : undefined}
        />
      )}
    </>
  );
}
