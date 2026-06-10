// Deterministic client-side "studio" for the v2 funnel. Runs all 7 phases with
// no backend so the live GitHub Pages demo is fully explorable. When real Claude
// + real availability checks land (Phase B/C) the studioApi swaps these out
// behind the same interface. Clearly demo-grade, but coherent and on-brand.

import type {
  Availability,
  AvailabilityState,
  NameBrief,
  NameCandidate,
  PressureTest,
  ScratchFlags,
  SmileScore,
  SoundscapeAnalysis,
  Stance,
  Territory,
  TestResult,
} from "./types";

/* ------------------------------ rng + helpers ----------------------------- */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
const pick = <T,>(r: () => number, a: T[]): T => a[Math.floor(r() * a.length)];
const sample = <T,>(r: () => number, a: T[], n: number): T[] =>
  [...a].sort(() => r() - 0.5).slice(0, n);
const clean = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

const STOP = new Set([
  "a", "an", "the", "for", "and", "or", "to", "of", "in", "on", "with", "that",
  "app", "platform", "tool", "your", "you", "we", "it", "is", "helps", "turns",
  "into", "make", "makes", "this", "these", "own", "story", "whole", "people",
]);

function keywords(b: NameBrief): string[] {
  const text = [b.whatItDoes, b.oneThingToOwn, b.category, b.audience].join(" ").toLowerCase();
  const ws = text
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w));
  return [...new Set(ws)];
}

/* ------------------------------ phase 1 helpers --------------------------- */
export const PERSONALITY_POOL = [
  "Bold", "Warm", "Premium", "Playful", "Minimal", "Technical",
  "Trustworthy", "Rebellious", "Calm", "Crafted", "Optimistic", "Sharp",
];

// Reflect a tension between the chosen personality and the name-job slider.
export function briefTension(b: NameBrief): string | null {
  const p = b.personality.map((x) => x.toLowerCase());
  const abstract = b.nameJob >= 60;
  const descriptive = b.nameJob <= 35;
  if (abstract && (p.includes("trustworthy") || p.includes("minimal"))) {
    return `You picked an empty-vessel name, but also "${b.personality.find((x) => /trust|minimal/i.test(x))}". Abstract names feel exciting, yet they take longer to earn trust. Worth deciding which matters more in year one.`;
  }
  if (descriptive && (p.includes("bold") || p.includes("rebellious") || p.includes("premium"))) {
    return `You leaned descriptive, but your personality reads "${b.personality.find((x) => /bold|rebel|premium/i.test(x))}". Descriptive names are clear, but rarely feel premium or daring. There's a tradeoff to make with eyes open.`;
  }
  if (p.includes("playful") && p.includes("trustworthy")) {
    return `"Playful" and "Trustworthy" pull in opposite directions. The best names hold both, but most lean one way. Which is the first impression you want?`;
  }
  return null;
}

/* ------------------------------ phase 2: soundscape ----------------------- */
// Map a competitor name onto the two axes:
//  x: descriptive (0) -> abstract (100), via real-word-ness + length
//  y: soft (0) -> sharp (100), via plosive/hard-consonant density
const HARD = new Set("ktpbdgxqz".split(""));
const SOFT = new Set("lmnswyh".split(""));
const VOWELS = new Set("aeiouy".split(""));
const DICTISH = new Set([
  "apple", "amazon", "shield", "north", "spark", "bloom", "atlas", "summit",
  "river", "stripe", "square", "slack", "notion", "linear", "figma", "monday",
]);

function axesFor(name: string): { x: number; y: number } {
  const w = clean(name);
  if (!w) return { x: 50, y: 50 };
  const hard = [...w].filter((c) => HARD.has(c)).length;
  const soft = [...w].filter((c) => SOFT.has(c)).length;
  const vowelRatio = [...w].filter((c) => VOWELS.has(c)).length / w.length;
  // sharper = more hard consonants, fewer vowels
  const y = clamp(50 + (hard - soft) * 14 - (vowelRatio - 0.4) * 60, 6, 94);
  // more abstract = longer, fewer dictionary roots, invented endings
  const dictish = DICTISH.has(w) || /(ify|ly|hub|soft|tech|data|cloud)$/.test(w);
  const x = clamp((dictish ? 26 : 58) + (w.length - 6) * 4 + (vowelRatio > 0.5 ? 12 : 0), 6, 94);
  return { x: Math.round(x), y: Math.round(y) };
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function localSoundscape(brief: NameBrief): SoundscapeAnalysis {
  const r = rng(hash("sound" + brief.competitors.join() + brief.category));
  const comps = brief.competitors.filter(Boolean).slice(0, 6);
  const competitorPoints = comps.map((name) => ({ name, ...axesFor(name) }));

  const avgX = competitorPoints.length
    ? competitorPoints.reduce((s, p) => s + p.x, 0) / competitorPoints.length
    : 50;
  const avgY = competitorPoints.length
    ? competitorPoints.reduce((s, p) => s + p.y, 0) / competitorPoints.length
    : 50;

  const lens = comps.map(clean).filter(Boolean);
  const avgLen = lens.length ? lens.reduce((s, w) => s + w.length, 0) / lens.length : 7;
  const endings = lens.map((w) => w.slice(-2));
  const sharp = avgY > 55;

  const patterns = [
    `Names cluster around ${Math.round(avgLen)} letters, ${avgLen < 6 ? "short and punchy" : avgLen > 8 ? "longer and more descriptive" : "a comfortable middle"}.`,
    sharp
      ? "The category sounds sharp, lots of hard consonants and clipped endings."
      : "The category sounds soft, vowel-heavy and rounded.",
    avgX > 55
      ? "Most leaders lean abstract, invented or borrowed words over plain description."
      : "Most leaders stay descriptive, they say what they do.",
    endings.length ? `Common endings: ${[...new Set(endings)].slice(0, 3).join(", ")}.` : "No dominant ending, the field is open.",
  ];

  // Recommend a stance: if the room is crowded and same-y, break; else blend.
  const spreadX = competitorPoints.length
    ? Math.max(...competitorPoints.map((p) => p.x)) - Math.min(...competitorPoints.map((p) => p.x))
    : 40;
  const recommendedStance: Stance = spreadX < 34 ? "break" : "blend";

  // Founder target zone: pulled by the name-job slider on x, and a deliberate
  // contrast on y if we recommend breaking.
  const targetX = clamp(Math.round(brief.nameJob), 12, 88);
  const targetY = recommendedStance === "break" ? clamp(Math.round(100 - avgY), 12, 88) : clamp(Math.round(avgY + (r() * 16 - 8)), 12, 88);

  const read = recommendedStance === "break"
    ? `Everyone here sounds the same. That's your opening, a name that breaks the pattern will be the one people remember.`
    : `This category has a recognizable sound. Borrow just enough of it to feel native, then add one twist that's unmistakably yours.`;

  return {
    patterns,
    axes: { x: "descriptive  →  abstract", y: "soft  →  sharp" },
    competitorPoints,
    read,
    recommendedStance,
    target: { x: targetX, y: targetY },
  };
}

/* ------------------------------ phase 3: territories ---------------------- */
const TERRITORY_POOL: Omit<Territory, "selected">[] = [
  {
    id: "invented",
    name: "The invented word",
    description: "A coined word that belongs to no one else, yours to define from zero.",
    examplePattern: "Spotify · Zalando · Verizon",
    buys: "Maximal distinctiveness and ownability, the domain and trademark are usually clear.",
    costs: "You'll spend marketing budget teaching what it means, it starts empty.",
  },
  {
    id: "metaphor",
    name: "The metaphor",
    description: "Borrow a vivid image from the real world and let it carry the idea.",
    examplePattern: "Stripe · Amazon · Bumble",
    buys: "Instant imagery and emotion, easy to remember and design around.",
    costs: "The best metaphors are often taken, you may fight for the domain.",
  },
  {
    id: "founder",
    name: "The founder-as-character",
    description: "A human name, real or invented, that gives the brand a face and a voice.",
    examplePattern: "Warby Parker · Oscar · Monzo",
    buys: "Warmth and trust, people relate to a someone, not a something.",
    costs: "Harder to sound big or technical, and personal names can feel small.",
  },
  {
    id: "insider",
    name: "The insider code",
    description: "A name that reads like a password, only the right people get it, and they feel chosen.",
    examplePattern: "Asana · Koan · Notion",
    buys: "A sense of belonging, the in-crowd recognizes itself.",
    costs: "Outsiders may not get it at first, needs confident launch copy.",
  },
  {
    id: "inversion",
    name: "The ironic inversion",
    description: "Name it the opposite of what it is, and let the wink do the work.",
    examplePattern: "Ordinary · Liquid Death · Dumb",
    buys: "Memorable and bold, the contradiction sticks in the mind.",
    costs: "Risky if the joke wears thin, demands a brand that can carry attitude.",
  },
  {
    id: "compound",
    name: "The smart compound",
    description: "Two honest words fused into one that says more than either alone.",
    examplePattern: "Facebook · Salesforce · Mailchimp",
    buys: "Clear meaning with a touch of craft, easy to grasp and spell.",
    costs: "Can feel literal or dated if the two words are too obvious.",
  },
  {
    id: "classical",
    name: "Borrowed from the classics",
    description: "A Greek or Latin root with built-in gravity, a god, a place, a virtue.",
    examplePattern: "Nike · Aria · Atlas",
    buys: "Instant weight and timelessness, feels established on day one.",
    costs: "Overused in some categories, can feel generic-premium if not handled well.",
  },
  {
    id: "nature",
    name: "Borrowed from nature",
    description: "A plant, an animal, a turn of weather, instantly visual and ownable.",
    examplePattern: "Lotus · Robinhood · Mint",
    buys: "Vivid, friendly, and easy to illustrate, a logo writes itself.",
    costs: "Popular roots are crowded, distinctiveness depends on the twist.",
  },
];

export function localTerritories(brief: NameBrief, stance: Stance): { territories: Territory[] } {
  const r = rng(hash("terr" + brief.whatItDoes + stance + brief.nameJob));
  // Bias the lineup toward the founder's stance and name-job.
  const abstract = brief.nameJob >= 55;
  let pool = [...TERRITORY_POOL];
  if (abstract) pool = pool.sort((a) => (["invented", "insider", "classical"].includes(a.id) ? -1 : 1));
  else pool = pool.sort((a) => (["compound", "metaphor", "nature"].includes(a.id) ? -1 : 1));
  if (stance === "break") pool = pool.sort((a) => (["inversion", "invented", "insider"].includes(a.id) ? -1 : 0));
  const chosen = pool.slice(0, 6);
  return {
    territories: sample(r, chosen, chosen.length).map((t) => ({ ...t, selected: false })),
  };
}

/* ------------------------------ phase 4: words ---------------------------- */
// Richer word craft than v1: roots, blends, sound symbolism. Each seed branches.
const GREEK_LATIN = ["lumen", "astra", "nova", "vela", "orbis", "vita", "aero", "terra", "sol", "lux", "meridian", "aurora", "cobalt", "kairos", "nimbus"];
const SHARP = ["spark", "forge", "edge", "pulse", "kit", "bolt", "crux", "apex", "flux", "dart"];
const CALM = ["haven", "willow", "drift", "grove", "lull", "meadow", "harbor", "linen", "dawn", "still"];
const SUF = ["ly", "ora", "io", "wave", "lab", "mint", "flow", "loop", "field", "kit", "able", "ary"];
const PRE = ["lumo", "nova", "vela", "kai", "ora", "sol", "wren", "halo", "vero", "atlas", "ember", "lyra"];

function branch(r: () => number, w: string): string[] {
  const base = clean(w) || w;
  const suf = SUF.filter((s) => !base.endsWith(s));
  const out = [
    cap(base) + pick(r, suf),
    cap(base.slice(0, 4)) + pick(r, ["ix", "en", "is", "ora", "yl"]),
    cap(pick(r, PRE)) + base.slice(0, 3),
    cap(pick(r, GREEK_LATIN)),
    base.length > 3 ? base.slice(0, 3).toUpperCase() : null,
  ].filter((s): s is string => !!s && s.length > 1);
  return [...new Set(out)].filter((s) => clean(s) !== base).slice(0, 5);
}

// A "world" of words for one territory, shaped by the brief's tone.
export function localWords(brief: NameBrief, territory: Territory): { word: string; related: string[] }[] {
  const r = rng(hash("words" + territory.id + brief.whatItDoes));
  const sharp = /bold|sharp|technical|rebellious/i.test(brief.personality.join(" "));
  const palette = sharp ? [...SHARP, ...GREEK_LATIN] : [...CALM, ...GREEK_LATIN];
  const fromTerritory: Record<string, string[]> = {
    invented: GREEK_LATIN,
    metaphor: ["river", "stripe", "compass", "lantern", "anchor", "bridge", "summit", "current"],
    founder: ["margot", "oscar", "wren", "august", "cleo", "milo", "iris", "hugo"],
    insider: ["koan", "cipher", "vellum", "quorum", "lattice", "atlas", "rune", "ember"],
    inversion: ["ordinary", "humble", "quiet", "slow", "plain", "modest", "tiny"],
    compound: ["sunfold", "wellmade", "truepath", "openfield", "brightloom"],
    classical: GREEK_LATIN,
    nature: ["lotus", "willow", "cobalt", "heron", "fern", "tide", "birch", "moss"],
  };
  const seedPool = [
    ...(fromTerritory[territory.id] || []),
    ...keywords(brief).slice(0, 5),
    ...sample(r, palette, 4),
  ];
  const seeds = [...new Set(seedPool)].slice(0, 13);
  return seeds.map((w) => ({ word: w, related: branch(r, w) }));
}

/* ----------------- phase 4: whiteboard exploration (category buckets) ----- */
// Opening a concept on the board reveals three ways to mine it for material.
const FAMOUS = [
  "Kyoto", "Lisbon", "Patagonia", "the Atlas range", "Santorini", "Reykjavik",
  "Marrakech", "the Dolomites", "Havana", "Kerala", "Ada Lovelace", "the Bauhaus",
  "Coco Chanel", "Miyazaki", "Nikola Tesla", "Hemingway", "Frida Kahlo",
  "Le Corbusier", "Athena", "Magellan", "Amelia Earhart", "Brunelleschi",
];
const QUOTE_POOL = [
  "less, but better", "stay hungry", "make it new", "form follows function",
  "the medium is the message", "real artists ship", "good design is honest",
  "start before you're ready", "leave room to grow", "say it once, mean it",
  "what you do, not what you say", "small is the new big",
];

export interface TerritoryExplore { synonyms: string[]; famous: string[]; quotes: string[] }

export function localExploreTerritory(brief: NameBrief, territory: Territory): TerritoryExplore {
  const r = rng(hash("explore" + territory.id + brief.whatItDoes));
  // Synonyms & acronyms: the word craft, plus a couple of acronym-ish forms.
  const words = localWords(brief, territory).map((w) => w.word);
  const acronyms = sample(r, [...keywords(brief), ...words], 2)
    .map((w) => clean(w).slice(0, 3).toUpperCase())
    .filter((a) => a.length >= 2);
  const synonyms = [...new Set([...sample(r, words, 6), ...acronyms])].slice(0, 7);
  return {
    synonyms,
    famous: sample(r, FAMOUS, 6),
    quotes: sample(r, QUOTE_POOL, 5),
  };
}

// Real words, concepts and expressions to mine, never invented brand names.
// (Coined name candidates belong in the shortlist, not the exploration board.)
const CONCEPT_WORDS = [
  "light", "signal", "north", "craft", "clarity", "trust", "momentum", "edge", "current", "anchor",
  "compass", "threshold", "origin", "depth", "motion", "focus", "spark", "ground", "horizon", "summit",
  "river", "stone", "ember", "dawn", "tide", "grove", "harbor", "lantern", "thread", "weave",
  "forge", "balance", "rhythm", "echo", "pulse", "drift", "bloom", "root", "instinct", "precision",
  "velocity", "gravity", "texture", "contrast", "tension", "release", "flow", "clear", "quiet", "true",
];
const CONCEPT_PHRASES = [
  "first principles", "quiet confidence", "slow craft", "raw material", "open road", "north star",
  "clean lines", "second nature", "common ground", "fresh eyes", "negative space", "sharp focus",
];

// Open any leaf item one level deeper into related words, concepts and
// expressions, on demand. No coined brand names.
export function expandItem(label: string): string[] {
  const r = rng(hash("assoc:" + label));
  const base = clean(label.split(/\s+/)[0]);
  const pool = [...CONCEPT_WORDS, ...CONCEPT_PHRASES];
  return sample(r, pool.filter((w) => clean(w) !== base), 5);
}

// A short studio "read" of a word or quote, shown on hover. Demo-grade glosses
// now; real Claude returns true descriptions once the backend is wired.
const WORD_GLOSS: ((w: string, c: string) => string)[] = [
  (w, c) => `Where ${c} turns concrete, ${w} you can almost touch.`,
  (w) => `Small, sharp, unmistakable. ${cap(w)} is the part people repeat.`,
  (_w, c) => `The feeling of ${c}, distilled into a single word.`,
  (w) => `A thread worth pulling, ${w} opens onto a dozen others.`,
  (w) => `Quiet confidence. ${cap(w)} never has to raise its voice.`,
  (w) => `Plainspoken and ownable. ${cap(w)} says it once and means it.`,
  (w) => `Evocative, not literal. ${cap(w)} leaves room to grow into.`,
];
const QUOTE_GLOSS: ((c: string) => string)[] = [
  (c) => `A line to live by, the spirit of ${c} said out loud.`,
  (c) => `Borrow the cadence, not the words. Pure ${c}.`,
  (c) => `The mood in one breath, ${c} with a pulse.`,
];
export function describeNode(label: string, concept: string, kind: "word" | "quote"): string {
  const c = (concept || "the idea").toLowerCase();
  const r = rng(hash("desc:" + kind + label + concept));
  return kind === "quote" ? pick(r, QUOTE_GLOSS)(c) : pick(r, WORD_GLOSS)(label.toLowerCase(), c);
}

// The opening cloud of the exploration board: many real words and a few quotes
// drawn from the chosen concepts. The concepts themselves are NOT shown, the
// founder plays with the material directly.
export interface BoardSeed { label: string; kind: "word" | "quote"; concept: string; description: string }
export function localBoardSeeds(brief: NameBrief, territories: Territory[]): BoardSeed[] {
  const out: BoardSeed[] = [];
  territories.forEach((t) => {
    const r = rng(hash("board" + t.id + brief.whatItDoes));
    const ex = localExploreTerritory(brief, t);
    const wordPool = [...ex.synonyms.filter((w) => w !== w.toUpperCase()), ...ex.famous]; // drop ALLCAPS acronyms
    sample(r, wordPool, 5).forEach((w) => out.push({ label: w, kind: "word", concept: t.name, description: describeNode(w, t.name, "word") }));
    sample(r, ex.quotes, 1).forEach((q) => out.push({ label: q, kind: "quote", concept: t.name, description: describeNode(q, t.name, "quote") }));
  });
  const seen = new Set<string>();
  return out.filter((s) => {
    const k = s.label.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 14);
}

/* ------------------------------ phase 5: candidates ----------------------- */
function smileFor(r: () => number, name: string, nameJob: number): SmileScore {
  const w = clean(name);
  const short = w.length <= 7;
  const vowelRatio = [...w].filter((c) => VOWELS.has(c)).length / Math.max(1, w.length);
  const base = (lo: number) => lo + Math.floor(r() * 22);
  // Descriptive names score higher on suggestive; abstract on memorable/imagery.
  const descriptive = nameJob <= 45;
  const suggestive = clamp((descriptive ? 70 : 48) + base(0) - 10, 20, 98);
  const memorable = clamp((short ? 72 : 56) + base(0) - 8, 20, 98);
  const imagery = clamp((descriptive ? 58 : 66) + base(0) - 10, 20, 98);
  const legs = clamp((short ? 70 : 58) + base(0) - 10, 20, 98);
  const emotional = clamp(54 + Math.round(vowelRatio * 30) + base(0) - 12, 20, 98);
  const overall = Math.round((suggestive + memorable + imagery + legs + emotional) / 5);
  return { suggestive, memorable, imagery, legs, emotional, overall };
}

function scratchFor(
  r: () => number,
  name: string,
  soundscape: SoundscapeAnalysis | undefined,
  markets: string[],
): ScratchFlags {
  const w = clean(name);
  const doubled = /(.)\1/.test(w);
  const tricky = /(ph|gh|gn|kn|mn|x|q(?!u)|y.{0,1}y)/.test(w) || (w.match(/[^aeiou]{3,}/) ? true : false);
  // Copycat: sounds close to a charted competitor (shared 3-letter start).
  const copycat = !!soundscape?.competitorPoints.some((c) => clean(c.name).slice(0, 3) === w.slice(0, 3) && clean(c.name) !== w);
  const longish = w.length >= 11;
  // Market-specific bad-meaning flag, rare and deterministic.
  const badMeaning = r() > 0.86 && markets.length ? [pick(r, markets)] : undefined;
  return {
    spellingChallenged: tricky || doubled,
    copycat,
    restrictive: /\b(app|hub|soft|cloud|france|paris|euro)\b/i.test(name) || longish,
    annoying: doubled && w.length > 8,
    tame: false, // set after SMILE below
    hardToPronounce: tricky || (w.match(/[^aeiou]{4,}/) ? true : false),
    badMeaningInMarkets: badMeaning,
  };
}

function availabilityFor(r: () => number, name: string, markets: string[]): Availability {
  const w = clean(name);
  const short = w.length <= 6;
  const state = (p: number): AvailabilityState => (r() > p ? "available" : "taken");
  const com: AvailabilityState = short ? (r() > 0.72 ? "available" : r() > 0.4 ? "premium" : "taken") : state(0.45);
  const inpiFr = markets.includes("FR") || markets.length === 0;
  return {
    domainCom: com,
    otherTlds: { ".io": state(0.4), ".co": state(0.35) },
    instagram: short ? (r() > 0.6 ? "available" : "taken") : state(0.45),
    trademarkINPI: inpiFr ? (r() > 0.4 ? "clear" : "conflict") : "unknown",
    checkedAt: new Date().toISOString(),
  };
}

export function localCandidates(
  brief: NameBrief,
  keptWords: string[],
  territories: Territory[],
  soundscape: SoundscapeAnalysis | undefined,
  count = 8,
  seed = 0,
): { candidates: NameCandidate[] } {
  const r = rng(hash("cand" + keptWords.join() + brief.whatItDoes + seed));
  const chosen = keptWords.map(clean).filter((w) => w.length > 2);
  const pool = [...new Set([...chosen, ...keywords(brief)])];
  if (!pool.length) pool.push(...GREEK_LATIN);
  const selected = territories.filter((t) => t.selected);
  const lanes = selected.length ? selected : territories.slice(0, 2);

  const out: NameCandidate[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < count && guard < 600) {
    guard++;
    const word = pick(r, pool);
    const terr = lanes.length ? pick(r, lanes) : undefined;
    const base = clean(word);
    if (!base) continue;
    let name = "";
    switch (terr?.id) {
      case "invented":
        name = cap(pick(r, PRE) + pick(r, SUF));
        break;
      case "compound":
        name = cap(base) + cap(pick(r, SUF));
        break;
      case "metaphor":
      case "nature":
      case "classical":
        name = cap(base);
        break;
      case "inversion":
        name = cap(pick(r, ["ordinary", "humble", "quiet", "plain", "modest"]));
        break;
      default:
        name = r() > 0.5 ? cap(base) : cap(base.replace(/[aeiou]+$/i, "") + pick(r, SUF));
    }
    if (!name || name.length < 3 || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());

    const smile = smileFor(r, name, brief.nameJob);
    const scratch = scratchFor(r, name, soundscape, brief.targetMarkets);
    scratch.tame = smile.memorable < 52 && smile.emotional < 52;
    const availability = availabilityFor(r, name, brief.targetMarkets);

    // Ownable gate: .com not flat-out taken, no INPI conflict, not a copycat.
    const ownable =
      availability.domainCom !== "taken" &&
      availability.trademarkINPI !== "conflict" &&
      !scratch.copycat;

    out.push({
      id: "c" + hash(name).toString(36),
      name,
      territoryId: terr?.id || "",
      rationale: `From "${word}", ${pick(r, [
        "short and ownable",
        "easy to say once heard",
        "carries the story without explaining it",
        "a real word in a new place",
        "invented, so it's entirely yours",
      ])}.`,
      smile,
      scratch,
      availability,
      ownable,
    });
  }
  // Ownable first, then by SMILE.
  out.sort((a, b) => Number(b.ownable) - Number(a.ownable) || b.smile.overall - a.smile.overall);
  return { candidates: out };
}

/* ------------------------------ phase 6: pressure tests ------------------- */
const MARKET_NOTES: Record<string, (w: string) => { result: TestResult; note?: string }> = {
  FR: (w) => (/(con|bite|pute|merde)/i.test(w) ? { result: "warn", note: "Reads awkwardly in French slang, double-check." } : { result: "pass" }),
  US: (w) => (/(gift|fart|crap)/i.test(w) ? { result: "warn", note: "Unintended English read, worth a second look." } : { result: "pass" }),
  EU: () => ({ result: "pass" }),
  UK: (w) => (/(bum|bog)/i.test(w) ? { result: "warn", note: "British-English slang clash." } : { result: "pass" }),
};

export function localPressureTest(brief: NameBrief, candidate: NameCandidate): PressureTest {
  const r = rng(hash("ptest" + candidate.name));
  const w = clean(candidate.name);
  const grade = (ok: boolean, warn: boolean): TestResult => (ok ? "pass" : warn ? "warn" : "fail");

  const sayable = !candidate.scratch.hardToPronounce && w.length <= 11;
  const barTest = grade(sayable, w.length <= 13 && !candidate.scratch.hardToPronounce);

  const spellable = !candidate.scratch.spellingChallenged;
  const spellTest = grade(spellable, !/(ph|gh|x){2,}/.test(w));

  const markets = brief.targetMarkets.length ? brief.targetMarkets : ["FR"];
  const linguisticSafety = markets.map((m) => {
    const f = MARKET_NOTES[m] || (() => ({ result: "pass" as TestResult }));
    return { market: m, ...f(w) };
  });

  // Stretch: short, abstract names extend best (sub-brands, .verb).
  const stretch = w.length <= 8 && brief.nameJob >= 40;
  const stretchTest = grade(stretch, w.length <= 10);
  // a touch of variety so not every finalist looks identical
  void r;

  return { candidateId: candidate.id, barTest, spellTest, linguisticSafety, stretchTest };
}

/* ------------------------------ phase 7: rationale + brand bridge --------- */
export function localRationale(brief: NameBrief, candidate: NameCandidate): string {
  const does = (brief.whatItDoes || "what you do").replace(/\.$/, "");
  const aud = brief.audience || "the people you serve";
  const own = brief.oneThingToOwn || "the thing you want to be known for";
  return `${candidate.name} is the one we'd put our name behind. It does the quiet, hard job a great name has to do: it's easy to say after hearing it once, it leaves room to grow, and it doesn't waste a syllable explaining ${does.toLowerCase()}. For ${aud.toLowerCase()}, it signals ${own.toLowerCase()} without trying too hard. The checks back it up, the .com is reachable and the French register looks clear. Most names make you choose between distinctive and ownable. This one refuses to.`;
}

// Bridge the v2 NameBrief into the shape v1's BrandBook component expects, so we
// can reuse that whole component for the phase-7 paid product (stable interface).
export function toLegacyBrief(brief: NameBrief): import("../lib/namingApi").Brief {
  return {
    does: brief.whatItDoes,
    industry: brief.category,
    problem: "",
    audience: brief.audience,
    values: brief.oneThingToOwn,
    uvp: brief.oneThingToOwn,
    signal: brief.personality.slice(0, 4),
    avoid: [],
    tone: brief.personality.slice(0, 3),
    lanes: [],
  };
}
