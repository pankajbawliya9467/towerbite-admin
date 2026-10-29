'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import type { Cafe, Category, MenuItem } from '@/lib/types';
import { FormModal } from '@/components/FormModal';
import { Field } from '@/components/Field';
import { SwitchRow } from '@/components/Switch';
import { ImageField } from '@/components/ImageField';

export function CategoryForm({ draft, onClose, onSaved }: {
  draft: Partial<Category>; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(draft.name ?? '');
  const [sort, setSort] = useState(draft.sort ?? 0);

  async function save() {
    if (draft.id) await api.patch(`/v1/admin/categories/${draft.id}`, { name, sort });
    else await api.post('/v1/admin/categories', { cafeId: draft.cafeId, name, sort });
    await onSaved();
  }

  return (
    <FormModal title={draft.id ? 'Edit category' : 'New category'} onClose={onClose} onSubmit={save}>
      <Field label="Name" full><input className="field" required autoFocus value={name} placeholder="Hot drinks" onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Order on the menu" full><input className="field" type="number" value={sort} onChange={(e) => setSort(Number(e.target.value))} /></Field>
    </FormModal>
  );
}

export function ItemForm({ draft, cafe, categories, onClose, onSaved }: {
  draft: Partial<MenuItem>; cafe: Cafe; categories: Category[]; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [d, setD] = useState({
    name: '', description: '', price: 0, isVeg: true, emoji: '🍽️', imageUrl: null as string | null, isAvailable: true,
    isPopular: false, sort: 0, categoryId: categories[0]?.id ?? null, ...draft,
  });
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));

  async function save() {
    const body = {
      categoryId: d.categoryId || null, name: d.name, description: d.description, price: Number(d.price), isVeg: d.isVeg,
      emoji: d.emoji, imageUrl: d.imageUrl, isAvailable: d.isAvailable, isPopular: d.isPopular, sort: Number(d.sort),
    };
    if (d.id) await api.patch(`/v1/admin/menu-items/${d.id}`, body);
    else await api.post('/v1/admin/menu-items', { ...body, cafeId: cafe.id });
    await onSaved();
  }

  async function remove() {
    if (!d.id || !confirm(`Delete ${d.name}?`)) return;
    await api.del(`/v1/admin/menu-items/${d.id}`).catch((e: Error) => alert(e.message));
    await onSaved();
    onClose();
  }

  return (
    <FormModal title={d.id ? `Edit ${draft.name}` : 'New menu item'} wide onClose={onClose} onSubmit={save}>
      <Field label="Name"><input className="field" required value={d.name} placeholder="Masala Chai" onChange={(e) => set('name', e.target.value)} /></Field>
      <Field label="Price (₹)"><input className="field" type="number" min={0} required value={d.price} onChange={(e) => set('price', Number(e.target.value))} /></Field>
      <Field label="Description" full>
        <input className="field" value={d.description} maxLength={160} placeholder="Ginger, cardamom, brewed fresh" onChange={(e) => set('description', e.target.value)} />
      </Field>
      <Field label="Category">
        <select className="field" value={d.categoryId ?? ''} onChange={(e) => set('categoryId', e.target.value || null)}>
          <option value="">No category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Order in category"><input className="field" type="number" value={d.sort} onChange={(e) => set('sort', Number(e.target.value))} /></Field>
      <Field label="Emoji"><input className="field" style={{ fontSize: 22 }} value={d.emoji} maxLength={8} onChange={(e) => set('emoji', e.target.value)} /></Field>
      <Field label="Photo">
        <ImageField value={d.imageUrl} onChange={(url) => set('imageUrl', url)} folder="menu" emoji={d.emoji} color={cafe.coverColor} />
      </Field>
      <SwitchRow label="Vegetarian" on={d.isVeg} onChange={(v) => set('isVeg', v)} />
      <SwitchRow label="Popular" on={d.isPopular} onChange={(v) => set('isPopular', v)} />
      <SwitchRow label="In stock" on={d.isAvailable} onChange={(v) => set('isAvailable', v)} />
      {d.id && (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button type="button" className="link" style={{ color: 'var(--red)' }} onClick={remove}>Delete this item</button>
        </div>
      )}
    </FormModal>
  );
}
