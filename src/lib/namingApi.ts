// Talks to the dev-server Claude bridge (/api/naming -> `claude -p`).
// Each call runs a real model turn against the logged-in Claude account.

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
export interface NameIdea { name: string; type: string; rationale: string; score: number }
export interface CompareRow {
  name: string; intuitive: number; visual: number; sound: number; emotional: number;
  total: number; negatives: string; domain: string; trademark: string; verdict: string;
}
export interface Comparison { rows: CompareRow[]; recommended: string; why: string }

async function call<T>(phase: string, brief: Brief, payload?: unknown): Promise<T> {
  const res = await fetch("/api/naming", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phase, brief, payload }),
  });
  const data = await res.json().catch(() => ({ error: "Bad response from the studio." }));
  if (!res.ok || data.error) {
    throw new Error(
      data.error?.includes("ENOENT") || data.error?.includes("not found")
        ? "Claude CLI not reachable. Run `npm run dev` locally where you're logged into Claude."
        : data.error || `Request failed (${res.status})`,
    );
  }
  return data as T;
}

export const naming = {
  concepts: (brief: Brief) => call<{ concepts: Concept[] }>("concepts", brief).then((d) => d.concepts),
  words: (brief: Brief, concepts: Concept[]) => call<{ words: Word[] }>("words", brief, { concepts }).then((d) => d.words),
  names: (brief: Brief, concepts: Concept[], words: Word[]) =>
    call<{ names: NameIdea[] }>("names", brief, { concepts, words }).then((d) => d.names),
  compare: (brief: Brief, names: NameIdea[]) => call<Comparison>("compare", brief, { names }),
};
