'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ItemEditor } from '../forms';
import { WithCafe } from '../load';

function NewItem() {
  const sp = useSearchParams();
  const category = sp.get('category');
  return (
    <WithCafe cafeId={sp.get('cafe')}>
      {(cafe, categories) => <ItemEditor cafe={cafe} categories={categories}
        draft={{ cafeId: cafe.id, categoryId: categories.some((c) => c.id === category) ? category! : undefined, catalogCategoryId: sp.get('catalog'), sort: Number(sp.get('sort')) || 0 }} />}
    </WithCafe>
  );
}
export default function NewItemPage() {
  return <Suspense><NewItem /></Suspense>;
}
