'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { CafeWithMenu, MenuItem } from '@/lib/types';
import { MenuList } from '@/components/MenuList';

export default function CafeMenuPage() {
  const [menu, setMenu] = useState<CafeWithMenu | null>(null);

  useEffect(() => {
    api.get<CafeWithMenu>('/v1/cafe/menu').then(setMenu);
  }, []);

  async function setAvailable(item: MenuItem, isAvailable: boolean) {
    const update = (v: boolean) =>
      setMenu((m) => m && { ...m, items: m.items.map((i) => (i.id === item.id ? { ...i, isAvailable: v } : i)) });
    update(isAvailable);
    await api.patch(`/v1/cafe/menu-items/${item.id}`, { isAvailable }).catch(() => update(!isAvailable));
  }

  return (
    <main className="page">
      <div className="pagehead">
        <div>
          <div className="h1">Menu</div>
          <p className="sub">Switch an item off when it runs out. Customers can order it again when you switch it back on.</p>
        </div>
      </div>
      {menu && <MenuList menu={menu} onAvailable={setAvailable} />}
    </main>
  );
}
