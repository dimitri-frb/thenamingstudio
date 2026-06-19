// A lightweight, client-side log of every generation request (input + output),
// kept in localStorage so the /admin page can review them. Internal use only.
// NOTE: this records requests made from THIS browser only. For cross-user
// tracking the Worker would need to persist each call to a store (KV/D1).

export interface ReqLog {
  id: string;
  at: number;          // epoch ms
  phase: string;       // concepts | feelings | relate | names | compare | ...
  source: "live" | "fallback";
  input: any;          // { brief, payload }
  output: any;
}

const KEY = "ns.admin.log";
const MAX = 200;

export function logRequest(e: Omit<ReqLog, "id" | "at">): void {
  try {
    const list = getRequests();
    list.unshift({ ...e, id: Math.random().toString(36).slice(2, 10), at: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch { /* storage full / unavailable — ignore */ }
}

export function getRequests(): ReqLog[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function clearRequests(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
