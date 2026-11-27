'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { CafeWithMenu, MenuItem } from '@/lib/types';
import { MenuManager } from '@/components/MenuManager';
import { MinOrder } from './MinOrder';

export default function CafeMenuPage() {
  const [menu, setMenu] = useState<CafeWithMenu | null>(null);

  useEffect(() => {
    api.get<CafeWithMenu>('/v1/cafe/menu').then(setMenu);
  }, []);

  /** Changes one switch at once on screen, then saves; puts it back if saving fails. */
  async function change(item: MenuItem, patch: Partial<Pick<MenuItem, 'isAvailable' | 'isPopular' | 'isActive'>>) {
    const apply = (p: typeof patch) =>
      setMenu((m) => m && { ...m, items: m.items.map((i) => (i.id === item.id ? { ...i, ...p } : i)) });
    const before = Object.fromEntries(Object.keys(patch).map((k) => [k, item[k as keyof MenuItem]]));
    apply(patch);
    await api.patch(`/v1/cafe/menu-items/${item.id}`, patch).catch((e: Error) => (apply(before), alert(e.message)));
  }
  function setHidden(item: MenuItem, hide: boolean) {
    if (hide && !confirm(`Hide ${item.name} from customers?\n\nIt disappears from the app and website until you show it again. Nothing is deleted.`)) return;
    void change(item, { isActive: !hide });
  }

  return (
    <main className="page">
      <div className="pagehead">
        <div>
          <div className="h1">Menu</div>
          <p className="sub">Switch an item off when it runs out today. ★ puts it in Popular. Hide takes it off the menu (seasonal or paused dishes) until you show it again.</p>
        </div>
      </div>
      <MinOrder />
      {menu && <MenuManager categories={menu.categories} items={menu.items} coverColor={menu.coverColor} onAvailable={(i, v) => change(i, { isAvailable: v })} onPopular={(i, v) => change(i, { isPopular: v })} onHidden={setHidden} />}
    </main>
  );
}
