import type { Address, OrderStatus } from './types';

export const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export function timeAgo(iso: string, now: number) {
  const min = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

export const clock = (d: Date) =>
  d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s?[ap]m$/i, '');

export const timeOfDay = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** Today's date in IST as YYYY-MM-DD (the API's day boundary). */
export const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

function floorLabel(floor: string) {
  const f = floor.trim();
  const n = f.match(/^(\d+)(st|nd|rd|th)?(\s*floor)?$/i);
  return n ? `Floor ${n[1]}` : f;
}

/** "Tower B · Floor 7 · Desk 7B-14" (or the company instead of the desk). */
export function addressLine(a: Address, last: 'desk' | 'company' = 'desk') {
  const desk = a.desk.trim();
  const tail = last === 'company' ? a.company : desk && !/\s/.test(desk) ? `Desk ${desk}` : desk;
  return [a.tower, floorLabel(a.floor), tail].filter((s) => s && s.trim()).join(' · ');
}

export const STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  placed: { label: 'New', cls: 'warn' },
  preparing: { label: 'Preparing', cls: 'acc' },
  out_for_delivery: { label: 'Out for delivery', cls: 'ok' },
  delivered: { label: 'Delivered', cls: 'ok' },
  rejected: { label: 'Rejected', cls: 'no' },
  cancelled: { label: 'Cancelled', cls: 'mute' },
};

export const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
