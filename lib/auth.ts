import { API_URL, DEV_AUTH } from './config';

// Staff login only talks to the TowerBites API (email + password → our own session token).
// Nothing here knows about Supabase. Dev mode: any password, token `dev:<email>`.
const DEV_KEY = 'tb.devToken';
const SESSION_KEY = 'tb.crm.session';
const API = API_URL.replace(/\/$/, '');

type Session = { token: string; expiresAt: string };

export async function signIn(email: string, password: string): Promise<void> {
  if (DEV_AUTH) {
    localStorage.setItem(DEV_KEY, `dev:${email.trim().toLowerCase()}`);
    return;
  }
  let res: Response;
  try {
    res = await fetch(`${API}/v1/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
      cache: 'no-store',
    });
  } catch {
    throw new Error(`Can't reach the TowerBites server. Check your internet and try again.`);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? 'Could not log in');
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token: data.token, expiresAt: data.expiresAt } satisfies Session));
}

export async function getToken(): Promise<string | null> {
  try {
    if (DEV_AUTH) return localStorage.getItem(DEV_KEY);
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (new Date(s.expiresAt).getTime() > Date.now()) return s.token;
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage blocked or corrupted: logged out */
  }
  return null;
}

export async function signOut(): Promise<void> {
  if (DEV_AUTH) return void localStorage.removeItem(DEV_KEY);
  const token = await getToken();
  localStorage.removeItem(SESSION_KEY);
  if (token) await fetch(`${API}/v1/auth/session`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
}
