'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from './Icon';

export type NavItem = { href: string; label: string; icon: IconName; badge?: number | null; onClick?: () => void };

/**
 * Dark left sidebar. On phones it becomes a slim top bar (name, `quick` controls, menu button) and the
 * sections, settings and today's numbers open in a full-screen menu.
 */
export function Sidebar({ brand, nav, quick, children, footer }: {
  brand: ReactNode; nav: NavItem[]; quick?: ReactNode; children?: ReactNode; footer: ReactNode;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  // The page behind the open menu must not scroll.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => void (document.body.style.overflow = '');
  }, [open]);
  const badge = nav.reduce((n, x) => n + (x.badge ?? 0), 0);

  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <div className="side-top">
        <div className="side-brand">{brand}</div>
        {quick && <div className="side-quick">{quick}</div>}
        <button type="button" className="side-burger" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Close menu' : 'Menu'}>
          <Icon name={open ? 'x' : 'menu'} size={22} />
          {!open && badge > 0 && <span className="side-burger-badge">{badge}</span>}
        </button>
      </div>
      <div className="side-body">
        <nav className="side-nav" aria-label="Main">
          {nav.map((n) => {
            const on = path === n.href;
            return (
              <Link key={n.href + n.label} href={n.href} onClick={() => (n.onClick?.(), setOpen(false))} className={on ? 'on' : undefined} aria-current={on ? 'page' : undefined}>
                <Icon name={n.icon} size={20} />
                <span className="side-label">{n.label}</span>
                {n.badge ? <span className="side-badge">{n.badge}</span> : null}
              </Link>
            );
          })}
        </nav>
        {children}
        <div className="side-foot">{footer}</div>
      </div>
    </aside>
  );
}
