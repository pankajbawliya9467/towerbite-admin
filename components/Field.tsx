import type { ReactNode } from 'react';

export function Field({ label, full, children }: { label: string; full?: boolean; children: ReactNode }) {
  return (
    <div className={full ? 'full' : undefined}>
      <span className="label">{label}</span>
      {children}
    </div>
  );
}
