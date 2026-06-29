// Talks to the dev-server Claude bridge (/api/naming -> `claude -p`) in dev, a
// Cloudflare Worker in production, and falls back to a client-side studio
// (./localStudio) when neither is reachable, so the whole flow always works.
import * as local from "./localStudio";
import { logRequest, processId, isTestMode } from "./requestLog";

export interface Brief {
  does: string;
  industry: string;
  problem: string;
  audience: string;
  values: string;
  uvp: string;
  signal: string[];
  avoid: string[];
  tone: string[];
  lanes: string[];
  geos?: string[]; // markets the name should work in (pronounceable / no bad meaning)
}

export interface Concept { title: string; blurb: string; lane: string }

// A feeling the brand could evoke, with a personalized "why it fits THIS brand"
// line. Swiped through, Tinder-style, in the emotional step.
export interface Feeling { word: string; why: string }

// A concept explored as a "constellation" of words. Each seed word can be
// opened into related words (synonyms, sounds, short forms) to dig deeper.
export interface WordNode { word: string; related: string[] }
export interface TerritoryWorld {
  title: string;
  blurb: string;        // one clear sentence on what this direction is
  words: WordNode[];    // ~12-14 seed words forming the constellation
}

// The words the founder picked while exploring the constellations. Names are
// drawn from these.
export interface Sketch { concepts: string[]; words: string[] }

// Exploration (Cosmos step 6): a focus word, with words related to it grouped by
// how they relate (lexical, metaphor, translation, etymological root, mythic).
export interface RelWord { w: string; note: string; lang?: string }
export interface RelGroupData { rel: string; words: RelWord[] }
export interface RelateResult { word: string; def: string; groups: RelGroupData[] }

export interface NameIdea { name: string; type: string; rationale: string; score: number; seed?: string }
export interface DomainHit { tld: string; available: boolean }
// A concrete available domain to suggest (may tweak the name with a suffix), with
// its rough price. premium = available but a higher (premium) registry price.
export interface SuggestedDomain { domain: string; price: string; renewal: string; premium?: boolean }
export interface CompareRow {
  name: string; intuitive: number; visual: number; sound: number; emotional: number; total: number;
  tagline?: string;      // a short brand tagline for the company, used on the share screen
  domains: DomainHit[];   // .com first
  suggested?: SuggestedDomain[]; // up to 3 domains that are actually available
  inpi: boolean;          // appears clear to register?
  inpiNote: string;
  instagram: boolean;     // @handle appears free?
  verdict: string;
}
export interface Comparison { rows: CompareRow[]; recommended: string; why: string; niceClasses?: number[] }

// Real INPI trademark check for one name (class-aware). "unknown" means INPI wasn't
// reachable/configured, so the UI should fall back to its heuristic estimate.
export interface InpiResult {
  ok: boolean;
  verdict: "clear" | "conflict" | "adjacent" | "unknown";
  classes: number[];
  hits: { name: string; classes: number[] }[];
}

// The starter brand book, generated from the brief + the chosen name.
export interface Swatch { hex: string; name: string; role: string }
export interface BrandBook {
  essence: string;
  tagline: string;
  story: string;
  whyName: string;
  voice: { adjectives: string[]; dos: string[]; donts: string[]; sample: string };
  palette: Swatch[];
  fontKey: string;   // one of the curated pairings (editorial|modern|classic|friendly|warm)
  fontNote: string;
  messaging: { pitch: string; boilerplate: string; taglines: string[]; valueProps: string[] };
}

// In dev, Vite's bridge serves /api/naming. In a production build we point at the
// Cloudflare Worker via VITE_NAMING_API (set at build time). Empty => fallback only.
const ENDPOINT = import.meta.env.DEV ? "/api/naming" : (import.meta.env.VITE_NAMING_API || "");

// Belt-and-braces: strip em/en dashes from every string in any response, so a
// dash can never reach the UI no matter what the model returns.
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

async function call<T>(phase: string, brief: Brief, payload?: unknown): Promise<T> {
  // Try real Claude (dev bridge or Worker). On any failure, no endpoint, 404,
  // network, model error, fall back to the client-side studio so the whole flow
  // still works, just with demo-grade data.
  const process = processId();
  if (ENDPOINT) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phase, brief, payload, process, test: isTestMode() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (!data?.error) {
          const out = deDash(data);
          // Exploration ("relate") fires dozens of times per process (prefetch);
          // don't log it, it floods the admin and evicts older processes.
          if (phase !== "relate") logRequest({ phase, process, source: "live", input: { brief, payload }, output: out });
          return out as T;
        }
      }
    } catch {
      /* offline / no endpoint → fall through to local */
    }
  }
  await new Promise((r) => setTimeout(r, 500)); // tiny beat so the "thinking" state reads
  const out = deDash(localFallback(phase, brief, payload));
  if (phase !== "relate") logRequest({ phase, process, source: "fallback", input: { brief, payload }, output: out });
  return out as T;
}

function localFallback(phase: string, brief: Brief, payload: any): unknown {
  switch (phase) {
    case "synthesize": {
      const line = brief.does?.trim() || "A brand finding its name.";
      const tags = [brief.industry, ...(brief.tone || [])].filter(Boolean).slice(0, 3).map((t) => t.toLowerCase());
      return { line, tags };
    }
    case "interview": return local.localInterview(payload?.messages || []);
    case "concepts": return local.localConcepts(brief);
    case "feelings": return local.localFeelings(brief);
    case "explore": return local.localExplore(brief, payload.concept);
    case "relate": return local.localRelate(brief, payload?.seed || "", payload?.world || "");
    case "names": return local.localNames(brief, payload.sketch);
    case "compare": return local.localCompare(brief, payload.names || []);
    case "brandbook": return local.localBrandbook(brief, payload?.name || "");
    case "suggest": return local.localSuggest(brief, payload?.field || "");
    default: return {};
  }
}

export interface Msg { role: "assistant" | "user"; text: string }
export interface InterviewTurn { say: string; done: boolean; brief?: Brief }

const EMPTY_BRIEF: Brief = { does: "", industry: "", problem: "", audience: "", values: "", uvp: "", signal: [], avoid: [], tone: [], lanes: [] };

export const naming = {
  interview: (messages: Msg[]) => call<InterviewTurn>("interview", EMPTY_BRIEF, { messages }),
  concepts: (brief: Brief) => call<{ concepts: Concept[] }>("concepts", brief).then((d) => d.concepts),
  feelings: (brief: Brief) => call<{ feelings: Feeling[] }>("feelings", brief).then((d) => d.feelings),
  synthesize: (brief: Brief) => call<{ line: string; tags: string[] }>("synthesize", brief),
  explore: (brief: Brief, concept: Concept) => call<TerritoryWorld>("explore", brief, { concept }),
  relate: (brief: Brief, seed: string, world: string, exclude: string[] = []) => call<RelateResult>("relate", brief, { seed, world, exclude }),
  suggest: (brief: Brief, field: string) => call<{ suggestions: string[] }>("suggest", brief, { field }).then((d) => d.suggestions),
  names: (brief: Brief, sketch: Sketch, exclude: string[] = []) => call<{ names: NameIdea[] }>("names", brief, { sketch, exclude }).then((d) => d.names),
  compare: (brief: Brief, names: NameIdea[]) => call<Comparison>("compare", brief, { names }),
  brandbook: (brief: Brief, name: string) => call<BrandBook>("brandbook", brief, { name }),
};

// Real domain availability for one name (its own request on the Worker, so it's
// fast and thorough). Not logged. Returns empty on any failure.
// Memoized + de-duped by name: pre-searching a name on the previous step warms
// this cache, so the comparison step shows domains instantly. Failed/empty
// results are not cached, so they can be retried.
type DomResult = { domains: DomainHit[]; suggested: SuggestedDomain[] };
const domainCache = new Map<string, Promise<DomResult>>();
export function fetchDomains(name: string): Promise<DomResult> {
  const key = (name || "").trim().toLowerCase();
  if (!key) return Promise.resolve({ domains: [], suggested: [] });
  const hit = domainCache.get(key);
  if (hit) return hit;
  const p = (async (): Promise<DomResult> => {
    if (ENDPOINT) {
      try {
        const res = await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phase: "domains", payload: { name } }) });
        if (res.ok) { const d = await res.json(); if (!d?.error) return { domains: d.domains || [], suggested: d.suggested || [] }; }
      } catch { /* ignore */ }
    }
    return { domains: [], suggested: [] };
  })();
  domainCache.set(key, p);
  // Don't keep a failed/empty result around; allow a later real fetch to retry.
  p.then((r) => { if (!r.domains.length && !r.suggested.length) domainCache.delete(key); }).catch(() => domainCache.delete(key));
  return p;
}

// Who's behind a (taken) domain: the live site's title + description, and whether
// it looks like a real competitor in the founder's space. Cached per domain.
export interface SiteInfo { ok: boolean; url?: string; title?: string; desc?: string; parked?: boolean; competitor?: boolean; note?: string }
const siteCache = new Map<string, Promise<SiteInfo>>();
export function fetchSiteInfo(domain: string, brief?: Brief): Promise<SiteInfo> {
  const key = (domain || "").trim().toLowerCase();
  if (!key) return Promise.resolve({ ok: false });
  const hit = siteCache.get(key);
  if (hit) return hit;
  const p = (async (): Promise<SiteInfo> => {
    if (ENDPOINT) {
      try {
        const res = await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phase: "siteinfo", brief, payload: { domain } }) });
        if (res.ok) { const d = await res.json(); if (d && !d.error) return d as SiteInfo; }
      } catch { /* ignore */ }
    }
    return { ok: false };
  })();
  siteCache.set(key, p);
  p.then((r) => { if (!r.ok) siteCache.delete(key); }).catch(() => siteCache.delete(key));
  return p;
}

// Real INPI trademark availability for one name, filtered to the brand's Nice
// classes (its own request on the Worker). Not logged. Soft-fails to "unknown".
export async function fetchInpi(name: string, classes: number[]): Promise<InpiResult> {
  if (ENDPOINT) {
    try {
      const res = await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phase: "inpi", payload: { name, classes } }) });
      if (res.ok) { const d = await res.json(); if (d && !d.error) return d as InpiResult; }
    } catch { /* ignore */ }
  }
  return { ok: false, verdict: "unknown", classes, hits: [] };
}

// Email capture before the brand book. Logged locally and (centrally) on the
// Worker, so leads show up in /admin. No Claude call.
export async function captureLead(brief: Brief, email: string, name: string): Promise<void> {
  if (isTestMode()) return; // sample flow: never capture a lead or log it
  const process = processId();
  logRequest({ phase: "lead", process, source: "live", input: { brief, payload: { email, name } }, output: { email, name } });
  try { localStorage.setItem("ns.email", email); } catch { /* ignore */ }
  if (ENDPOINT) {
    try {
      await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phase: "lead", brief, payload: { email, name }, process }) });
    } catch { /* best effort */ }
  }
}

// Sign-up captured up front (step 1): the founder's name + email, mandatory before
// the flow. Registered as a lead so it shows in /admin from the very first step.
export async function captureSignup(brief: Brief, fromName: string, email: string): Promise<void> {
  if (isTestMode()) return;
  const process = processId();
  const payload = { email, fromName, kind: "signup" };
  logRequest({ phase: "lead", process, source: "live", input: { brief, payload }, output: payload });
  try { localStorage.setItem("ns.email", email); localStorage.setItem("ns.fromName", fromName); } catch { /* ignore */ }
  if (ENDPOINT) {
    try { await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phase: "lead", brief, payload, process }) }); } catch { /* best effort */ }
  }
}

// End-of-flow feedback (step 10): scores + notes. Registered centrally so it shows
// per process in /admin.
export interface Feedback {
  experience: number; ux: number; found: number;        // 1..5 sliders
  experienceNote?: string; uxNote?: string; foundNote?: string;
  improve?: string; free?: string;
  fromName?: string; email?: string;
}
export async function submitFeedback(fb: Feedback): Promise<void> {
  if (isTestMode()) return;
  const process = processId();
  logRequest({ phase: "feedback", process, source: "live", input: { payload: fb }, output: fb });
  if (ENDPOINT) {
    try { await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phase: "feedback", payload: fb, process }) }); } catch { /* best effort */ }
  }
}
