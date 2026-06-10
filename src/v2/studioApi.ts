// Typed client for the v2 studio funnel. Phase A: everything runs against the
// deterministic local engine so the static GitHub Pages demo works with no
// backend. The async signatures + the optional ENDPOINT below are the seam where
// Phase B (a Cloudflare Worker proxying Claude) and Phase C (real RDAP/INPI
// checks) slot in later, without any phase component changing.

import type {
  NameBrief,
  NameCandidate,
  PressureTest,
  SoundscapeAnalysis,
  Stance,
  Territory,
} from "./types";
import * as engine from "./studioEngine";

// Reserved for Phase B. Empty in the demo => always use the local engine.
const ENDPOINT = import.meta.env.DEV ? "" : import.meta.env.VITE_STUDIO_API || "";

// Belt-and-braces: strip em/en dashes from any string in any response (the
// "no dashes anywhere" rule), matching v1's namingApi.
function deDash<T>(v: T): T {
  if (typeof v === "string") return v.replace(/\s*[—–]\s*/g, ", ").replace(/^,\s*/, "") as unknown as T;
  if (Array.isArray(v)) return v.map(deDash) as unknown as T;
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const k in v as Record<string, unknown>) o[k] = deDash((v as Record<string, unknown>)[k]);
    return o as unknown as T;
  }
  return v;
}

// A tiny beat so "thinking" states read as real work (local engine is instant).
const beat = (ms = 450) => new Promise((r) => setTimeout(r, ms));

async function remote<T>(phase: string, body: unknown): Promise<T | null> {
  if (!ENDPOINT) return null;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phase, ...(body as object) }),
    });
    if (res.ok) {
      const data = await res.json();
      if (!data?.error) return deDash(data) as T;
    }
  } catch {
    /* offline / no endpoint -> local fallback */
  }
  return null;
}

export const studio = {
  async soundscape(brief: NameBrief): Promise<SoundscapeAnalysis> {
    const r = await remote<SoundscapeAnalysis>("soundscape", { brief });
    if (r) return r;
    await beat();
    return deDash(engine.localSoundscape(brief));
  },

  async territories(brief: NameBrief, stance: Stance): Promise<Territory[]> {
    const r = await remote<{ territories: Territory[] }>("territories", { brief, stance });
    if (r) return r.territories;
    await beat();
    return deDash(engine.localTerritories(brief, stance).territories);
  },

  async words(brief: NameBrief, territory: Territory): Promise<{ word: string; related: string[] }[]> {
    const r = await remote<{ words: { word: string; related: string[] }[] }>("words", { brief, territory });
    if (r) return r.words;
    await beat(250);
    return deDash(engine.localWords(brief, territory));
  },

  async candidates(
    brief: NameBrief,
    keptWords: string[],
    territories: Territory[],
    soundscape: SoundscapeAnalysis | undefined,
    count = 8,
    seed = 0,
  ): Promise<NameCandidate[]> {
    const r = await remote<{ candidates: NameCandidate[] }>("candidates", {
      brief, keptWords, territories, soundscape, count, seed,
    });
    if (r) return r.candidates;
    await beat(700);
    return deDash(engine.localCandidates(brief, keptWords, territories, soundscape, count, seed).candidates);
  },

  async pressureTest(brief: NameBrief, candidate: NameCandidate): Promise<PressureTest> {
    const r = await remote<PressureTest>("pressure", { brief, candidate });
    if (r) return r;
    await beat(300);
    return deDash(engine.localPressureTest(brief, candidate));
  },

  async rationale(brief: NameBrief, candidate: NameCandidate): Promise<string> {
    const r = await remote<{ rationale: string }>("rationale", { brief, candidate });
    if (r) return r.rationale;
    await beat(600);
    return deDash(engine.localRationale(brief, candidate));
  },
};
