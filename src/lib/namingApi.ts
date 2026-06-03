// Talks to the dev-server Claude bridge (/api/naming -> `claude -p`) in dev, a
// Cloudflare Worker in production, and falls back to a client-side studio
// (./localStudio) when neither is reachable, so the whole flow always works.
import * as local from "./localStudio";

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

// A concept explored into an inspiring "world" the founder reacts to.
export interface BrandRef { name: string; why: string }
export interface Angle { title: string; note: string }
export interface TerritoryWorld {
  title: string;
  essence: string;   // the one-line soul of this direction
  story: string;     // why it fits THIS brand
  quotes: string[];  // 1-2 manifesto lines — how the brand would talk
  brands: BrandRef[];// brands that already live here, each with a why
  angles: Angle[];   // sub-territories to niche down into
}

// "Your brand so far" — what the founder kept while exploring. Names are drawn
// from this, not from a list of words.
export interface Sketch { concepts: string[]; quotes: string[]; brands: string[]; angles: string[] }

export interface NameIdea { name: string; type: string; rationale: string; score: number }
export interface CompareRow {
  name: string; intuitive: number; visual: number; sound: number; emotional: number;
  total: number; negatives: string; domain: string; trademark: string; verdict: string;
}
export interface Comparison { rows: CompareRow[]; recommended: string; why: string }

// In dev, Vite's bridge serves /api/naming. In a production build we point at the
// Cloudflare Worker via VITE_NAMING_API (set at build time). Empty => fallback only.
const ENDPOINT = import.meta.env.DEV ? "/api/naming" : (import.meta.env.VITE_NAMING_API || "");

async function call<T>(phase: string, brief: Brief, payload?: unknown): Promise<T> {
  // Try real Claude (dev bridge or Worker). On any failure — no endpoint, 404,
  // network, model error — fall back to the client-side studio so the whole flow
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
        if (!data?.error) return data as T;
      }
    } catch {
      /* offline / no endpoint → fall through to local */
    }
  }
  await new Promise((r) => setTimeout(r, 500)); // tiny beat so the "thinking" state reads
  return localFallback(phase, brief, payload) as T;
}

function localFallback(phase: string, brief: Brief, payload: any): unknown {
  switch (phase) {
    case "interview": return local.localInterview(payload?.messages || []);
    case "concepts": return local.localConcepts(brief);
    case "explore": return local.localExplore(brief, payload.concept);
    case "names": return local.localNames(brief, payload.sketch);
    case "compare": return local.localCompare(brief, payload.names || []);
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
  explore: (brief: Brief, concept: Concept) => call<TerritoryWorld>("explore", brief, { concept }),
  suggest: (brief: Brief, field: string) => call<{ suggestions: string[] }>("suggest", brief, { field }).then((d) => d.suggestions),
  names: (brief: Brief, sketch: Sketch) => call<{ names: NameIdea[] }>("names", brief, { sketch }).then((d) => d.names),
  compare: (brief: Brief, names: NameIdea[]) => call<Comparison>("compare", brief, { names }),
};
