'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { confirmDelete } from '@/lib/confirm';
import { api } from '@/lib/api';
import { useLoad } from '@/lib/useLoad';
import type { Cafe, Category, MenuItem } from '@/lib/types';
import { adminCafe } from '@/components/CafeContext';
import { PageHead } from '@/components/PageHead';
import { MenuManager } from '@/components/MenuManager';
import { Icon } from '@/components/Icon';
import { useCan } from '@/components/useCan';

export default function ProductsPage() {
  const cafes = useLoad<Cafe[]>('/v1/admin/cafes');
  const [cafeId, setCafeId] = useState('');
  const categories = useLoad<Category[]>(cafeId ? `/v1/admin/categories?cafeId=${cafeId}` : null);
  const items = useLoad<MenuItem[]>(cafeId ? `/v1/admin/menu-items?cafeId=${cafeId}` : null);
  const router = useRouter();
  const [picked, setPicked] = useState<string | null>(null);
  const cafe = cafes.data?.find((c) => c.id === cafeId);
  const ok = useCan();
  const canEditItem = ok('menu.edit') || ok('menu.price') || ok('menu.soldout');

  useEffect(() => {
    if (!cafes.data?.length || cafeId) return;
    const saved = adminCafe.get();
    setCafeId(cafes.data.some((c) => c.id === saved) ? saved! : cafes.data[0].id);
  }, [cafes.data, cafeId]);

  function pickCafe(id: string) {
    adminCafe.set(id);
    setCafeId(id);
  }

  async function setAvailable(i: MenuItem, isAvailable: boolean) {
    await api.patch(`/v1/admin/menu-items/${i.id}`, { isAvailable }).catch((e: Error) => alert(e.message));
    await items.reload();
  }
  async function setPopular(i: MenuItem, isPopular: boolean) {
    await api.patch(`/v1/admin/menu-items/${i.id}`, { isPopular }).catch((e: Error) => alert(e.message));
    await items.reload();
  }
  async function setHidden(i: MenuItem, hide: boolean) {
    if (hide && !confirm(`Hide ${i.name} from customers?\n\nIt disappears from the app and website until it is shown again. Nothing is deleted.`)) return;
    await api.patch(`/v1/admin/menu-items/${i.id}`, { isActive: !hide }).catch((e: Error) => alert(e.message));
    await items.reload();
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
    <main className="page">
      <PageHead title="Products" sub="Categories, sub-categories and products for each cafe.">
        <select className="field" value={cafeId} onChange={(e) => pickCafe(e.target.value)} style={{ width: 240, height: 42, fontSize: 15 }} aria-label="Cafe">
          {cafes.data?.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
        {ok('menu.add') && <button className="btn sec sm" disabled={!cafe} onClick={() => router.push(`/admin/products/category/new?cafe=${cafeId}`)}>
          <Icon name="plus" /> Category
        </button>}
        {ok('menu.add') && <button className="btn sm" disabled={!cafe} onClick={() => router.push(`/admin/products/new?cafe=${cafeId}${picked ? `&category=${picked}` : ''}&sort=${(items.data?.length ?? 0) + 1}`)}>
          <Icon name="plus" /> Product
        </button>}
      </PageHead>
      {(categories.error || items.error) && <div className="err">{categories.error || items.error}</div>}
      {cafe && categories.data && items.data && (
        <MenuManager
          key={cafe.id}
          categories={categories.data}
          items={items.data}
          coverColor={cafe.coverColor}
          onAvailable={ok('menu.soldout') ? setAvailable : undefined}
          onPopular={ok('menu.edit') ? setPopular : undefined}
          onHidden={ok('menu.delete') ? setHidden : undefined}
          onCategoryChange={setPicked}
          categoryActions={(c, isMain) => (
            <>
              {isMain && ok('menu.add') && (
                <button type="button" title="Add sub-category" aria-label={`Add sub-category in ${c.name}`}
                  onClick={() => router.push(`/admin/products/category/new?cafe=${cafeId}&parent=${c.id}`)}><Icon name="plus" /></button>
              )}
              {ok('menu.edit') && <button type="button" title="Edit" aria-label={`Edit ${c.name}`} onClick={() => router.push(`/admin/products/category/${c.id}`)}><Icon name="edit" /></button>}
              {ok('menu.delete') && <button type="button" title="Delete" aria-label={`Delete ${c.name}`} onClick={() => removeCategory(c, isMain)}><Icon name="trash" /></button>}
            </>
          )}
          itemActions={canEditItem ? (i) => <button className="iconbtn" onClick={() => router.push(`/admin/products/${i.id}`)} aria-label={`Edit ${i.name}`}><Icon name="edit" /></button> : undefined}
        />
      )}
    </main>
  );
}
