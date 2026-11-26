'use client';
import { can } from '@/lib/perms';
import type { Permission } from '@/lib/types';
import { useSession } from './Session';

/** `ok('menu.edit')` → may the signed-in admin do this? Cafe logins (not admins) get false. */
export function useCan() {
  const { state } = useSession();
  const staff = state.status === 'ready' ? state.me.staff : null;
  return (p: Permission) => can(staff, p);
}
