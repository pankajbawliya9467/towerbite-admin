import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

let client: SupabaseClient | null = null;

/** The Supabase client, or null when the URL/key are not configured. */
export function supabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

/**
 * Listen for `order` pings on the private channel `cafe:<id>` with the staff member's token;
 * the database only lets that cafe's staff (or a super admin) join.
 * Returns an unsubscribe function (no-op without Supabase).
 */
export function onCafeOrders(cafeId: string, cb: () => void, event: 'order' | 'lunch' = 'order'): () => void {
  const sb = supabase();
  if (!sb) return () => {};
  let channel: ReturnType<SupabaseClient['channel']> | null = null;
  let closed = false;
  (async () => {
    const { data } = await sb.auth.getSession();
    if (closed || !data.session) return; // polling still works
    await sb.realtime.setAuth();
    channel = sb.channel(`cafe:${cafeId}`, { config: { private: true } }).on('broadcast', { event }, cb).subscribe();
  })();
  return () => {
    closed = true;
    if (channel) void sb.removeChannel(channel);
  };
}
