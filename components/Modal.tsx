'use client';
import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icon';

export function Modal({ title, onClose, wide, children }: {
  title: string; onClose: () => void; wide?: boolean; children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`card modal${wide ? ' wide' : ''}`} role="dialog" aria-label={title}>
        <div className="row" style={{ marginBottom: 22 }}>
          <div className="h2">{title}</div>
          <button className="iconbtn" style={{ border: 0 }} onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
