'use client';
import { LocationEditor, blank } from '../LocationEditor';

export default function NewLocationPage() {
  return <LocationEditor draft={blank} towers={[]} reloadTowers={async () => undefined} />;
}
