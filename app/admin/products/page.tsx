'use client';
import { useEffect, useState } from 'react';
import { useLoad } from '@/lib/useLoad';
import type { Cafe } from '@/lib/types';
import { adminCafe } from '@/components/CafeContext';
import { PageHead } from '@/components/PageHead';
import { CafeProducts } from './CafeProducts';

/** Every cafe's products, one cafe at a time (a cafe's details page shows the same list for that cafe). */
export default function ProductsPage() {
  const cafes = useLoad<Cafe[]>('/v1/admin/cafes');
  const [cafeId, setCafeId] = useState('');
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

  return (
    <main className="page">
      <PageHead title="Products" sub="Products of each cafe. Categories are shared by every cafe (Admin → Categories)." />
      {cafes.error && <div className="err">{cafes.error}</div>}
      {cafe && (
        <CafeProducts key={cafe.id} cafe={cafe} back="/admin/products"
          tools={(
            <select className="field" value={cafeId} onChange={(e) => pickCafe(e.target.value)} style={{ width: 260, height: 44, fontSize: 15 }} aria-label="Cafe">
              {cafes.data?.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </select>
          )} />
      )}
    </main>
  );
}
