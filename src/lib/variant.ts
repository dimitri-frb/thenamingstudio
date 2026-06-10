// Stamps each session with the funnel variant it used (v1 = the original
// 9-step flow, v2 = the new 7-phase studio flow), so results are attributable
// when real analytics land. Shared by both paths behind a stable interface.

export type Variant = "v1" | "v2";

const KEY = "ns.variant";

export function markVariant(v: Variant): void {
  try {
    const stamp = { variant: v, at: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(stamp));
    // Also expose on the element for any future analytics hook to read.
    document.documentElement.setAttribute("data-variant", v);
  } catch {
    /* storage blocked, non-fatal */
  }
}

export function currentVariant(): Variant | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw).variant ?? null;
  } catch {
    return null;
  }
}
