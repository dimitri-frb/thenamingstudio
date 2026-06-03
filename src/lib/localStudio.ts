// Client-side fallback "studio" — runs the whole flow with no backend, so the
// static GitHub Pages build is fully explorable. When the Claude bridge IS
// reachable (local dev) the real model is used instead (see namingApi).
// Deterministic-ish, decent quality, clearly demo-grade.

import type { Brief, Concept, NameIdea, Comparison, TerritoryWorld, Msg, InterviewTurn, SeedWord } from "./namingApi";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed: number) {
  return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
const pick = <T,>(r: () => number, a: T[]): T => a[Math.floor(r() * a.length)];
const STOP = new Set(["a", "an", "the", "for", "and", "or", "to", "of", "in", "on", "with", "that", "app", "platform", "tool", "your", "you", "we", "it", "is", "helps", "turns", "into", "make", "makes"]);

function keywords(b: Brief): string[] {
  const text = [b.does, b.problem, b.values, b.uvp].join(" ").toLowerCase();
  const ws = text.replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w));
  return [...new Set(ws)].slice(0, 10);
}

const FRAMES = [
  { t: "Craft & forge", b: "Treats the work like a maker's trade — raw material shaped by a steady hand.", lane: "evocative" },
  { t: "The quiet signal", b: "A calm, confident presence that doesn't shout to be heard.", lane: "suggestive" },
  { t: "Flow & momentum", b: "The feeling of effortless forward motion, friction melting away.", lane: "suggestive" },
  { t: "First light", b: "The hopeful, early-morning moment before everyone else is awake.", lane: "evocative" },
  { t: "The companion", b: "A warm, ever-present sidekick that has your back.", lane: "suggestive" },
  { t: "Field notes", b: "Curious, observant, a little hand-made — ideas captured in the wild.", lane: "compound" },
  { t: "Alchemy", b: "Turning the raw and ordinary into something polished and valuable.", lane: "invented" },
  { t: "Open door", b: "Welcoming and unpretentious — anyone can walk in and belong.", lane: "evocative" },
  { t: "True north", b: "A dependable point of reference when everything else is noisy.", lane: "suggestive" },
  { t: "Playground", b: "Light, joyful, a place to experiment without fear.", lane: "playful" },
];
const PALETTES = [
  ["#2C2A2E", "#D4A276", "#F0E6D3", "#5B7065"],
  ["#1F2933", "#E07A5F", "#F2CC8F", "#81B29A"],
  ["#33291F", "#A8763E", "#EDE6D6", "#6B705C"],
  ["#22223B", "#C9ADA7", "#F2E9E4", "#9A8C98"],
];
const MOODS = ["intimate", "tactile", "unhurried", "literary", "honest", "bold", "warm", "precise", "playful", "quiet", "modern", "crafted"];
const MOTIFS = ["✒️ a quill trailing into a wave", "🌿 a single leaf unfurling", "🪡 a thread pulled taut", "🌅 light breaking over a ridge", "🔑 a small brass key", "📡 a soft signal rippling out"];
const PRE = ["lumo", "nova", "vela", "kai", "ora", "sol", "wren", "halo", "vero", "atlas", "ember", "lyra"];
const SUF = ["ly", "ora", "io", "wave", "lab", "mint", "flow", "loop", "craft", "field", "kit", "able"];

function branchesFor(r: () => number, w: string): SeedWord["branches"] {
  const base = w.replace(/[aeiou]+$/i, "") || w;
  return [
    { word: pick(r, ["true" + w, w + "ly", "re" + w, w + "ish"]).toLowerCase(), kind: "synonym" },
    { word: pick(r, ["north", "ember", "tide", "spark", "grove", "loom"]), kind: "metaphor" },
    { word: pick(r, [base + "a", "le " + w, w + "o", "mon" + base]), kind: "foreign" },
    { word: cap(base + pick(r, SUF)), kind: "sound" },
  ];
}

/* ---------------- phases ---------------- */
export function localConcepts(brief: Brief): { concepts: Concept[] } {
  const r = rng(hash(JSON.stringify(brief)));
  const kw = keywords(brief);
  const frames = [...FRAMES].sort(() => r() - 0.5).slice(0, 10);
  return {
    concepts: frames.map((f, i) => ({
      title: kw[i] ? `${cap(kw[i])} & ${f.t.split(" ").pop()}` : f.t,
      blurb: f.b,
      lane: f.lane,
    })),
  };
}

export function localExplore(brief: Brief, concept: Concept): TerritoryWorld {
  const r = rng(hash(concept.title + brief.does));
  const kw = keywords(brief);
  const seeds = [...new Set([...kw, "ink", "echo", "north", "loom", "tide", "spark", "grove", "verse"])].slice(0, 8);
  return {
    title: concept.title,
    story: `${concept.blurb} For ${brief.audience || "your people"}, this world makes the brand feel ${pick(r, MOODS)} and ${pick(r, MOODS)}.`,
    mood: [...MOODS].sort(() => r() - 0.5).slice(0, 5),
    palette: pick(r, PALETTES),
    motif: pick(r, MOTIFS),
    references: ["letterpress", "field notebooks", "indie studios"].sort(() => r() - 0.5),
    samples: [cap(pick(r, PRE) + pick(r, SUF)), cap((kw[0] || "true") + pick(r, SUF)), cap(pick(r, PRE) + pick(r, SUF))],
    words: seeds.map((w) => ({ word: w, note: pick(r, ["the core feeling", "what you do", "a quiet metaphor", "the texture of it", "where it leads"]), branches: branchesFor(r, w) })),
  };
}

export function localNames(brief: Brief, concepts: Concept[], words: { word: string; territory: string }[]): { names: NameIdea[] } {
  const r = rng(hash(JSON.stringify(words) + brief.does + Math.floor(Math.random() * 1e6)));
  const lanes = (brief.lanes?.length ? brief.lanes : ["suggestive", "compound", "invented", "evocative"]);
  const seeds = words.length ? words : keywords(brief).map((w) => ({ word: w, territory: concepts[0]?.title || "" }));
  const out: NameIdea[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < 24 && guard < 400) {
    guard++;
    const s = pick(r, seeds);
    const lane = pick(r, lanes);
    const base = s.word.replace(/[^a-z]/gi, "");
    let name = "";
    if (lane === "compound") name = cap(base) + cap(pick(r, SUF));
    else if (lane === "invented") name = cap(pick(r, PRE) + pick(r, SUF));
    else if (lane === "evocative" || lane === "abstract") name = cap(base);
    else name = cap(base.replace(/[aeiou]+$/i, "") + pick(r, SUF));
    if (!name || name.length < 3 || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push({
      name,
      type: lane,
      rationale: `From "${s.word}" — ${pick(r, ["short and ownable", "easy to say once heard", "carries the story without explaining", "a real word in a new place", "invented, so it's yours"])}.`,
      score: 70 + Math.floor(r() * 28),
    });
  }
  return { names: out.sort((a, b) => b.score - a.score) };
}

export function localCompare(_brief: Brief, names: { name: string; type?: string }[]): Comparison {
  const r = rng(hash(JSON.stringify(names)));
  const rows = names.map((n) => {
    const I = 3 + Math.floor(r() * 3), V = 3 + Math.floor(r() * 3), S = 3 + Math.floor(r() * 3), E = 3 + Math.floor(r() * 3);
    const taken = n.name.length <= 6 ? r() > 0.3 : r() > 0.6;
    return {
      name: n.name, intuitive: I, visual: V, sound: S, emotional: E, total: I + V + S + E,
      negatives: "clean (demo — not language-verified)",
      domain: taken ? `${n.name.toLowerCase()}.com likely taken — try .io / get-` : `${n.name.toLowerCase()}.com may be free (estimate)`,
      trademark: r() > 0.7 ? "possible clash — verify on INPI/EUIPO" : "no obvious clash (estimate)",
      verdict: pick(r, ["Strong, ownable, easy to say.", "Memorable with a clear story.", "Distinctive — worth clearing legally.", "Warm and human; reads well."]),
    };
  }).sort((a, b) => b.total - a.total);
  const best = rows[0];
  return {
    rows,
    recommended: best?.name || "",
    why: best ? `Honestly? ${best.name} is the one we'd run with — it scores highest across all four axes, it's easy to say after hearing once, and it leaves you room to grow. (Demo reasoning — connect Claude locally for the real analysis.)` : "",
  };
}

const SUGGEST: Record<string, string[][]> = {
  problem: [["it's slow and manual", "the blank page kills momentum", "it's too expensive for most"], ["results are inconsistent", "it takes weeks, not minutes", "experts are out of reach"]],
  audience: [["solo founders", "small creative teams", "non-native English speakers"], ["time-pressed builders", "first-time founders", "indie makers"]],
  values: [["speed", "taste", "a defensible result"], ["simplicity", "trust", "feeling in control"]],
  uvp: [["the rigor of a consultant at the speed of a tool", "from idea to done in minutes"], ["a studio in your pocket", "results you can actually defend"]],
};
export function localSuggest(brief: Brief, field: string): { suggestions: string[] } {
  const r = rng(hash(field + brief.does));
  const bank = SUGGEST[field] || [["clarity", "speed", "trust"]];
  return { suggestions: pick(r, bank) };
}

// Recommend lanes from the brief (used to pre-select step 4).
export function recommendLanes(brief: Brief): string[] {
  const tone = (brief.tone || []).join(" ").toLowerCase();
  const out = new Set<string>(["suggestive"]);
  if (/play|fun|bold|loud/.test(tone)) out.add("playful");
  if (/calm|premium|trust|elegan|refined/.test(tone)) out.add("evocative");
  if (/tech|modern|smart/.test(tone)) out.add("invented");
  out.add("compound");
  return [...out].slice(0, 4);
}

const Q = [
  "Hey! So tell me — what does your company do, in a nutshell?",
  "Love it. Who's the main person you picture using this?",
  "And what problem are you really solving for them?",
  "What should the name feel like — any vibe words?",
  "Anything the name should definitely avoid?",
];
export function localInterview(messages: Msg[]): InterviewTurn {
  const userTurns = messages.filter((m) => m.role === "user");
  if (userTurns.length < Q.length) return { say: Q[userTurns.length], done: false };
  const a = userTurns.map((m) => m.text);
  return {
    say: "Perfect — I've got a clear picture. Let me find some names. (Demo brief — connect Claude locally for a deeper read.)",
    done: true,
    brief: {
      does: a[0] || "", industry: "", problem: a[2] || "", audience: a[1] || "",
      values: "", uvp: a[0] || "",
      signal: (a[3] || "").split(/[\s,]+/).filter(Boolean).slice(0, 4),
      avoid: (a[4] || "").split(/[\s,]+/).filter(Boolean).slice(0, 4),
      tone: (a[3] || "").split(/[\s,]+/).filter(Boolean).slice(0, 3),
      lanes: ["suggestive", "evocative", "compound"],
    },
  };
}
