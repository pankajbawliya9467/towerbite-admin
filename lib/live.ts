import { API_URL, DEV_AUTH } from './config';
import { getToken } from './auth';

/**
 * Live pings from our own API (WebSocket /v1/live): one shared socket, the API only lets a cafe's staff
 * (or a super admin) listen to `cafe:<id>`. Pages also poll, so nothing is missed if the socket drops.
 */
const URL = `${API_URL.replace(/\/$/, '').replace(/^http/, 'ws')}/v1/live`;

type Handler = { event: string; cb: () => void };
const handlers = new Map<string, Set<Handler>>();
let ws: WebSocket | null = null;
let ready = false;
let retryMs = 1000;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

const sendSub = (type: 'sub' | 'unsub', topic: string) => ready && ws?.readyState === 1 && ws.send(JSON.stringify({ type, topic }));

async function connect() {
  if (DEV_AUTH || ws || !handlers.size || typeof window === 'undefined') return;
  const token = await getToken();
  if (!token || ws || !handlers.size) return;
  const sock = new WebSocket(URL);
  ws = sock;
  ready = false;
  sock.onopen = () => sock.send(JSON.stringify({ type: 'auth', token }));
  sock.onmessage = (e) => {
    let msg: { type?: string; topic?: string; event?: string };
    try {
      msg = JSON.parse(String(e.data));
    } catch {
      return;
    }
    if (msg.type === 'ready') {
      ready = true;
      retryMs = 1000;
      for (const topic of handlers.keys()) sendSub('sub', topic);
      return;
    }
    if (msg.topic) for (const h of handlers.get(msg.topic) ?? []) if (h.event === msg.event) h.cb();
  };
  sock.onclose = (e) => {
    if (ws !== sock) return;
    ws = null;
    ready = false;
    // 4001 = login not accepted: wait for the next page that subscribes instead of retrying.
    if (e.code !== 4001 && handlers.size) {
      retryTimer = setTimeout(() => void connect(), retryMs);
      retryMs = Math.min(retryMs * 2, 30_000);
    }
  };
  sock.onerror = () => sock.close();
}

/** Closes the socket (log out). */
export function resetLive() {
  if (retryTimer) clearTimeout(retryTimer);
  const sock = ws;
  ws = null;
  ready = false;
  sock?.close();
}

function onLive(topic: string, event: string, cb: () => void): () => void {
  const h = { event, cb };
  let set = handlers.get(topic);
  if (!set) {
    set = new Set();
    handlers.set(topic, set);
    sendSub('sub', topic);
  }
  set.add(h);
  void connect();
  return () => {
    set.delete(h);
    if (!set.size) {
      handlers.delete(topic);
      sendSub('unsub', topic);
    }
  };
}

/** `order` (or `lunch`) pings for one cafe. Returns the unsubscribe function. */
export function onCafeOrders(cafeId: string, cb: () => void, event: 'order' | 'lunch' = 'order'): () => void {
  return onLive(`cafe:${cafeId}`, event, cb);
}
