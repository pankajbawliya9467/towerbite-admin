'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { confirmDelete } from '@/lib/confirm';
import { api } from '@/lib/api';
import type { Cafe, CatalogList, Category, MenuItem } from '@/lib/types';
import { useLoad } from '@/lib/useLoad';
import { FormCard, FormPage } from '@/components/FormPage';
import { Field } from '@/components/Field';
import { SwitchRow } from '@/components/Switch';
import { ImageField } from '@/components/ImageField';
import { useCan } from '@/components/useCan';
import { categoryTree } from '@/lib/menuTree';

const BACK = '/admin/products';

/** New / edit category on its own page (a sub-category sits inside one main category). */
export function CategoryEditor({ draft, cafe, categories }: { draft: Partial<Category>; cafe: Cafe; categories: Category[] }) {
  const router = useRouter();
  const [name, setName] = useState(draft.name ?? '');
  const [sort, setSort] = useState(draft.sort ?? 0);
  const [parentId, setParentId] = useState<string>(draft.parentId ?? '');
  // Only one level: a parent must be a main category, and a category with subs stays a main one.
  const mains = categories.filter((c) => !c.parentId && c.id !== draft.id);
  const hasSubs = !!draft.id && categories.some((c) => c.parentId === draft.id);
  const parent = categories.find((c) => c.id === parentId);

  async function save() {
    const body = { name, sort, parentId: parentId || null };
    if (draft.id) await api.patch(`/v1/admin/categories/${draft.id}`, body);
    else await api.post('/v1/admin/categories', { cafeId: cafe.id, ...body });
    router.push(BACK);
  }

  const title = draft.id ? draft.name ?? 'Category' : parent ? `New sub-category in ${parent.name}` : 'New category';
  return (
    <FormPage crumbs={[{ label: 'Products', href: BACK }, { label: `${cafe.emoji} ${cafe.name}`, href: BACK }, { label: title }]}
      title={title} back={BACK} submitLabel={draft.id ? 'Save changes' : 'Create category'} onSubmit={save}>
      <FormCard title="Category">
        <Field label="Name" full>
          <input className="field" required autoFocus value={name} maxLength={40} placeholder={parent ? 'Burgers' : 'Snacks'} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Inside" full>
          <select className="field" value={parentId} disabled={hasSubs} onChange={(e) => setParentId(e.target.value)}>
            <option value="">— Main category (shows as a tab) —</option>
            {mains.map((c) => <option key={c.id} value={c.id}>Sub-category of {c.name}</option>)}
          </select>
          {hasSubs && <div className="small" style={{ marginTop: 6 }}>This category has sub-categories, so it stays a main category.</div>}
        </Field>
        <Field label={parentId ? 'Order inside the category' : 'Order on the menu'} full>
          <input className="field" type="number" value={sort} onChange={(e) => setSort(Number(e.target.value))} />
        </Field>
      </FormCard>
    </FormPage>
  );
}

/** New / edit product on its own page. Each part needs its tick (name, price, stock, hide). */
export function ItemEditor({ draft, cafe, categories }: { draft: Partial<MenuItem>; cafe: Cafe; categories: Category[] }) {
  const router = useRouter();
  const [d, setD] = useState({
    name: '', description: '', price: 0, isVeg: true, emoji: '🍽️', imageUrl: null as string | null, isAvailable: true,
    isPopular: false, sort: 0, isActive: true, ...draft, categoryId: draft.categoryId ?? (draft.id ? null : categories[0]?.id ?? null),
  });
  const tree = categoryTree(categories);
  // Global categories (Admin → Categories). Once menus use them, every product needs one.
  const catalog = useLoad<CatalogList>('/v1/admin/catalog');
  const global = !!catalog.data?.enabled;
  const [catalogId, setCatalogId] = useState<string>(draft.catalogCategoryId ?? '');
  const order = (a: { sort: number; name: string }, b: { sort: number; name: string }) => a.sort - b.sort || a.name.localeCompare(b.name);
  const usable = (catalog.data?.categories ?? []).filter((c) => c.isActive || c.id === draft.catalogCategoryId);
  const leafGroups = usable.filter((c) => !c.parentId).sort(order).map((m) => ({ main: m, subs: usable.filter((c) => c.parentId === m.id).sort(order) }));
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));
  const ok = useCan();
  const isNew = !d.id;
  const edit = isNew ? ok('menu.add') : ok('menu.edit');
  const price = isNew ? ok('menu.add') : ok('menu.price');
  const stock = isNew ? ok('menu.add') : ok('menu.soldout');
  const hide = isNew ? ok('menu.add') : ok('menu.delete');

  async function save() {
    const body = {
      categoryId: d.categoryId || null, name: d.name, description: d.description, price: Number(d.price), isVeg: d.isVeg,
      emoji: d.emoji, imageUrl: d.imageUrl, isAvailable: d.isAvailable, isPopular: d.isPopular, sort: Number(d.sort),
      isActive: d.isActive !== false,
      catalogCategoryId: catalogId || null,
    };
    if (d.id) await api.patch(`/v1/admin/menu-items/${d.id}`, body);
    else await api.post('/v1/admin/menu-items', { ...body, cafeId: cafe.id });
    router.push(BACK);
  }

  async function remove() {
    if (!d.id || !confirmDelete(d.name, 'Tip: "Hide from customers" keeps it for later instead.')) return;
    try {
      await api.del(`/v1/admin/menu-items/${d.id}`);
      router.push(BACK);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  const title = isNew ? 'New product' : draft.name ?? 'Product';
  return (
    <FormPage
      crumbs={[{ label: 'Products', href: BACK }, { label: `${cafe.emoji} ${cafe.name}`, href: BACK }, { label: title }]}
      title={title} back={BACK} submitLabel={isNew ? 'Create product' : 'Save changes'} onSubmit={save}
      actions={d.id && ok('menu.delete') ? <button type="button" className="btn sec sm" style={{ color: 'var(--red)' }} onClick={remove}>Delete</button> : null}
      side={
        <>
          <fieldset className="fs" disabled={!edit}>
            <FormCard title="Photo">
              <Field label="Emoji"><input className="field" style={{ fontSize: 22 }} value={d.emoji} maxLength={8} onChange={(e) => set('emoji', e.target.value)} /></Field>
              <Field label="Photo" full>
                <ImageField value={d.imageUrl} onChange={(url) => set('imageUrl', url)} folder="menu" emoji={d.emoji} color={cafe.coverColor} />
              </Field>
            </FormCard>
          </fieldset>
          <FormCard title="On the menu">
            <fieldset className="fs" disabled={!edit}>
              <div className="full"><SwitchRow label="Vegetarian" on={d.isVeg} onChange={(v) => set('isVeg', v)} /></div>
              <div className="full"><SwitchRow label="★ Popular" on={d.isPopular} onChange={(v) => set('isPopular', v)} /></div>
            </fieldset>
            <fieldset className="fs" disabled={!stock}>
              <div className="full"><SwitchRow label="In stock" on={d.isAvailable} onChange={(v) => set('isAvailable', v)} /></div>
            </fieldset>
            <fieldset className="fs" disabled={!hide}>
              <div className="full">
                <SwitchRow label={d.isActive !== false ? 'Shown to customers' : 'Hidden from customers'} on={d.isActive !== false}
                  onChange={(v) => set('isActive', v)} />
              </div>
            </fieldset>
          </FormCard>
        </>
      }
    >
      <FormCard title="Product">
        <fieldset className="fs" disabled={!edit}>
          <Field label="Name"><input className="field" required value={d.name} placeholder="Masala Chai" onChange={(e) => set('name', e.target.value)} /></Field>
        </fieldset>
        <fieldset className="fs" disabled={!price}>
          <Field label="Price (₹)"><input className="field" type="number" min={0} required value={d.price} onChange={(e) => set('price', Number(e.target.value))} /></Field>
        </fieldset>
        <fieldset className="fs" disabled={!edit}>
          <Field label="Description" full>
            <input className="field" value={d.description} maxLength={160} placeholder="Ginger, cardamom, brewed fresh" onChange={(e) => set('description', e.target.value)} />
          </Field>
          <Field label={global ? 'Category' : 'Category (all cafes)'}>
            <select className="field" required={global} value={catalogId} onChange={(e) => setCatalogId(e.target.value)}>
              <option value="">{global ? 'Pick a category…' : 'Not set yet'}</option>
              {leafGroups.map(({ main, subs }) => subs.length ? (
                <optgroup key={main.id} label={main.name}>
                  {subs.map((s) => <option key={s.id} value={s.id}>{s.name}{s.isActive ? '' : ' (off)'}</option>)}
                </optgroup>
              ) : <option key={main.id} value={main.id}>{main.name}{main.isActive ? '' : ' (off)'}</option>)}
            </select>
          </Field>
          {!global && (
            <Field label="Cafe's own category (until the switch is on)">
              <select className="field" value={d.categoryId ?? ''} onChange={(e) => set('categoryId', e.target.value || null)}>
                <option value="">No category</option>
                {tree.map((m) => [
                  <option key={m.id} value={m.id}>{m.name}</option>,
                  ...m.subs.map((s) => <option key={s.id} value={s.id}>{'   '}↳ {m.name} › {s.name}</option>),
                ])}
              </select>
            </Field>
          )}
          <Field label="Order in category"><input className="field" type="number" value={d.sort} onChange={(e) => set('sort', Number(e.target.value))} /></Field>
        </fieldset>
      </FormCard>
    </FormPage>
  );
}
