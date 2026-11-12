// BF_PORTAL_v949_INBOX_LIMIT - inbox list requests go through one small queue.
// The server speaks HTTP/1.1, so the browser allows only six requests to it at a time. "All Mailboxes" asked for every
// mailbox at once, three times over (first load, the 20-second refresh, the unread counts). When Microsoft was slow
// those requests filled all six slots and every other screen in the portal sat on "Loading...".
// Now: at most two inbox list requests are in flight, and a request identical to one already in flight shares its answer.
const MAX_IN_FLIGHT = 2;
const inFlight = new Map<string, Promise<unknown>>();
const waiters: Array<() => void> = [];
let active = 0;

const keyOf = (params: Record<string, unknown>): string => JSON.stringify(Object.keys(params).sort().map((k) => [k, params[k]]));

export function limitedInboxList<T>(params: Record<string, unknown>, load: () => Promise<T>): Promise<T> {
  const key = keyOf(params);
  const hit = inFlight.get(key);
  if (hit) return hit as Promise<T>;
  const p = (async () => {
    if (active >= MAX_IN_FLIGHT) await new Promise<void>((resolve) => waiters.push(resolve));
    active += 1;
    try { return await load(); }
    finally { active -= 1; waiters.shift()?.(); }
  })();
  inFlight.set(key, p);
  const clear = () => { if (inFlight.get(key) === p) inFlight.delete(key); };
  p.then(clear, clear);
  return p;
}

export const inboxListStats = (): { active: number; waiting: number } => ({ active, waiting: waiters.length });
