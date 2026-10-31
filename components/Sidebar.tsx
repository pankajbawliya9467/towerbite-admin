'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from './Icon';

export type NavItem = { href: string; label: string; icon: IconName; badge?: number | null; onClick?: () => void };

/** Dark left sidebar (stacks on top on phones). */
export function Sidebar({ brand, nav, children, footer }: { brand: ReactNode; nav: NavItem[]; children?: ReactNode; footer: ReactNode }) {
  const path = usePathname();
  return (
    <aside className="sidebar">
      <div className="side-brand">{brand}</div>
      <nav className="side-nav" aria-label="Main">
        {nav.map((n) => {
          const on = path === n.href;
          return (
            <Link key={n.href + n.label} href={n.href} onClick={n.onClick} className={on ? 'on' : undefined} aria-current={on ? 'page' : undefined}>
              <Icon name={n.icon} size={20} />
              <span className="side-label">{n.label}</span>
              {n.badge ? <span className="side-badge">{n.badge}</span> : null}
            </Link>
          );
        })}
      </nav>
      {children}
      <div className="side-foot">{footer}</div>
    </aside>
  );
}
