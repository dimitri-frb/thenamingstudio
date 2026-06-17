// Client-side fallback "studio", runs the whole flow with no backend, so the
// static GitHub Pages build is fully explorable. When real Claude IS reachable
// (dev bridge or the Worker) it is used instead (see namingApi).
// Deterministic-ish, decent quality, clearly demo-grade.

import type { Brief, BrandBook, Concept, Feeling, NameIdea, Comparison, TerritoryWorld, Sketch, Msg, InterviewTurn } from "./namingApi";

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
const sample = <T,>(r: () => number, a: T[], n: number): T[] => [...a].sort(() => r() - 0.5).slice(0, n);
const STOP = new Set(["a", "an", "the", "for", "and", "or", "to", "of", "in", "on", "with", "that", "app", "platform", "tool", "your", "you", "we", "it", "is", "helps", "turns", "into", "make", "makes", "this", "these", "angle", "own", "story", "whole"]);

function keywords(b: Brief): string[] {
  const text = [b.does, b.problem, b.values, b.uvp].join(" ").toLowerCase();
  const ws = text.replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w));
  return [...new Set(ws)].slice(0, 10);
}

// Concept territories, clever, inspiring naming angles with clear titles.
const FRAMES = [
  { t: "The ironic inversion", b: "Name it the opposite of what it is, like Ordinary, Regular or Beige, and let the wink do the work.", lane: "evocative" },
  { t: "The insider code", b: "A name that reads like a password. Only the right people get it, and they feel chosen.", lane: "suggestive" },
  { t: "The hidden name", b: "Understated, unlisted, almost a secret. The brand you discover, not the one shouting at you.", lane: "abstract" },
  { t: "The maker's mark", b: "Treats the work like a craft, raw material shaped by a steady, human hand.", lane: "evocative" },
  { t: "The quiet signal", b: "Calm and self-assured. It never raises its voice, and that's exactly why you trust it.", lane: "suggestive" },
  { t: "Borrowed from nature", b: "A plant, an animal, a turn of weather. Instantly visual, instantly ownable.", lane: "evocative" },
  { t: "The invented word", b: "A coined word that belongs to no one else, yours to define from zero.", lane: "invented" },
  { t: "Plain and proud", b: "Says exactly what it is, with a confidence that needs no decoration.", lane: "descriptive" },
  { t: "Borrowed myth", b: "Takes the gravity of a legend, a god, a story everyone half-remembers.", lane: "evocative" },
  { t: "The playful twist", b: "A pun, a misspelling, a wink. The kind of name people repeat just for fun.", lane: "playful" },
  { t: "First light", b: "The hopeful, early-morning moment before everyone else is awake.", lane: "evocative" },
  { t: "True north", b: "A dependable point of reference when everything else is noise.", lane: "suggestive" },
];
const PRE = ["lumo", "nova", "vela", "kai", "ora", "sol", "wren", "halo", "vero", "atlas", "ember", "lyra"];
const SUF = ["ly", "ora", "io", "wave", "lab", "mint", "flow", "loop", "craft", "field", "kit", "able"];

// Word material for the exploration constellation.
const EVOCATIVE = ["ember", "north", "tide", "spark", "grove", "loom", "echo", "ridge", "dawn", "forge", "current", "halo", "drift", "anchor", "signal", "compass", "lantern", "thread", "vault", "haven", "summit", "willow", "raven", "cobalt", "slate", "kismet", "lumen", "orbit", "meridian", "relic"];
const METAPHOR = ["northstar", "wildfire", "undertow", "keystone", "wavelength", "groundswell", "lighthouse", "bloom", "headwind", "afterglow", "watershed", "foothold"];
// Short evocative phrases, so a concept opens into "words AND expressions".
const EXPRESSIONS = ["first light", "true north", "quiet power", "open road", "slow craft", "north star", "second nature", "clear sky", "fresh start", "common ground", "still water", "high noon"];

// Branch a seed word into ~5 related words (sounds, blends, short forms).
function relatedFor(r: () => number, w: string): string[] {
  const base = w.toLowerCase().replace(/[^a-z]/g, "") || w;
  const suf = SUF.filter((s) => !base.endsWith(s)); // avoid doubling (e.g. craft+craft)
  const out = [
    cap(base) + pick(r, suf),
    pick(r, METAPHOR),
    cap(base.slice(0, 4)) + pick(r, ["ix", "en", "is", "ora", "yl"]),
    cap(pick(r, PRE)) + base.slice(0, 3),
    base.length > 3 ? base.slice(0, 3).toUpperCase() : null,
  ].filter((s): s is string => !!s && s.length > 1);
  return [...new Set(out)].filter((s) => s.toLowerCase() !== base).slice(0, 5);
}

// Branch ANY label (word or expression) into related words, on demand, so a
// node on the exploration whiteboard can always be opened one level deeper.
export function expandWord(label: string): string[] {
  const r = rng(hash("expand:" + label));
  const base = label.toLowerCase().split(/\s+/)[0].replace(/[^a-z]/g, "") || label;
  return relatedFor(r, base);
}

/* ---------------- phases ---------------- */
// Personalized feeling cards, each "why" pulls in the audience / what they do,
// so the deck feels written for this specific founder.
const FEELING_POOL: { word: string; why: (aud: string) => string }[] = [
  { word: "Trust", why: (a) => `${a} are betting on you with something that matters; the name has to feel safe to choose.` },
  { word: "Effortless", why: (a) => `You take the friction away; ${a} should feel it the moment they hear it.` },
  { word: "Premium", why: (a) => `${a} should feel they're choosing the considered option, not the cheap one.` },
  { word: "Warmth", why: (a) => `A human hand behind it; ${a} should feel looked after, not processed.` },
  { word: "Boldness", why: (a) => `In a sea of sameness, ${a} remember the brand that dares.` },
  { word: "Clarity", why: (a) => `${a} are busy; the name should feel instantly, refreshingly clear.` },
  { word: "Playfulness", why: (a) => `A little fun goes a long way with ${a}.` },
  { word: "Calm", why: (a) => `${a} come to you to feel less overwhelmed, not more.` },
  { word: "Craft", why: (a) => `Made with care; ${a} can feel the craftsmanship in it.` },
  { word: "Optimism", why: (a) => `${a} should feel the brighter morning you're selling.` },
  { word: "Intelligence", why: (a) => `${a} should feel they're in clever, capable hands.` },
  { word: "Rebellion", why: (a) => `${a} who are tired of the usual will feel seen.` },
  { word: "Belonging", why: (a) => `${a} should feel part of something, not sold to.` },
  { word: "Confidence", why: (a) => `${a} should feel sure the moment they hear it.` },
  { word: "Wonder", why: (a) => `A spark of magic that makes ${a} lean in.` },
  { word: "Heritage", why: (a) => `${a} should feel there's something timeless and proven here.` },
];

export function localFeelings(brief: Brief): { feelings: Feeling[] } {
  const r = rng(hash("feelings" + brief.does + brief.audience + brief.problem));
  const aud = (brief.audience || "the people you serve").trim();
  const a = aud.charAt(0).toLowerCase() + aud.slice(1); // lower-case for mid-sentence use
  return { feelings: sample(r, FEELING_POOL, FEELING_POOL.length).slice(0, 14).map((f) => ({ word: f.word, why: f.why(a) })) };
}

export function localConcepts(brief: Brief): { concepts: Concept[] } {
  const r = rng(hash(JSON.stringify(brief)));
  const frames = sample(r, FRAMES, FRAMES.length).slice(0, 10);
  return { concepts: frames.map((f) => ({ title: f.t, blurb: f.b, lane: f.lane })) };
}

export function localExplore(brief: Brief, concept: Concept): TerritoryWorld {
  const r = rng(hash(concept.title + brief.does));
  const fromConcept = concept.blurb.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w));
  const words = sample(r, [...new Set([...fromConcept, ...keywords(brief), ...EVOCATIVE])], 10);
  const expressions = sample(r, EXPRESSIONS, 3); // a few "expressions" alongside the words
  const seeds = sample(r, [...words, ...expressions], 13);
  return {
    title: concept.title,
    blurb: concept.blurb,
    words: seeds.map((w) => ({ word: w, related: relatedFor(r, w.split(/\s+/)[0]) })),
  };
}

export function localNames(brief: Brief, sketch: Sketch): { names: NameIdea[] } {
  const r = rng(hash(JSON.stringify(sketch) + brief.does + Math.floor(Math.random() * 1e6)));
  const lanes = (brief.lanes?.length ? brief.lanes : ["suggestive", "compound", "invented", "evocative"]);
  // Seed words = the words the founder picked in the constellation + the brief.
  const chosen = (sketch?.words || []).map((w) => w.toLowerCase().replace(/[^a-z]/g, "")).filter((w) => w.length > 2);
  const pool = [...new Set([...chosen, ...keywords(brief)])];
  if (!pool.length) pool.push(...keywords(brief));
  const out: NameIdea[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < 12 && guard < 400) {
    guard++;
    const word = pick(r, pool);
    const lane = pick(r, lanes);
    const base = word.replace(/[^a-z]/gi, "");
    if (!base) continue;
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
      rationale: `From "${word}", ${pick(r, ["short and ownable", "easy to say once heard", "carries the story without explaining", "a real word in a new place", "invented, so it's yours"])}.`,
      score: 70 + Math.floor(r() * 28),
    });
  }
  return { names: out.sort((a, b) => b.score - a.score) };
}

export function localCompare(_brief: Brief, names: { name: string; type?: string }[]): Comparison {
  const r = rng(hash(JSON.stringify(names)));
  const rows = names.map((n) => {
    const I = 3 + Math.floor(r() * 3), V = 3 + Math.floor(r() * 3), S = 3 + Math.floor(r() * 3), E = 3 + Math.floor(r() * 3);
    const short = n.name.replace(/[^a-z0-9]/gi, "").length <= 6;
    const comFree = short ? r() > 0.7 : r() > 0.45; // shorter names tend to be taken
    const inpi = r() > 0.35;
    return {
      name: n.name, intuitive: I, visual: V, sound: S, emotional: E, total: I + V + S + E,
      domains: [
        { tld: ".com", available: comFree },
        { tld: ".io", available: r() > 0.35 },
        { tld: ".ai", available: r() > 0.3 },
      ],
      inpi,
      inpiNote: inpi ? "No earlier mark in classes 9 / 42 (estimate)" : "Possible earlier mark, worth a closer look (estimate)",
      instagram: short ? r() > 0.6 : r() > 0.4, // shorter handles tend to be taken
      verdict: pick(r, ["Strong, ownable, easy to say.", "Memorable with a clear story.", "Distinctive and confident.", "Warm and human; reads well."]),
    };
  }).sort((a, b) => b.total - a.total);
  const best = rows[0];
  return {
    rows,
    recommended: best?.name || "",
    why: best ? `Honestly? ${best.name} is the one we'd run with. It's easy to say after hearing it once, it's distinctive and ownable, and it leaves you room to grow. (Demo reasoning, connect real Claude for the full analysis.)` : "",
  };
}

// ---- brand book (fallback) ----
const BB_PALETTES: { hex: string; name: string; role: string }[][] = [
  [
    { hex: "#1F1B18", name: "Espresso", role: "Ink" },
    { hex: "#C9774E", name: "Terracotta", role: "Primary" },
    { hex: "#E8B08A", name: "Clay", role: "Accent" },
    { hex: "#F2ECE2", name: "Paper", role: "Surface" },
    { hex: "#5B7065", name: "Sage", role: "Highlight" },
  ],
  [
    { hex: "#16181D", name: "Midnight", role: "Ink" },
    { hex: "#3B6CF6", name: "Signal Blue", role: "Primary" },
    { hex: "#7FA0FF", name: "Sky", role: "Accent" },
    { hex: "#F5F6F8", name: "Cloud", role: "Surface" },
    { hex: "#10B981", name: "Mint", role: "Highlight" },
  ],
  [
    { hex: "#221E2B", name: "Aubergine", role: "Ink" },
    { hex: "#7C5CFF", name: "Violet", role: "Primary" },
    { hex: "#B9A7FF", name: "Lilac", role: "Accent" },
    { hex: "#F4F1FA", name: "Mist", role: "Surface" },
    { hex: "#F2B705", name: "Amber", role: "Highlight" },
  ],
  [
    { hex: "#1A1F1C", name: "Forest", role: "Ink" },
    { hex: "#2F8F6B", name: "Pine", role: "Primary" },
    { hex: "#8FCBB0", name: "Eucalyptus", role: "Accent" },
    { hex: "#F1F4F0", name: "Linen", role: "Surface" },
    { hex: "#E0793B", name: "Ember", role: "Highlight" },
  ],
];

function fontKeyFor(brief: Brief): string {
  const t = [...(brief.tone || []), ...(brief.signal || [])].join(" ").toLowerCase();
  if (/play|fun|warm|friend/.test(t)) return "friendly";
  if (/tech|modern|smart|fast|innovat/.test(t)) return "modern";
  if (/premium|elegan|herit|refined|trust/.test(t)) return "classic";
  if (/craft|honest|calm|warm/.test(t)) return "warm";
  return "editorial";
}

export function localBrandbook(brief: Brief, name: string): BrandBook {
  const r = rng(hash(name + brief.does + brief.audience));
  const aud = (brief.audience || "the people you serve").trim();
  const a = aud.charAt(0).toLowerCase() + aud.slice(1);
  const does = (brief.does || "what you do").trim().replace(/\.$/, "");
  const doesLower = does.charAt(0).toLowerCase() + does.slice(1);
  const adj = (brief.signal?.length ? brief.signal : ["Bold", "Warm", "Clear", "Modern"]).slice(0, 4);
  const palette = pick(r, BB_PALETTES);
  const tagline = pick(r, [`Naming, done right.`, `${name}. Made to be remembered.`, `Less noise. More ${pick(r, ["signal", "soul", "clarity"])}.`, `Start before you're ready.`]);
  return {
    essence: `${cap(adj[0] || "Bold")}, ${(adj[1] || "human").toLowerCase()}, unmistakably ${name}.`,
    tagline,
    story: `${name} is ${doesLower}. It's built for ${a}, who deserve better than the generic option. Where others settle, ${name} brings taste and intent to every detail.`,
    whyName: `"${name}" is short, ownable and easy to say once heard, it carries the brand's story without needing to explain it.`,
    voice: {
      adjectives: adj,
      dos: ["Say it plainly, clarity over cleverness.", "Talk to one person, warmly.", "Lead with the benefit, not the feature."],
      donts: ["No jargon or buzzwords.", "Don't oversell or shout.", "Avoid hedging, be confident."],
      sample: `Meet ${name}, ${doesLower}, without the usual headache.`,
    },
    palette,
    fontKey: fontKeyFor(brief),
    fontNote: `A pairing that reads ${(adj[0] || "modern").toLowerCase()} and ${(adj[1] || "clear").toLowerCase()}, confident headlines, effortless body text.`,
    messaging: {
      pitch: `${name} is ${doesLower}, built for ${a}, faster, and with more taste.`,
      boilerplate: `${name} is ${doesLower}. Founded for ${a}, it turns a slow, frustrating process into something quick, confident and genuinely good.`,
      taglines: [tagline, `${name}, ${cap(adj[0] || "bold")} by design.`, `The ${(adj[1] || "simple").toLowerCase()} way to ${pick(r, ["start", "build", "ship"])}.`],
      valueProps: [`${cap(adj[0] || "Fast")} where it used to be slow.`, `Made for ${a}, not the masses.`, `Taste and rigor, in one place.`],
    },
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
  "Hey! So tell me, what does your company do, in a nutshell?",
  "Love it. Who's the main person you picture using this?",
  "And what problem are you really solving for them?",
  "What should the name feel like, any vibe words?",
  "Anything the name should definitely avoid?",
];
export function localInterview(messages: Msg[]): InterviewTurn {
  const userTurns = messages.filter((m) => m.role === "user");
  if (userTurns.length < Q.length) return { say: Q[userTurns.length], done: false };
  const a = userTurns.map((m) => m.text);
  return {
    say: "Perfect, I've got a clear picture. Let me find some names. (Demo brief, connect real Claude for a deeper read.)",
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
