'use client';
import { useParams } from 'next/navigation';
import { useLoad } from '@/lib/useLoad';
import type { Location, Tower } from '@/lib/types';
import { LocationEditor } from '../LocationEditor';

export default function EditLocationPage() {
  const { id } = useParams<{ id: string }>();
  const loc = useLoad<Location>(`/v1/admin/locations/${id}`);
  const towers = useLoad<Tower[]>(`/v1/admin/towers?locationId=${id}`);
  const error = loc.error || towers.error;
  if (error) return <main className="page"><div className="err">{error}</div></main>;
  if (!loc.data) return null;
  return <LocationEditor key={loc.data.id} draft={loc.data} towers={towers.data ?? []} reloadTowers={towers.reload} />;
}
