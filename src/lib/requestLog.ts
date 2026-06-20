// A lightweight, client-side log of every generation request (input + output),
// kept in localStorage so the /admin page can review them. Internal use only.
// NOTE: this records requests made from THIS browser only. For cross-user
// tracking the Worker would need to persist each call to a store (KV/D1).

export interface ReqLog {
  id: string;
  at: number;          // epoch ms
  process?: string;    // groups all requests of one naming flow together
  phase: string;       // concepts | feelings | relate | names | compare | ...
  source: "live" | "fallback";
  input: any;          // { brief, payload }
  output: any;
}

const KEY = "ns.admin.log";
const MAX = 200;

// When the founder is running the sample "test" flow (?test / "Test flow"), we
// don't want those requests polluting the real request log, locally or centrally.
let testMode = false;
export function setTestMode(v: boolean): void { testMode = v; }
export function isTestMode(): boolean { return testMode; }

// A "process" = one naming flow. Every request made during the same flow shares
// this id so the /admin page can show one line per process. Reset on restart.
const rid = () => "p" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
let PROCESS = rid();
export function processId(): string { return PROCESS; }
export function newProcess(): string { PROCESS = rid(); return PROCESS; }
export function setProcessId(id: string): void { if (id) PROCESS = id; } // restore the same process after a refresh

export function logRequest(e: Omit<ReqLog, "id" | "at">): void {
  if (testMode) return; // never log the sample/test flow
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
