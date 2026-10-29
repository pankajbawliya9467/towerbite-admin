'use client';
import { createContext, useContext } from 'react';
import type { CafeWithMenu } from '@/lib/types';

export type CafeCtx = { cafe: CafeWithMenu; setCafe: (c: CafeWithMenu) => void; isAdmin: boolean };

export const CafeContext = createContext<CafeCtx | null>(null);

export function useCafe() {
  const ctx = useContext(CafeContext);
  if (!ctx) throw new Error('useCafe outside the cafe area');
  return ctx;
}

const KEY = 'tb.cafeId';
/** The cafe a super admin is working in (picked from the admin cafes page). */
export const adminCafe = {
  get: () => localStorage.getItem(KEY),
  set: (id: string) => localStorage.setItem(KEY, id),
};
