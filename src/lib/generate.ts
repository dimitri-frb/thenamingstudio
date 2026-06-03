// the naming atelier — name engine: a self-contained generator built around the team's
// naming framework (see the Figma research): 9 name types, scored on 4 axes
// (Intuitive / Visual / Sound / Emotional) plus a SMILE check.
//
// In production this would call an LLM; for the V1 preview it runs fully
// client-side so the funnel works with zero setup or API keys.

export type Vibe =
  | "Modern"
  | "Bold"
  | "Playful"
  | "Premium"
  | "Minimal"
  | "Techy"
  | "Friendly"
  | "Trustworthy";

// The 9 name types from the research, with their archetypes.
export type NameType =
  | "Descriptive" // Dropbox, Booking.com — instant clarity
  | "Suggestive" // Amazon, Uber, Slack — the sweet spot ★
  | "Compound" // Facebook, YouTube, PayPal
  | "Invented" // Google, Spotify, Kodak
  | "AbstractRealWord" // Apple, Stripe, Notion
  | "FounderName" // Tesla, Chanel, Disney
  | "Acronym" // IBM, BMW, HBO
  | "Evocative" // Calm, Innocent, Virgin
  | "Playful"; // Liquid Death, Yahoo!

export interface Brief {
  description: string;
  vibes: Vibe[];
  types: NameType[];
  include: string;
  avoid: string;
}

export interface Axes {
  intuitive: number; // can it be understood at a glance?
  visual: number; // does it look good written down?
  sound: number; // does it sound good said aloud?
  emotional: number; // does it make you feel something?
}

export interface NameIdea {
  name: string;
  tagline: string;
  domain: string;
  domainAvailable: boolean;
  premiumDomain: boolean;
  type: NameType;
  rationale: string;
  axes: Axes;
  score: number; // composite "brand strength" 0-100
}

export const TYPE_META: Record<
  NameType,
  { label: string; examples: string; desc: string; star?: boolean }
> = {
  Descriptive: { label: "Descriptive", examples: "Dropbox, Booking", desc: "Instant clarity. Best for MVPs." },
  Suggestive: { label: "Suggestive", examples: "Amazon, Uber, Slack", desc: "Evocative & flexible. Best for most startups.", star: true },
  Compound: { label: "Compound", examples: "Facebook, PayPal", desc: "Packs meaning into one. Two words, one story." },
  Invented: { label: "Invented", examples: "Google, Spotify", desc: "Easy to trademark. Best for crowded markets." },
  AbstractRealWord: { label: "Abstract real word", examples: "Apple, Stripe", desc: "Familiar & memorable. Best for simplicity." },
  FounderName: { label: "Founder name", examples: "Tesla, Chanel", desc: "Built-in story. Best for luxury & services." },
  Acronym: { label: "Acronym", examples: "IBM, IKEA", desc: "Short & clean. Rarely right for startups." },
  Evocative: { label: "Evocative", examples: "Calm, Virgin", desc: "Pure emotion. Best for lifestyle brands." },
  Playful: { label: "Playful", examples: "Liquid Death", desc: "Conversation starter. Best for bold brands." },
};

// --- word pools ---------------------------------------------------------
const PREFIXES = ["neo", "lumo", "nova", "vibe", "flux", "kova", "zen", "orbi", "lyra", "pico", "axi", "moda", "veld", "sora", "kai", "wren", "halo", "atlas", "veo", "rune"];
const SUFFIXES = ["ly", "io", "ora", "ify", "wave", "lab", "kit", "base", "flow", "mind", "loop", "forge", "scale", "stack", "spark", "drive", "craft", "mint", "field", "works"];
const ABSTRACT_WORDS = ["Onyx", "Cedar", "Atlas", "Vertex", "Quartz", "Cobalt", "Maple", "Slate", "Aspen", "Cipher", "Nimbus", "Ember", "Birch", "Flint", "Indigo", "Sable", "Cove", "Lark"];
const SUGGESTIVE_WORDS = ["Drift", "Pulse", "Beacon", "Compass", "Anchor", "Summit", "Harbor", "Current", "Forge", "Relay", "Loft", "Tempo", "Vault", "Canvas", "Prism", "Orbit"];
const EVOCATIVE_WORDS = ["Calm", "Bloom", "Glow", "Spark", "Lift", "Bright", "Bold", "Clear", "Free", "Bliss", "Haven", "Aura", "Halcyon", "Serene", "Vivid", "Lumen"];
const FOUNDER_ROOTS = ["Halden", "Marlowe", "Veyra", "Corwin", "Sable", "Renn", "Volk", "Casimir", "Aldous", "Fenn", "Lira", "Osric", "Thane", "Verel", "Brenner", "Solis"];
const PLAYFUL_BITS = ["Wonky", "Snazzy", "Zappy", "Nifty", "Quirk", "Bonkers", "Zesty", "Chirp", "Whizz", "Gusto", "Pluck", "Fizz"];
const SYLLABLES = ["ka", "lo", "mi", "ta", "ve", "ru", "no", "za", "fi", "qu", "so", "be", "ly", "da", "ne", "vo", "ri", "su", "te", "ma"];
const DESC_FUNCS = ["Book", "Desk", "Box", "Hub", "Base", "Deck", "Board", "Pad", "Studio", "Suite"];

// --- seeded RNG ---------------------------------------------------------
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function keywords(brief: Brief): string[] {
  const stop = new Set(["a", "an", "the", "for", "and", "or", "to", "of", "in", "on", "with", "that", "helps", "help", "app", "platform", "tool", "service", "lets", "users", "people", "make", "making", "build", "your", "you", "we", "i", "its", "into", "turns", "turn"]);
  const fromDesc = brief.description.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !stop.has(w));
  const fromInclude = brief.include.toLowerCase().split(/[\s,]+/).filter(Boolean);
  return [...new Set([...fromInclude, ...fromDesc])].slice(0, 8);
}

// --- per-type builders --------------------------------------------------
function dropVowelEnd(s: string) {
  return s.replace(/[aeiou]+$/i, "") || s;
}

function buildName(rng: () => number, type: NameType, kw: string[]): string {
  const seed = kw.length ? pick(rng, kw) : pick(rng, SYLLABLES) + pick(rng, SYLLABLES);
  const root = cap(seed.slice(0, Math.min(seed.length, 6)));
  switch (type) {
    case "Descriptive":
      return root + pick(rng, DESC_FUNCS);
    case "Suggestive": {
      if (rng() > 0.5) return pick(rng, SUGGESTIVE_WORDS);
      return cap(dropVowelEnd(seed) + pick(rng, SUFFIXES));
    }
    case "Compound":
      return root + cap(pick(rng, [...DESC_FUNCS, ...SUFFIXES]));
    case "Invented": {
      if (rng() > 0.55) return cap(pick(rng, PREFIXES) + pick(rng, SUFFIXES));
      const n = 2 + (rng() > 0.5 ? 1 : 0);
      let w = "";
      for (let i = 0; i < n; i++) w += pick(rng, SYLLABLES);
      return cap(w);
    }
    case "AbstractRealWord":
      return pick(rng, ABSTRACT_WORDS);
    case "FounderName":
      return pick(rng, FOUNDER_ROOTS);
    case "Acronym": {
      const letters = (kw.length >= 2 ? kw.slice(0, 3) : [seed, pick(rng, SYLLABLES), pick(rng, SYLLABLES)])
        .map((w) => w[0].toUpperCase())
        .join("");
      return letters.length >= 2 ? letters : letters + "X";
    }
    case "Evocative":
      return pick(rng, EVOCATIVE_WORDS);
    case "Playful": {
      if (rng() > 0.5) return pick(rng, PLAYFUL_BITS) + cap(pick(rng, DESC_FUNCS));
      return cap(seed) + "!".repeat(0) + cap(pick(rng, PLAYFUL_BITS));
    }
  }
}

// --- scoring on the 4 axes ---------------------------------------------
function scoreAxes(rng: () => number, type: NameType, name: string, vibes: Vibe[]): Axes {
  const base = () => 60 + Math.floor(rng() * 30);
  const a: Axes = { intuitive: base(), visual: base(), sound: base(), emotional: base() };
  // type-driven tilts, mirroring the framework's strengths
  const tilt: Record<NameType, Partial<Axes>> = {
    Descriptive: { intuitive: 18, emotional: -12 },
    Suggestive: { emotional: 10, sound: 8, intuitive: 4 },
    Compound: { intuitive: 10, sound: -4 },
    Invented: { visual: 8, intuitive: -10, sound: 6 },
    AbstractRealWord: { visual: 10, sound: 8, intuitive: -2 },
    FounderName: { emotional: 8, intuitive: -8 },
    Acronym: { sound: -14, emotional: -16, visual: 4 },
    Evocative: { emotional: 16, intuitive: -4 },
    Playful: { emotional: 12, visual: 4, sound: 4 },
  };
  for (const [k, v] of Object.entries(tilt[type])) a[k as keyof Axes] += v as number;
  if (name.length <= 6) a.sound += 5;
  if (vibes.includes("Minimal") || vibes.includes("Modern")) a.visual += 4;
  if (vibes.includes("Playful")) a.emotional += 4;
  (Object.keys(a) as (keyof Axes)[]).forEach((k) => (a[k] = Math.max(35, Math.min(99, a[k]))));
  return a;
}
const composite = (a: Axes) => Math.round((a.intuitive + a.visual + a.sound + a.emotional) / 4);

const TAGLINES = [
  (k: string) => `The fastest way to ${k}.`,
  (k: string) => `${cap(k)}, reimagined.`,
  () => `Built for founders who ship.`,
  (k: string) => `Where ${k} just works.`,
  () => `Less friction. More momentum.`,
  (k: string) => `Your ${k}, on autopilot.`,
  () => `Go from idea to live in minutes.`,
  (k: string) => `Make ${k} feel effortless.`,
];

function rationaleFor(type: NameType, vibes: Vibe[]): string {
  const v = (vibes[0] ?? "Modern").toLowerCase();
  const map: Record<NameType, string> = {
    Descriptive: `Says exactly what you do — zero explanation needed. Reads ${v}.`,
    Suggestive: `Hints at the benefit without naming it — flexible, ownable, ${v}.`,
    Compound: `Two ideas fused so the name tells a story. Clear and ${v}.`,
    Invented: `Invented & unique — easy to trademark and rank for. Feels ${v}.`,
    AbstractRealWord: `A real word borrowed into a new category — instantly memorable, ${v}.`,
    FounderName: `Carries a built-in story and a ${v}, human feel.`,
    Acronym: `Short and clean — works once you've earned recognition.`,
    Evocative: `Pure feeling over function — ${v} and aspirational.`,
    Playful: `Disarming and fun — a conversation starter that feels ${v}.`,
  };
  return map[type];
}

function domainFor(rng: () => number, name: string) {
  const lower = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const variants = [`get${lower}.com`, `try${lower}.com`, `${lower}.io`, `${lower}app.com`, `${lower}.co`];
  const roll = rng();
  const exactTaken = lower.length <= 6 ? roll > 0.28 : roll > 0.58;
  if (!exactTaken) return { domain: `${lower}.com`, available: true, premium: false };
  if (roll > 0.86) return { domain: `${lower}.com`, available: false, premium: true };
  return { domain: pick(rng, variants), available: true, premium: false };
}

export function generateNames(brief: Brief, count: number, salt = ""): NameIdea[] {
  const seed = hashString(JSON.stringify(brief) + salt);
  const rng = mulberry32(seed);
  const kw = keywords(brief);
  const types = brief.types.length ? brief.types : (["Suggestive", "Compound", "Invented", "AbstractRealWord"] as NameType[]);
  const avoid = new Set(brief.avoid.toLowerCase().split(/[\s,]+/).filter(Boolean));

  const out: NameIdea[] = [];
  const seen = new Set<string>();
  let guard = 0;

  while (out.length < count && guard < count * 30) {
    guard++;
    const type = pick(rng, types);
    const name = buildName(rng, type, kw);
    const key = name.toLowerCase();
    if (seen.has(key) || name.length < 2) continue;
    if ([...avoid].some((a) => key.includes(a))) continue;
    seen.add(key);

    const d = domainFor(rng, name);
    const axes = scoreAxes(rng, type, name, brief.vibes);
    const kwForTag = kw[0] ?? "build";
    out.push({
      name,
      tagline: pick(rng, TAGLINES)(kwForTag),
      domain: d.domain,
      domainAvailable: d.available,
      premiumDomain: d.premium,
      type,
      rationale: rationaleFor(type, brief.vibes),
      axes,
      score: composite(axes),
    });
  }
  return out.sort((a, b) => b.score - a.score);
}
