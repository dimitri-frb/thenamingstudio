// Talks to the dev-server Claude bridge (/api/naming -> `claude -p`) in dev, a
// Cloudflare Worker in production, and falls back to a client-side studio
// (./localStudio) when neither is reachable, so the whole flow always works.
import * as local from "./localStudio";
import { logRequest } from "./requestLog";

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

export interface NameIdea { name: string; type: string; rationale: string; score: number }
export interface DomainHit { tld: string; available: boolean }
// A concrete available domain to suggest (may tweak the name with a suffix), with
// its rough price. premium = available but a higher (premium) registry price.
export interface SuggestedDomain { domain: string; price: string; renewal: string; premium?: boolean }
export interface CompareRow {
  name: string; intuitive: number; visual: number; sound: number; emotional: number; total: number;
  domains: DomainHit[];   // .com first
  suggested?: SuggestedDomain[]; // up to 3 domains that are actually available
  inpi: boolean;          // appears clear to register?
  inpiNote: string;
  instagram: boolean;     // @handle appears free?
  verdict: string;
}
export interface Comparison { rows: CompareRow[]; recommended: string; why: string }

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
  if (ENDPOINT) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phase, brief, payload }),
      });
      if (res.ok) {
        const data = await res.json();
        if (!data?.error) {
          const out = deDash(data);
          logRequest({ phase, source: "live", input: { brief, payload }, output: out });
          return out as T;
        }
      }
    } catch {
      /* offline / no endpoint → fall through to local */
    }
  }
  await new Promise((r) => setTimeout(r, 500)); // tiny beat so the "thinking" state reads
  const out = deDash(localFallback(phase, brief, payload));
  logRequest({ phase, source: "fallback", input: { brief, payload }, output: out });
  return out as T;
}

function localFallback(phase: string, brief: Brief, payload: any): unknown {
  switch (phase) {
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
  explore: (brief: Brief, concept: Concept) => call<TerritoryWorld>("explore", brief, { concept }),
  relate: (brief: Brief, seed: string, world: string) => call<RelateResult>("relate", brief, { seed, world }),
  suggest: (brief: Brief, field: string) => call<{ suggestions: string[] }>("suggest", brief, { field }).then((d) => d.suggestions),
  names: (brief: Brief, sketch: Sketch) => call<{ names: NameIdea[] }>("names", brief, { sketch }).then((d) => d.names),
  compare: (brief: Brief, names: NameIdea[]) => call<Comparison>("compare", brief, { names }),
  brandbook: (brief: Brief, name: string) => call<BrandBook>("brandbook", brief, { name }),
};
