'use client';
import { useParams } from 'next/navigation';
import { useLoad } from '@/lib/useLoad';
import type { Category } from '@/lib/types';
import { CategoryEditor } from '../../forms';
import { WithCafe } from '../../load';

export default function EditCategoryPage() {
  const { id } = useParams<{ id: string }>();
  const cat = useLoad<Category & { cafeId: string }>(`/v1/admin/categories/${id}`);
  if (cat.error) return <main className="page"><div className="err">{cat.error}</div></main>;
  if (!cat.data) return null;
  return <WithCafe cafeId={cat.data.cafeId}>{(cafe, categories) => <CategoryEditor key={cat.data!.id} draft={cat.data!} cafe={cafe} categories={categories} />}</WithCafe>;
}
