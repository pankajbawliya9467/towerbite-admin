'use client';
import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useLoad } from '@/lib/useLoad';
import type { MenuItem } from '@/lib/types';
import { ItemEditor } from '../forms';
import { WithCafe } from '../load';
import { safeBack } from '../CafeProducts';

function EditItem() {
  const { id } = useParams<{ id: string }>();
  const back = safeBack(useSearchParams().get('back'));
  const item = useLoad<MenuItem>(`/v1/admin/menu-items/${id}`);
  if (item.error) return <main className="page"><div className="err">{item.error}</div></main>;
  if (!item.data) return null;
  return <WithCafe cafeId={item.data.cafeId}>{(cafe, categories) => <ItemEditor key={item.data!.id} draft={item.data!} cafe={cafe} categories={categories} back={back} />}</WithCafe>;
}

export default function EditItemPage() {
  return <Suspense><EditItem /></Suspense>;
}
