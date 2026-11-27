'use client';
import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useLoad } from '@/lib/useLoad';
import type { Category } from '@/lib/types';
import { CategoryEditor } from '../../forms';
import { WithCafe } from '../../load';
import { safeBack } from '../../CafeProducts';

function EditCategory() {
  const { id } = useParams<{ id: string }>();
  const back = safeBack(useSearchParams().get('back'));
  const cat = useLoad<Category & { cafeId: string }>(`/v1/admin/categories/${id}`);
  if (cat.error) return <main className="page"><div className="err">{cat.error}</div></main>;
  if (!cat.data) return null;
  return <WithCafe cafeId={cat.data.cafeId}>{(cafe, categories) => <CategoryEditor key={cat.data!.id} draft={cat.data!} cafe={cafe} categories={categories} back={back} />}</WithCafe>;
}

export default function EditCategoryPage() {
  return <Suspense><EditCategory /></Suspense>;
}
