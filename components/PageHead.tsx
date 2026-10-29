import type { ReactNode } from 'react';

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="pagehead">
      <div>
        <div className="h1">{title}</div>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {children && <div className="pagehead-actions">{children}</div>}
    </div>
  );
}
