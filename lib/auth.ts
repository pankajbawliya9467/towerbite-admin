import { DEV_AUTH } from './config';
import { supabase } from './supabase';

const DEV_KEY = 'tb.devToken';

/** Staff sign in with email + password. Dev mode: any password, token `dev:<email>`. */
export async function signIn(email: string, password: string): Promise<void> {
  if (DEV_AUTH) {
    localStorage.setItem(DEV_KEY, `dev:${email.trim().toLowerCase()}`);
    return;
  }
  const sb = supabase();
  if (!sb) throw new Error('Login is not configured yet');
  const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(error.message);
}

export async function getToken(): Promise<string | null> {
  if (DEV_AUTH) return localStorage.getItem(DEV_KEY);
  const { data } = (await supabase()?.auth.getSession()) ?? { data: { session: null } };
  return data.session?.access_token ?? null;
}

export async function signOut(): Promise<void> {
  if (DEV_AUTH) localStorage.removeItem(DEV_KEY);
  else await supabase()?.auth.signOut();
}
