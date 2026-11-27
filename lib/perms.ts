import type { Permission, Staff } from './types';

type Col = 'view' | 'add' | 'edit' | 'delete';
export type SectionDef = {
  key: string; label: string; short: string;
  /** Which of the four columns exist for this section. */
  cols: Col[];
  extras: { key: string; label: string; hint?: string }[];
};

/** Same list as the API (backend/src/auth.ts CATALOG). Keys are `<section>.<action>`. */
export const SECTIONS: SectionDef[] = [
  { key: 'orders', label: 'Orders', short: 'Orders', cols: ['view'], extras: [{ key: 'phone', label: 'Customer phone' }, { key: 'csv', label: 'Download CSV' }] },
  {
    key: 'cafes', label: 'Cafes', short: 'Cafes', cols: ['view', 'add', 'edit', 'delete'],
    extras: [
      { key: 'board', label: 'Live board', hint: 'Opens the cafe panel and works as the cafe (orders, menu, lunch)' },
      { key: 'logins', label: 'Cafe logins', hint: 'Change cafe login email and password' },
      { key: 'openclose', label: 'Open / pause' },
      { key: 'order', label: 'Order in app' },
    ],
  },
  { key: 'menu', label: 'Menu & products', short: 'Menu', cols: ['view', 'add', 'edit', 'delete'], extras: [{ key: 'price', label: 'Change price' }, { key: 'soldout', label: 'Sold out on/off' }] },
  { key: 'catalog', label: 'Categories (all cafes)', short: 'Categories', cols: ['view', 'add', 'edit', 'delete'], extras: [] },
  { key: 'locations', label: 'Locations', short: 'Locations', cols: ['view', 'add', 'edit', 'delete'], extras: [{ key: 'geo', label: 'Location check (GPS)' }] },
  { key: 'users', label: 'Users', short: 'Users', cols: ['view'], extras: [{ key: 'phone', label: 'Phone numbers' }] },
  { key: 'notifications', label: 'Notifications', short: 'Notifications', cols: ['view'], extras: [{ key: 'send', label: 'Send' }] },
  { key: 'requests', label: 'Account requests', short: 'Requests', cols: ['view', 'edit'], extras: [] },
  { key: 'reports', label: 'Reports', short: 'Reports', cols: ['view'], extras: [{ key: 'money', label: 'Sales & money' }] },
  { key: 'admins', label: 'Admins', short: 'Admins', cols: ['view', 'add', 'edit', 'delete'], extras: [] },
];
export const COLS: { key: Col; label: string }[] = [
  { key: 'view', label: 'View' }, { key: 'add', label: 'Add' }, { key: 'edit', label: 'Edit' }, { key: 'delete', label: 'Delete / off' },
];

/** Every key of a section. */
export const sectionKeys = (s: SectionDef) => [...s.cols.map((c) => `${s.key}.${c}`), ...s.extras.map((e) => `${s.key}.${e.key}`)] as Permission[];
export const ALL_PERMS = SECTIONS.flatMap(sectionKeys);

/** Short text for the admins list, e.g. "view, add, edit" or "full". */
export function summary(perms: Permission[], s: SectionDef) {
  const keys = sectionKeys(s);
  const have = keys.filter((k) => perms.includes(k));
  if (!have.length) return null;
  if (have.length === keys.length) return 'full';
  if (have.length === 1) return 'view only';
  const names = [...s.cols.filter((c) => have.includes(`${s.key}.${c}` as Permission)).map((c) => c === 'delete' ? 'off' : c),
    ...s.extras.filter((e) => have.includes(`${s.key}.${e.key}` as Permission)).map((e) => e.label.toLowerCase())];
  return names.join(', ');
}

/** Same rule as the API: super admins can do everything, other admins only their ticks. */
export const can = (s: Staff | null | undefined, p: Permission) =>
  !!s && s.role === 'super_admin' && (!!s.isSuper || !!s.permissions?.includes(p));

/** Which tick each admin page needs (pages not listed are open to every admin). */
export const PAGE_PERM: Record<string, Permission> = {
  '/admin/orders': 'orders.view',
  '/admin/locations': 'locations.view',
  '/admin/cafes': 'cafes.view',
  '/admin/products': 'menu.view',
  '/admin/categories': 'catalog.view',
  '/admin/staff': 'cafes.logins',
  '/admin/users': 'users.view',
  '/admin/notifications': 'notifications.view',
  '/admin/ai': 'notifications.send',
  '/admin/reports': 'reports.view',
  '/admin/requests': 'requests.view',
  '/admin/admins': 'admins.view',
};
