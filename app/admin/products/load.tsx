'use client';
import type { ReactNode } from 'react';
import { useLoad } from '@/lib/useLoad';
import type { Cafe, Category } from '@/lib/types';

/** Loads a cafe and its categories, then renders `children` (shared by the product / category pages). */
export function WithCafe({ cafeId, children }: { cafeId: string | null | undefined; children: (cafe: Cafe, categories: Category[]) => ReactNode }) {
  const cafe = useLoad<Cafe>(cafeId ? `/v1/admin/cafes/${cafeId}` : null);
  const categories = useLoad<Category[]>(cafeId ? `/v1/admin/categories?cafeId=${cafeId}` : null);
  if (!cafeId) return <main className="page"><div className="card empty">Pick a cafe on the Products page first.</div></main>;
  const error = cafe.error || categories.error;
  if (error) return <main className="page"><div className="err">{error}</div></main>;
  if (!cafe.data || !categories.data) return null;
  return <>{children(cafe.data, categories.data)}</>;
}
