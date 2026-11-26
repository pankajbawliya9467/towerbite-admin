'use client';
import { useParams } from 'next/navigation';
import { useLoad } from '@/lib/useLoad';
import type { MenuItem } from '@/lib/types';
import { ItemEditor } from '../forms';
import { WithCafe } from '../load';

export default function EditItemPage() {
  const { id } = useParams<{ id: string }>();
  const item = useLoad<MenuItem>(`/v1/admin/menu-items/${id}`);
  if (item.error) return <main className="page"><div className="err">{item.error}</div></main>;
  if (!item.data) return null;
  return <WithCafe cafeId={item.data.cafeId}>{(cafe, categories) => <ItemEditor key={item.data!.id} draft={item.data!} cafe={cafe} categories={categories} />}</WithCafe>;
}
