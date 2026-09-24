// The Wrapped flow's API layer: talks to the Cloudflare Worker (generation,
// domains, accounts, tracking), with graceful local fallbacks so the flow never
// hard-breaks, and a full sample dataset for ?test mode.

// The account's workers.dev subdomain is "kairosfund" (renamed from
// "dimitri-4dd" in Sept 2026; the old host is NXDOMAIN).
export const ENDPOINT =
  (import.meta as any).env?.VITE_NAMING_API ||
  "https://naming-studio-api.kairosfund.workers.dev";

export const GOOGLE_CLIENT_ID = ((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined) || "";

/* ── process + test mode ── */
let TEST = false;
export function setTestMode(v: boolean): void { TEST = v; }
export function isTestMode(): boolean { return TEST; }

const rid = () => "p" + Math.random().toString(36).slice(2, 10);
let PROCESS = rid();
export function processId(): string { return PROCESS; }
export function newProcess(): string { PROCESS = rid(); return PROCESS; }
export function setProcessId(id: string): void { if (id) PROCESS = id; }

/* ── types ── */
export interface WTerritory { name: string; desc: string }
export interface WConcept { concept: string; para: string; territories: WTerritory[] }
export interface WWord { w: string; m: string; lang?: string }
export interface WStyle { name: string; words: WWord[] }
export interface WNamePart { part: string; note: string }
export interface WDom { domain: string; tld?: string; price?: string }
export interface WName { name: string; roots: string; parts: WNamePart[]; tagline: string; score: number; dom?: WDom | null }

export interface BookValue { name: string; note: string }
export interface WBook {
  tagline: string;
  story: { headline: string; para: string; oneSentence: string; believe: string; wedo: string; whofor: string };
  origin: { headline: string; parts: { part: string; lang: string; gloss: string; para: string }[]; carries: { word: string; note: string }[]; closing: string };
  saying: { ipa: string; plain: string; syllables: { s: string; stress?: boolean }[]; world: { language: string; sounds: string; note: string }[]; writeYes: string[]; writeNever: string[] };
  who: { mission: string; vision: string; values: BookValue[]; personality: { left: string; right: string; pos: number }[] };
  palette: { name: string; hex: string }[];
  colourNote: string;
  voice: { words: string[]; lines: { word: string; note: string }[]; yes: string; not: string };
  messaging: { oneLiner: string; pitch: string; boilerplate: string; use: string[]; avoid: string[] };
}

export interface DomainCard { domain: string; tld?: string; status: "available" | "negotiable" | "taken" | "unknown"; price?: string; renewal?: string; premium?: boolean; offerPrice?: string; offerUrl?: string }
export interface DomainBoardData { name: string; tlds: DomainCard[]; variants: DomainCard[]; source: string }

export interface WUser { sub: string; email: string; name: string; picture?: string }

// One saved search, as listed on the account page and resumed from it.
export interface SavedSearch {
  id: string;               // = the process id
  at: number;               // started
  updated: number;
  sentence: string;
  chips: string[];
  concept?: WConcept | null;
  starred?: WWord[];
  names?: WName[];
  picked?: WName | null;
  domain?: string;          // the registered/chosen domain
  logo?: { key: string; title: string; seed: number } | null;
  steps: { domain?: "done" | "skipped"; logo?: "done" | "skipped"; book?: "done" | "skipped"; socials?: "done" | "skipped" };
  status: "exploring" | "ready" | "claimed";
}

/* ── low-level call ── */
async function post<T>(body: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, process: PROCESS, test: TEST }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.error) return null;
    return data as T;
  } catch { return null; }
}

// Generation calls retry once, then return null. LIVE NEVER SHOWS SAMPLE DATA:
// a founder must never mistake Aurova demo content for their own results, so a
// dead engine surfaces as an honest "try again", not a fake answer. Only ?test
// mode returns the sample set.
async function gen<T>(phase: string, payload: unknown, sample: () => T): Promise<T | null> {
  if (TEST) { await pause(350); return sample(); }
  const first = await post<T>({ phase, payload });
  if (first) return first;
  const second = await post<T>({ phase, payload });
  if (second) return second;
  return null;
}
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ── generation ── */
export const wrapApi = {
  // Chips are editable hints, so a local heuristic is an honest fallback here.
  chips: async (sentence: string) =>
    (await gen<{ chips: string[] }>("wrapchips", { sentence }, () => ({ chips: localChips(sentence) }))) ?? { chips: localChips(sentence) },

  concept: (sentence: string, chips: string[]) =>
    gen<WConcept>("wrapconcept", { sentence, chips }, () => SAMPLE.concept),

  words: (sentence: string, concept: string, territories: WTerritory[]) =>
    gen<{ styles: WStyle[] }>("wrapwords", { sentence, concept, territories }, () => ({ styles: SAMPLE.styles })),

  names: async (sentence: string, chips: string[], concept: string, words: WWord[], exclude: string[] = []) => {
    const r = await gen<{ names: WName[] }>("wrapnames", { sentence, chips, concept, words, exclude }, () =>
      ({ names: exclude.length ? SAMPLE.moreNames : SAMPLE.names }));
    // The model sometimes wraps taglines in markdown emphasis; never show raw *…*.
    r?.names?.forEach((n) => { n.tagline = (n.tagline || "").replace(/^[*_\s]+|[*_\s]+$/g, ""); });
    return r;
  },

  book: (sentence: string, chips: string[], concept: string, name: string, parts: WNamePart[]) =>
    gen<WBook>("wrapbook", { sentence, chips, concept, name, parts }, () => sampleBook(name)),
};

/* ── tracking (best-effort, never in test mode) ── */
export function track(event: string, payload: Record<string, unknown> = {}): void {
  if (TEST) return;
  try { void post({ phase: "track", event, payload }); } catch { /* best effort */ }
}

/* ── domains ── */
const boardCache = new Map<string, Promise<DomainBoardData>>();
export function fetchDomainBoard(name: string): Promise<DomainBoardData> {
  const key = (name || "").trim().toLowerCase();
  const empty: DomainBoardData = { name, tlds: [], variants: [], source: "none" };
  if (!key) return Promise.resolve(empty);
  if (TEST) return Promise.resolve(SAMPLE_BOARD(key));
  const hit = boardCache.get(key);
  if (hit) return hit;
  const p = (async () => (await post<DomainBoardData>({ phase: "domainboard", payload: { name } })) || empty)();
  boardCache.set(key, p);
  p.then((r) => { if (!r.tlds.length) boardCache.delete(key); }).catch(() => boardCache.delete(key));
  return p;
}

export const registrarUrl = (domain: string) =>
  `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(domain)}`;

/* ── accounts ── */
const SESS_KEY = "ns.session";
export function loadSession(): { token: string; user: WUser } | null {
  try { return JSON.parse(localStorage.getItem(SESS_KEY) || "null"); } catch { return null; }
}
export function saveSession(s: { token: string; user: WUser } | null): void {
  try { s ? localStorage.setItem(SESS_KEY, JSON.stringify(s)) : localStorage.removeItem(SESS_KEY); } catch { /* ignore */ }
}

export async function authGoogle(credential: string): Promise<{ token: string; user: WUser; searches: SavedSearch[] } | null> {
  const r = await post<{ token: string; user: WUser; searches: SavedSearch[] }>({ phase: "auth-google", credential });
  if (r?.token) saveSession({ token: r.token, user: r.user });
  return r?.token ? r : null;
}

export async function fetchMe(): Promise<{ user: WUser | null; searches: SavedSearch[] }> {
  const s = loadSession();
  if (!s) return { user: null, searches: [] };
  const r = await post<{ user: WUser | null; searches: SavedSearch[] }>({ phase: "me", token: s.token });
  if (r && !r.user) saveSession(null); // session expired server-side
  return { user: r?.user || null, searches: r?.searches || [] };
}

export function putSearch(search: SavedSearch): void {
  const s = loadSession();
  if (!s || TEST) return;
  try { void post({ phase: "search-put", token: s.token, search }); } catch { /* best effort */ }
}

/* ── Google Identity Services ── */
export function loadGsi(onReady: () => void): () => void {
  const w = window as any;
  if (w.google?.accounts?.id) { onReady(); return () => {}; }
  const existing = document.getElementById("gsi-script") as HTMLScriptElement | null;
  const s = existing || document.createElement("script");
  if (!existing) { s.id = "gsi-script"; s.src = "https://accounts.google.com/gsi/client"; s.async = true; document.head.appendChild(s); }
  s.addEventListener("load", onReady);
  return () => s.removeEventListener("load", onReady);
}

/* ── refresh-resume snapshot (this browser only) ── */
const SNAP_KEY = "ns.wrapped";
export function saveSnap(snap: Record<string, unknown>): void {
  try { localStorage.setItem(SNAP_KEY, JSON.stringify({ v: 1, at: Date.now(), process: PROCESS, ...snap })); } catch { /* ignore */ }
}
export function loadSnap(): any | null {
  try {
    const s = JSON.parse(localStorage.getItem(SNAP_KEY) || "null");
    if (!s || s.v !== 1 || Date.now() - s.at > 1000 * 60 * 60 * 24 * 7) return null;
    return s;
  } catch { return null; }
}
export function clearSnap(): void { try { localStorage.removeItem(SNAP_KEY); } catch { /* ignore */ } }

/* ─────────────────────── local fallbacks + sample data ─────────────────────── */

function localChips(sentence: string): string[] {
  const s = (sentence || "").toLowerCase();
  const industry =
    /app\b|application/.test(s) ? "App" :
    /saas|software|platform|tool/.test(s) ? "SaaS" :
    /marketplace/.test(s) ? "Marketplace" :
    /brand|label|shop|store|coffee|wear/.test(s) ? "Brand" : "Startup";
  const reach = /france|french|paris/.test(s) ? "France" : /local|city|neighborhood/.test(s) ? "Local" : "Global";
  const audience =
    /founder|startup/.test(s) ? "Founders" :
    /student/.test(s) ? "Students" :
    /lawyer|law firm/.test(s) ? "Lawyers" :
    /restaurant/.test(s) ? "Restaurants" :
    /team/.test(s) ? "Teams" : "Consumers";
  return [industry, reach, audience];
}

// Sample dataset (the design's Aurova run), used by ?test and as the last-resort
// fallback so the flow always renders.
const W = (w: string, m: string, lang?: string): WWord => (lang ? { w, m, lang } : { w, m });

export const SAMPLE: { concept: WConcept; styles: WStyle[]; names: WName[]; moreNames: WName[] } = {
  concept: {
    concept: "a new beginning",
    para: "Founders come to you at the start of something. The name has to carry that, clear, bright, and its own.",
    territories: [
      { name: "Light", desc: "first light, dawn, clarity" },
      { name: "Ignition", desc: "the spark that starts it" },
      { name: "Origin", desc: "roots, sources, firsts" },
    ],
  },
  styles: [
    { name: "Light", words: [
      W("alba", "dawn", "IT"), W("dawn", "first light of day"), W("aurora", "glow before sunrise", "LA"), W("lucent", "softly shining"),
      W("lumen", "a unit of light", "LA"), W("glow", "steady, warm light"), W("halo", "ring of light"), W("radia", "rays, radiance", "LA"),
      W("solis", "of the sun", "LA"), W("eos", "goddess of dawn", "GR"), W("albor", "first whiteness of dawn", "ES"), W("clara", "clear, bright", "IT"),
      W("lux", "light", "LA"), W("sunrise", "the sun appearing"), W("daybreak", "when day begins"), W("ray", "a single beam"),
    ] },
    { name: "Ignition", words: [
      W("spark", "the flash that starts it"), W("ember", "a live glowing coal"), W("nova", "a star suddenly brightening", "LA"), W("flare", "a sudden burst of light"),
      W("kindle", "to set alight"), W("ignite", "to catch fire"), W("flint", "stone that makes sparks"), W("blaze", "a bright, strong fire"),
      W("fuse", "the line that sets it off"), W("glint", "a quick flash"), W("pulse", "a rhythmic beat"), W("volt", "a unit of energy"),
      W("surge", "a sudden rise"), W("flash", "an instant of light"), W("arc", "a bright curved discharge"), W("burst", "a sudden release"),
    ] },
    { name: "Origin", words: [
      W("genesis", "the beginning", "GR"), W("seed", "where growth starts"), W("onset", "the start"), W("sprout", "first growth"),
      W("nascent", "just born"), W("prime", "first, best"), W("root", "the base of it all"), W("source", "where it comes from"),
      W("first", "before all others"), W("alpha", "the first letter", "GR"), W("origo", "origin", "LA"), W("bloom", "opening up"),
      W("rise", "moving upward"), W("open", "ready to begin"), W("new", "never seen before"), W("anew", "once more, fresh"),
    ] },
    { name: "Motion", words: [
      W("orbit", "a path around"), W("drift", "easy, carried motion"), W("swift", "fast and light"), W("glide", "smooth movement"),
      W("vela", "sail", "LA"), W("momentum", "force of moving"), W("stride", "a confident step"), W("lift", "to raise up"),
      W("flow", "continuous motion"), W("ascend", "to climb"), W("soar", "to fly high"), W("kite", "rides the wind"),
      W("wave", "a moving swell"), W("sail", "carried by the wind"), W("tempo", "the pace", "IT"), W("go", "to begin moving"),
    ] },
    { name: "Clarity", words: [
      W("clear", "easy to see through"), W("pure", "nothing added"), W("true", "honest, exact"), W("plain", "simple, direct"),
      W("crisp", "clean and sharp"), W("lucid", "perfectly clear"), W("frank", "open and direct"), W("keen", "sharp, eager"),
      W("sharp", "precisely cut"), W("fine", "refined, exact"), W("neat", "orderly, simple"), W("still", "calm and quiet"),
      W("candor", "honest openness", "LA"), W("verity", "truth", "LA"), W("sono", "sound, clear tone", "IT"), W("klar", "clear", "DE"),
    ] },
    { name: "Languages", words: [
      W("hikari", "light", "JP"), W("licht", "light", "DE"), W("lueur", "faint glow", "FR"), W("brio", "spirited energy", "IT"),
      W("sol", "sun", "ES"), W("etoile", "star", "FR"), W("stella", "star", "LA"), W("faro", "lighthouse", "IT"),
      W("ambre", "amber", "FR"), W("vivo", "alive", "ES"), W("kobo", "workshop", "JP"), W("asa", "morning", "JP"),
      W("neu", "new", "DE"), W("primo", "first", "IT"), W("fuente", "spring, source", "ES"), W("aube", "dawn", "FR"),
    ] },
  ],
  names: [
    { name: "Aurova", roots: "aurora + nova", parts: [{ part: "aurora", note: "the sky's first colour" }, { part: "nova", note: "Latin, a new star" }], tagline: "A fresh beginning, made bright.", score: 97, dom: { domain: "aurova.com", tld: ".com", price: "$12" } },
    { name: "Embra", roots: "ember + bravo", parts: [{ part: "ember", note: "a live glowing coal" }, { part: "bravo", note: "warm approval" }], tagline: "The warmth that starts it.", score: 88, dom: { domain: "embra.com", tld: ".com", price: "$12" } },
    { name: "Albara", roots: "alba + clara", parts: [{ part: "alba", note: "Italian, dawn" }, { part: "clara", note: "clear, bright" }], tagline: "Clarity, first thing.", score: 84, dom: { domain: "albara.io", tld: ".io", price: "$38" } },
    { name: "Sparq", roots: "spark, respelled", parts: [{ part: "spark", note: "the flash that starts it" }], tagline: "Where ideas catch.", score: 79, dom: { domain: "sparq.com", tld: ".com", price: "$12" } },
    { name: "Novalba", roots: "nova + alba", parts: [{ part: "nova", note: "a new star" }, { part: "alba", note: "Italian, dawn" }], tagline: "New light, every morning.", score: 74, dom: { domain: "novalba.com", tld: ".com", price: "$12" } },
    { name: "Lumen", roots: "lumen, Latin light", parts: [{ part: "lumen", note: "Latin, a unit of light" }], tagline: "Measured brightness.", score: 71, dom: { domain: "lumen.app", tld: ".app", price: "$14" } },
  ],
  moreNames: [
    { name: "Solva", roots: "solis + nova", parts: [{ part: "solis", note: "Latin, of the sun" }], tagline: "The sun, at work.", score: 82, dom: { domain: "solva.io", tld: ".io", price: "$38" } },
    { name: "Kindra", roots: "kindle + ra", parts: [{ part: "kindle", note: "to set alight" }], tagline: "Lit from within.", score: 78, dom: { domain: "kindra.app", tld: ".app", price: "$14" } },
    { name: "Origo", roots: "origo, Latin origin", parts: [{ part: "origo", note: "Latin, origin" }], tagline: "Back to the source.", score: 76, dom: { domain: "origo.dev", tld: ".dev", price: "$12" } },
    { name: "Halcy", roots: "halo + clarity", parts: [{ part: "halo", note: "ring of light" }], tagline: "Calm, bright, yours.", score: 73, dom: { domain: "halcy.com", tld: ".com", price: "$12" } },
    { name: "Primave", roots: "prima + wave", parts: [{ part: "prima", note: "first, best" }], tagline: "The first wave.", score: 70, dom: { domain: "primave.com", tld: ".com", price: "$12" } },
    { name: "Eosia", roots: "eos + ia", parts: [{ part: "eos", note: "Greek goddess of dawn" }], tagline: "Dawn, made daily.", score: 68, dom: { domain: "eosia.com", tld: ".com", price: "$12" } },
  ],
};

const SAMPLE_BOARD = (name: string): DomainBoardData => {
  const slug = name.replace(/[^a-z0-9]/g, "");
  return {
    name,
    tlds: [
      { domain: `${slug}.com`, tld: ".com", status: "available", price: "$32", renewal: "$14/yr" },
      { domain: `${slug}.io`, tld: ".io", status: "available", price: "$38", renewal: "$46/yr" },
      { domain: `${slug}.app`, tld: ".app", status: "available", price: "$14", renewal: "$18/yr" },
      { domain: `${slug}.ai`, tld: ".ai", status: "negotiable", offerPrice: "$70" },
      { domain: `${slug}.co`, tld: ".co", status: "taken" },
      { domain: `${slug}.dev`, tld: ".dev", status: "available", price: "$12", renewal: "$16/yr" },
      { domain: `${slug}.net`, tld: ".net", status: "available", price: "$12", renewal: "$15/yr" },
      { domain: `${slug}.xyz`, tld: ".xyz", status: "available", price: "$10", renewal: "$12/yr" },
    ],
    variants: [],
    source: "sample",
  };
};

export function sampleBook(name: string): WBook {
  const n = name || "Aurova";
  return {
    tagline: "Every great company starts at first light.",
    story: {
      headline: "The light before everything begins.",
      para: `Every company has a moment before it has a name: an idea, a founder, a blank page. That moment is fragile, full of possibility and easy to get wrong. ${n} exists for that moment.`,
      oneSentence: `${n} helps founders find a name that feels like the first light of something new.`,
      believe: "A great name makes the first step easier.",
      wedo: "Bring a strategist's rigor, in minutes.",
      whofor: "Founders at the very start.",
    },
    origin: {
      headline: "Two old words, one new one",
      parts: [
        { part: "aurora", lang: "Latin", gloss: "Dawn", para: "The Roman goddess of the dawn, who renewed herself every morning to open the sky for the sun. The word shares an ancient root with the Greek Eos and the English east: the direction the light comes from." },
        { part: "nova", lang: "Latin", gloss: "New", para: "From novus, new. Astronomers use it for a star that suddenly flares bright, after Tycho Brahe's 1573 book De nova stella, on the new star. Something that wasn't there, and then is." },
      ],
      carries: [
        { word: "Light", note: "clarity where there was none" },
        { word: "Renewal", note: "every dawn is a fresh start" },
        { word: "Emergence", note: "a new star, suddenly visible" },
        { word: "Direction", note: "east: where things begin" },
      ],
      closing: `${n} doesn't exist as a word in any major language, which is exactly what makes it ownable.`,
    },
    saying: {
      ipa: "/ɔːˈroʊ.və/", plain: "aw-ROH-vuh",
      syllables: [{ s: "aw" }, { s: "ROH", stress: true }, { s: "vuh" }],
      world: [
        { language: "English", sounds: "aw-ROH-vuh", note: "reference pronunciation" },
        { language: "French", sounds: "o-ro-VA", note: "stress moves to the end, naturally" },
        { language: "Spanish · Italian", sounds: "au-RO-va", note: "reads exactly as spelled" },
        { language: "German", sounds: "au-RO-wa", note: "the v softens to a w" },
      ],
      writeYes: [`${n}, one word, capital ${n[0] || "A"}`, `${n}'s (possessive)`],
      writeNever: [n.toUpperCase(), `${n.slice(0, 4)}${(n[4] || "v").toUpperCase()}${n.slice(5)}`, `${n}.`, `${n}h`],
    },
    who: {
      mission: "Give every founder a name they're proud to say out loud.",
      vision: "A world where great ideas never stall at the naming stage.",
      values: [
        { name: "Clarity first", note: "We explain every recommendation. No black boxes." },
        { name: "Craft, fast", note: "Speed never replaces rigor. It removes the waiting." },
        { name: "Founder-side", note: "We work for the person with the idea." },
      ],
      personality: [
        { left: "Playful", right: "Serious", pos: 62 },
        { left: "Warm", right: "Cool", pos: 22 },
        { left: "Classic", right: "Modern", pos: 74 },
        { left: "Quiet", right: "Loud", pos: 30 },
      ],
    },
    palette: [
      { name: "Dawn", hex: "#FF9E7A" }, { name: "Haze", hex: "#C9B6FF" },
      { name: "Nova", hex: "#7C9CFF" }, { name: "Night", hex: "#0F0D24" },
    ],
    colourNote: "The palette follows a sunrise: Dawn's warm orange, the Haze of the sky, the blue of a new star, and Night behind it all. Night carries text and most surfaces; the gradient is saved for moments that matter.",
    voice: {
      words: ["Clear", "Warm", "Confident"],
      lines: [
        { word: "Clear", note: "Short sentences. Plain words. One idea at a time." },
        { word: "Warm", note: "We talk to founders like a friend who's been there." },
        { word: "Confident", note: "We recommend, then explain why. No hedging." },
      ],
      yes: "Your name is ready. Let's claim it.",
      not: "Leverage our AI-powered solution to optimise your brand.",
    },
    messaging: {
      oneLiner: `${n} gives founders a strategist-grade name in minutes, with the domain ready to claim.`,
      pitch: `Naming a company usually means weeks of lists, a pricey agency, or a generator that spits out nonsense. ${n} reads your brief like a strategist, finds the concept behind it, and shows you names already scored for meaning, memorability and a free domain. You leave with a name, a brand book and a clear reason why it works.`,
      boilerplate: `${n} is a naming studio for founders. Founded in 2026, it combines naming strategy with AI to help early-stage companies find, test and own their name in a single session. Learn more at ${n.toLowerCase()}.com.`,
      use: ["clear", "first", "craft", "yours"],
      avoid: ["leverage", "disrupt", "synergy", "optimise"],
    },
  };
}
