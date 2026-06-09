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

// A feeling the brand could evoke, with a personalized "why it fits THIS brand"
// line. Swiped through, Tinder-style, in the emotional step.
export interface Feeling { word: string; why: string }

// A concept explored into a "world" the founder feels out through a few quick
// questions: which feeling, which line, which brands inspire them.
export interface BrandRef { name: string; why: string }
export interface TerritoryWorld {
  title: string;
  blurb: string;       // one clear sentence on what this direction is
  feelings: string[];  // ~5 single feeling words to choose from
  quotes: string[];    // ~4 manifesto lines (the brand's voice) to choose from
  brands: BrandRef[];  // ~5 brands that live here, each with a why
}

// "Your brand so far", the answers the founder gave while exploring. Names are
// drawn from this, not from a list of words.
export interface Sketch { concepts: string[]; feelings: string[]; quotes: string[]; brands: string[] }

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
    case "feelings": return local.localFeelings(brief);
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
  feelings: (brief: Brief) => call<{ feelings: Feeling[] }>("feelings", brief).then((d) => d.feelings),
  explore: (brief: Brief, concept: Concept) => call<TerritoryWorld>("explore", brief, { concept }),
  suggest: (brief: Brief, field: string) => call<{ suggestions: string[] }>("suggest", brief, { field }).then((d) => d.suggestions),
  names: (brief: Brief, sketch: Sketch) => call<{ names: NameIdea[] }>("names", brief, { sketch }).then((d) => d.names),
  compare: (brief: Brief, names: NameIdea[]) => call<Comparison>("compare", brief, { names }),
};
