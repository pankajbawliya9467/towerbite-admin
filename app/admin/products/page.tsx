'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useLoad } from '@/lib/useLoad';
import type { Cafe, Category, MenuItem } from '@/lib/types';
import { adminCafe } from '@/components/CafeContext';
import { PageHead } from '@/components/PageHead';
import { MenuManager } from '@/components/MenuManager';
import { Icon } from '@/components/Icon';
import { CategoryForm, ItemForm } from './forms';

export default function ProductsPage() {
  const cafes = useLoad<Cafe[]>('/v1/admin/cafes');
  const [cafeId, setCafeId] = useState('');
  const categories = useLoad<Category[]>(cafeId ? `/v1/admin/categories?cafeId=${cafeId}` : null);
  const items = useLoad<MenuItem[]>(cafeId ? `/v1/admin/menu-items?cafeId=${cafeId}` : null);
  const [category, setCategory] = useState<Partial<Category> | null>(null);
  const [item, setItem] = useState<Partial<MenuItem> | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const cafe = cafes.data?.find((c) => c.id === cafeId);

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

  async function removeCategory(c: Category, isMain: boolean) {
    const subs = categories.data?.filter((x) => x.parentId === c.id).length ?? 0;
    const msg = `Delete “${c.name}”? Its products stay on the menu without a category.`
      + (isMain && subs ? ` Its ${subs} sub-categor${subs === 1 ? 'y becomes a main category' : 'ies become main categories'}.` : '');
    if (!confirm(msg)) return;
    await api.del(`/v1/admin/categories/${c.id}`).catch((e: Error) => alert(e.message));
    await Promise.all([categories.reload(), items.reload()]);
  }

  const nextSort = (parentId: string | null) => (categories.data?.filter((x) => (x.parentId ?? null) === parentId).length ?? 0) + 1;

  return (
    <main className="page">
      <PageHead title="Products" sub="Categories, sub-categories and products for each cafe.">
        <select className="field" value={cafeId} onChange={(e) => pickCafe(e.target.value)} style={{ width: 240, height: 42, fontSize: 15 }} aria-label="Cafe">
          {cafes.data?.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
        <button className="btn sec sm" disabled={!cafe} onClick={() => setCategory({ cafeId, parentId: null, sort: nextSort(null) })}>
          <Icon name="plus" /> Category
        </button>
        <button className="btn sm" disabled={!cafe} onClick={() => setItem({ cafeId, categoryId: picked ?? undefined, sort: (items.data?.length ?? 0) + 1 })}>
          <Icon name="plus" /> Product
        </button>
      </PageHead>
      {(categories.error || items.error) && <div className="err">{categories.error || items.error}</div>}
      {cafe && categories.data && items.data && (
        <MenuManager
          key={cafe.id}
          categories={categories.data}
          items={items.data}
          coverColor={cafe.coverColor}
          onAvailable={setAvailable}
          onCategoryChange={setPicked}
          categoryActions={(c, isMain) => (
            <>
              {isMain && (
                <button type="button" title="Add sub-category" aria-label={`Add sub-category in ${c.name}`}
                  onClick={() => setCategory({ cafeId, parentId: c.id, sort: nextSort(c.id) })}><Icon name="plus" /></button>
              )}
              <button type="button" title="Edit" aria-label={`Edit ${c.name}`} onClick={() => setCategory(c)}><Icon name="edit" /></button>
              <button type="button" title="Delete" aria-label={`Delete ${c.name}`} onClick={() => removeCategory(c, isMain)}><Icon name="trash" /></button>
            </>
          )}
          itemActions={(i) => <button className="iconbtn" onClick={() => setItem(i)} aria-label={`Edit ${i.name}`}><Icon name="edit" /></button>}
        />
      )}
      {category && categories.data && (
        <CategoryForm draft={category} categories={categories.data} onClose={() => setCategory(null)} onSaved={categories.reload} />
      )}
      {item && cafe && categories.data && (
        <ItemForm draft={item} cafe={cafe} categories={categories.data} onClose={() => setItem(null)} onSaved={items.reload} />
      )}
    </main>
  );
}
