'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CategoryEditor } from '../../forms';
import { WithCafe } from '../../load';

function NewCategory() {
  const sp = useSearchParams();
  const parent = sp.get('parent');
  return (
    <WithCafe cafeId={sp.get('cafe')}>
      {(cafe, categories) => {
        const parentId = categories.some((c) => c.id === parent && !c.parentId) ? parent : null;
        const sort = categories.filter((c) => (c.parentId ?? null) === parentId).length + 1;
        return <CategoryEditor cafe={cafe} categories={categories} draft={{ cafeId: cafe.id, parentId, sort }} />;
      }}
    </WithCafe>
  );
}
export default function NewCategoryPage() {
  return <Suspense><NewCategory /></Suspense>;
}
