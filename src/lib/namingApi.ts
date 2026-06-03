// Talks to the dev-server Claude bridge (/api/naming -> `claude -p`).
// Each call runs a real model turn against the logged-in Claude account; when
// the bridge isn't reachable (static GitHub Pages) it falls back to a
// client-side studio (./localStudio) so the whole flow still works.
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
export interface Word { word: string; territory: string }
export interface Branch { word: string; kind: "synonym" | "metaphor" | "foreign" | "sound" }
export interface SeedWord { word: string; note: string; branches: Branch[] }
export interface TerritoryWorld {
  title: string; story: string; mood: string[]; palette: string[]; motif: string;
  references: string[]; samples: string[]; words: SeedWord[];
}
export interface NameIdea { name: string; type: string; rationale: string; score: number }
export interface CompareRow {
  name: string; intuitive: number; visual: number; sound: number; emotional: number;
  total: number; negatives: string; domain: string; trademark: string; verdict: string;
}
export interface Comparison { rows: CompareRow[]; recommended: string; why: string }

async function call<T>(phase: string, brief: Brief, payload?: unknown): Promise<T> {
  // Try the real Claude bridge (local dev). On any failure — no bridge (static
  // GitHub Pages), 404, model error — fall back to the client-side studio so the
  // whole flow still works, just with demo-grade data.
  try {
    const res = await fetch("/api/naming", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phase, brief, payload }),
    });
    if (res.ok) {
      const data = await res.json();
      if (!data?.error) return data as T;
    }
  } catch {
    /* offline / no bridge → fall through to local */
  }
  await new Promise((r) => setTimeout(r, 500)); // tiny beat so the "thinking" state reads
  return localFallback(phase, brief, payload) as T;
}

function localFallback(phase: string, brief: Brief, payload: any): unknown {
  switch (phase) {
    case "interview": return local.localInterview(payload?.messages || []);
    case "concepts": return local.localConcepts(brief);
    case "explore": return local.localExplore(brief, payload.concept);
    case "names": return local.localNames(brief, payload.concepts || [], payload.words || []);
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
  words: (brief: Brief, concepts: Concept[]) => call<{ words: Word[] }>("words", brief, { concepts }).then((d) => d.words),
  explore: (brief: Brief, concept: Concept) => call<TerritoryWorld>("explore", brief, { concept }),
  suggest: (brief: Brief, field: string) => call<{ suggestions: string[] }>("suggest", brief, { field }).then((d) => d.suggestions),
  names: (brief: Brief, concepts: Concept[], words: Word[]) =>
    call<{ names: NameIdea[] }>("names", brief, { concepts, words }).then((d) => d.names),
  compare: (brief: Brief, names: NameIdea[]) => call<Comparison>("compare", brief, { names }),
};
