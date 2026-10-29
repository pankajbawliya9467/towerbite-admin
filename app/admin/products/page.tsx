'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useLoad } from '@/lib/useLoad';
import type { Cafe, Category, MenuItem } from '@/lib/types';
import { adminCafe } from '@/components/CafeContext';
import { PageHead } from '@/components/PageHead';
import { MenuList } from '@/components/MenuList';
import { Icon } from '@/components/Icon';
import { CategoryForm, ItemForm } from './forms';

export default function ProductsPage() {
  const cafes = useLoad<Cafe[]>('/v1/admin/cafes');
  const [cafeId, setCafeId] = useState('');
  const categories = useLoad<Category[]>(cafeId ? `/v1/admin/categories?cafeId=${cafeId}` : null);
  const items = useLoad<MenuItem[]>(cafeId ? `/v1/admin/menu-items?cafeId=${cafeId}` : null);
  const [category, setCategory] = useState<Partial<Category> | null>(null);
  const [item, setItem] = useState<Partial<MenuItem> | null>(null);
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

  async function removeCategory(c: Category) {
    if (!confirm(`Delete the category “${c.name}”? Its items stay on the menu without a category.`)) return;
    await api.del(`/v1/admin/categories/${c.id}`).catch((e: Error) => alert(e.message));
    await Promise.all([categories.reload(), items.reload()]);
  }

  return (
    <main className="page">
      <PageHead title="Products" sub="Categories and menu items for each cafe.">
        <select className="field" value={cafeId} onChange={(e) => pickCafe(e.target.value)} style={{ width: 240, height: 42, fontSize: 15 }} aria-label="Cafe">
          {cafes.data?.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
        <button className="btn sec sm" disabled={!cafe} onClick={() => setCategory({ cafeId, sort: (categories.data?.length ?? 0) + 1 })}>
          <Icon name="plus" /> Category
        </button>
        <button className="btn sm" disabled={!cafe} onClick={() => setItem({ cafeId, sort: (items.data?.length ?? 0) + 1 })}>
          <Icon name="plus" /> Menu item
        </button>
      </PageHead>
      {(categories.error || items.error) && <div className="err">{categories.error || items.error}</div>}
      {cafe && categories.data && items.data && (
        <MenuList
          menu={{ categories: categories.data, items: items.data, coverColor: cafe.coverColor }}
          onAvailable={setAvailable}
          categoryActions={(c) => (
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="iconbtn" style={{ border: 0, background: 'none', width: 32, height: 32 }} onClick={() => setCategory(c)} aria-label="Edit category"><Icon name="edit" /></button>
              <button className="iconbtn" style={{ border: 0, background: 'none', width: 32, height: 32 }} onClick={() => removeCategory(c)} aria-label="Delete category"><Icon name="trash" /></button>
            </div>
          )}
          itemActions={(i) => <button className="iconbtn" onClick={() => setItem(i)} aria-label={`Edit ${i.name}`}><Icon name="edit" /></button>}
        />
      )}
      {category && <CategoryForm draft={category} onClose={() => setCategory(null)} onSaved={categories.reload} />}
      {item && cafe && categories.data && (
        <ItemForm draft={item} cafe={cafe} categories={categories.data} onClose={() => setItem(null)} onSaved={items.reload} />
      )}
    </main>
  );
}
