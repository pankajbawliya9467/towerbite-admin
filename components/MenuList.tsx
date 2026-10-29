import type { ReactNode } from 'react';
import { rupees } from '@/lib/format';
import type { Category, CafeWithMenu, MenuItem } from '@/lib/types';
import { FoodTile } from './FoodTile';
import { Switch } from './Switch';

/** Menu grouped by category, with an in-stock switch per item. Admin passes extra controls. */
export function MenuList({ menu, onAvailable, categoryActions, itemActions }: {
  menu: Pick<CafeWithMenu, 'categories' | 'items' | 'coverColor'>;
  onAvailable: (item: MenuItem, on: boolean) => void;
  categoryActions?: (c: Category) => ReactNode;
  itemActions?: (i: MenuItem) => ReactNode;
}) {
  const groups: { category: Category | null; items: MenuItem[] }[] = menu.categories.map((c) => ({
    category: c,
    items: menu.items.filter((i) => i.categoryId === c.id),
  }));
  const loose = menu.items.filter((i) => !menu.categories.some((c) => c.id === i.categoryId));
  if (loose.length) groups.push({ category: null, items: loose });
  if (!groups.length) return <div className="card empty">No menu items yet.</div>;

  return (
    <div className="stack" style={{ gap: 28 }}>
      {groups.map(({ category, items }) => (
        <section key={category?.id ?? 'none'}>
          <div className="row" style={{ marginBottom: 12, minHeight: 32 }}>
            <div className="cap">{category?.name ?? 'No category'} · {items.length}</div>
            {category && categoryActions?.(category)}
          </div>
          <div className="card">
            {items.length === 0 && <div className="empty" style={{ padding: 28 }}>No items in this category.</div>}
            {items.map((item, idx) => (
              <div key={item.id} className="menurow" style={{ borderTop: idx ? '1px solid var(--line)' : 0 }}>
                <FoodTile emoji={item.emoji} imageUrl={item.imageUrl} color={menu.coverColor} />
                <div style={{ flex: 1, minWidth: 0, opacity: item.isAvailable ? 1 : 0.55 }}>
                  <div className="menuname">
                    <span className={`veg${item.isVeg ? '' : ' non'}`} style={{ marginRight: 0 }} />
                    <span className="h3">{item.name}</span>
                    {item.isPopular && <span className="badge acc">Popular</span>}
                  </div>
                  {item.description && <div className="small" style={{ marginTop: 3 }}>{item.description}</div>}
                </div>
                <div className="menuprice">{rupees(item.price)}</div>
                <div className="menustock">
                  <span className="small" style={{ color: item.isAvailable ? 'var(--green)' : 'var(--sub)', fontWeight: 600 }}>
                    {item.isAvailable ? 'In stock' : 'Out of stock'}
                  </span>
                  <Switch on={item.isAvailable} onChange={(on) => onAvailable(item, on)} label={`${item.name} in stock`} />
                </div>
                {itemActions?.(item)}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
