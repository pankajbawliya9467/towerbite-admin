'use client';
import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useLoad } from '@/lib/useLoad';
import type { Cafe, Location } from '@/lib/types';
import { CafeEditor } from '../CafeForm';

function EditCafe() {
  const { id } = useParams<{ id: string }>();
  const tab = useSearchParams().get('tab');
  const cafe = useLoad<Cafe>(`/v1/admin/cafes/${id}`);
  const locations = useLoad<Location[]>('/v1/admin/locations');
  const error = cafe.error || locations.error;
  if (error) return <main className="page"><div className="err">{error}</div></main>;
  if (!cafe.data || !locations.data) return null;
  return <CafeEditor key={cafe.data.id} draft={cafe.data} locations={locations.data}
    startTab={tab === 'login' ? tab : undefined} />;
}

export default function EditCafePage() {
  return <Suspense><EditCafe /></Suspense>;
}
