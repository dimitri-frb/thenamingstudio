// Persist the in-progress naming flow to localStorage so a browser refresh (or
// an accidental tab close) keeps the founder exactly where they were. We store a
// JSON snapshot of the flow state; the heavy exploration board is intentionally
// left out (it re-derives cheaply, and the saved words are kept).
export interface FlowSnapshot {
  v: number;
  at: number;
  process?: string;
  step: number;
  maxReached: number;
  brief: any;
  stage: string;
  workingName: string;
  feelings: any[];
  concepts: any[];
  chosen: string[];
  saved: any[];
  shortlist: string[];
  comp: any;
  taglines: Record<string, string>;
  chosenFinal: string;
}

const KEY = "ns.flow";
const VERSION = 1;
const MAX_AGE = 1000 * 60 * 60 * 24 * 7; // a week

export function saveFlow(s: Omit<FlowSnapshot, "v" | "at">): void {
  try { localStorage.setItem(KEY, JSON.stringify({ ...s, v: VERSION, at: Date.now() })); } catch { /* quota / unavailable */ }
}

export function loadFlow(): FlowSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as FlowSnapshot;
    if (s?.v !== VERSION) return null;
    if (Date.now() - (s.at || 0) > MAX_AGE) return null;
    return s;
  } catch { return null; }
}

export function clearFlow(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

// Is there a process worth resuming (past the empty landing state)?
export function hasSavedFlow(): boolean {
  const s = loadFlow();
  return !!(s && (s.step > 0 || s.brief?.does));
}
