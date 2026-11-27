import { API_URL, DEV_AUTH } from './config';

// Staff login only talks to the TowerBites API (email + password → our own session token).
// Nothing here talks to the database directly. Dev mode: any password, token `dev:<email>`.
const DEV_KEY = 'tb.devToken';
const SESSION_KEY = 'tb.crm.session';
const API = API_URL.replace(/\/$/, '');

type Session = { token: string; expiresAt: string };

/**
 * Admins need a second step after the password: a code from their authenticator app (`code`), or on their first
 * login, scanning a new QR code first (`setup`). Cafe logins are signed in straight away (`done`).
 */
export type SignInStep =
  | { step: 'done' }
  | { step: 'code'; challenge: string; expiresAt: string }
  | { step: 'setup'; challenge: string; expiresAt: string; secret: string; otpauthUrl: string; email: string };

export async function signIn(email: string, password: string): Promise<SignInStep> {
  if (DEV_AUTH) {
    localStorage.setItem(DEV_KEY, `dev:${email.trim().toLowerCase()}`);
    return { step: 'done' };
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
  if (data?.twoFactor === 'code') return { step: 'code', challenge: data.challenge, expiresAt: data.expiresAt };
  if (data?.twoFactor === 'setup') {
    return { step: 'setup', challenge: data.challenge, expiresAt: data.expiresAt, secret: data.secret, otpauthUrl: data.otpauthUrl, email: data.email };
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token: data.token, expiresAt: data.expiresAt } satisfies Session));
  return { step: 'done' };
}

/**
 * Admin login, step 2: the code from the authenticator app (or a backup code). Saves the login.
 * After a first-time setup the answer carries the backup codes, shown once.
 */
export async function finishTwoFactor(challenge: string, code: string): Promise<{ backupCodes: string[] | null; usedBackup: boolean; backupCodesLeft: number }> {
  let res: Response;
  try {
    res = await fetch(`${API}/v1/auth/staff/2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge, code: code.trim() }),
      cache: 'no-store',
    });
  } catch {
    throw new Error(`Can't reach the TowerBites server. Check your internet and try again.`);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.error ?? 'Could not check the code') as Error & { expired?: boolean };
    err.expired = /expired|log in again|password again/i.test(err.message);
    throw err;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token: data.token, expiresAt: data.expiresAt } satisfies Session));
  return { backupCodes: data.backupCodes ?? null, usedBackup: !!data.usedBackup, backupCodesLeft: data.backupCodesLeft ?? 0 };
}

export async function getToken(): Promise<string | null> {
  try {
    if (DEV_AUTH) return localStorage.getItem(DEV_KEY);
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    // The server decides when a login ends (it extends it while used); a 401 sends us back to the login page.
    const s = JSON.parse(raw) as Session;
    if (s.token) return s.token;
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
