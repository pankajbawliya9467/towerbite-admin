'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useLoad } from '@/lib/useLoad';
import type { Location } from '@/lib/types';
import { CafeEditor } from '../CafeForm';

function NewCafe() {
  const locations = useLoad<Location[]>('/v1/admin/locations');
  const want = useSearchParams().get('location');
  if (locations.error) return <main className="page"><div className="err">{locations.error}</div></main>;
  if (!locations.data) return null;
  if (!locations.data.length) return <main className="page"><div className="card empty">Add a location first (Locations → Add location).</div></main>;
  const locationId = locations.data.some((l) => l.id === want) ? want! : locations.data[0].id;
  return <CafeEditor draft={{ locationId }} locations={locations.data} />;
}

export default function NewCafePage() {
  return <Suspense><NewCafe /></Suspense>;
}
