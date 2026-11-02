import type { Category, MenuItem } from './types';

export type CatNode = Category & { subs: Category[] };

/** Main categories (sorted) with their sub-categories. A sub whose parent is missing is shown as a main one. */
export function categoryTree(categories: Category[]): CatNode[] {
  const byOrder = (a: Category, b: Category) => a.sort - b.sort || a.name.localeCompare(b.name);
  const ids = new Set(categories.map((c) => c.id));
  const mains = categories.filter((c) => !c.parentId || !ids.has(c.parentId)).sort(byOrder);
  return mains.map((m) => ({ ...m, subs: categories.filter((c) => c.parentId === m.id).sort(byOrder) }));
}

/** "Snacks › Burgers" for a sub-category, "Snacks" for a main one. */
export function categoryPath(categories: Category[], id: string | null): string {
  const cat = categories.find((c) => c.id === id);
  if (!cat) return 'No category';
  const parent = cat.parentId ? categories.find((c) => c.id === cat.parentId) : undefined;
  return parent ? `${parent.name} › ${cat.name}` : cat.name;
}

/** Category ids in menu order (main, then its subs), for sorting items the way customers see them. */
export function categoryOrder(tree: CatNode[]): Map<string, number> {
  const order = new Map<string, number>();
  for (const m of tree) {
    order.set(m.id, order.size);
    for (const s of m.subs) order.set(s.id, order.size);
  }
  return order;
}

/** Items in a category, including its sub-categories. */
export function itemsIn(items: MenuItem[], tree: CatNode[], id: string): MenuItem[] {
  const main = tree.find((m) => m.id === id);
  const ids = new Set([id, ...(main?.subs.map((s) => s.id) ?? [])]);
  return items.filter((i) => i.categoryId && ids.has(i.categoryId));
}
