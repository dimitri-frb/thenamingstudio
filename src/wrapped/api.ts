// The Wrapped flow's API layer: talks to the Cloudflare Worker (generation,
// domains, accounts, tracking), with graceful local fallbacks so the flow never
// hard-breaks, and a full sample dataset for ?test mode.

// The account's workers.dev subdomain is "kairosfund" (renamed from
// "dimitri-4dd" in Sept 2026; the old host is NXDOMAIN).
export const ENDPOINT =
  (import.meta as any).env?.VITE_NAMING_API ||
  "https://naming-studio-api.kairosfund.workers.dev";

// The Google OAuth Web client id (a public identifier, not a secret). The env
// var wins so another deployment can override it; this default keeps dev and
// prod working either way.
export const GOOGLE_CLIENT_ID =
  ((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined) ||
  "406174169000-ma0br2rqmorv5iqcfmo4dck0at5ivohu.apps.googleusercontent.com";

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
export interface WConcept { concept: string; para: string; territories: WTerritory[]; alts?: string[] }
export interface WWord { w: string; m: string; lang?: string }
export interface WStyle { name: string; words: WWord[] }
export interface WNamePart { part: string; note: string }
export interface WDom { domain: string; tld?: string; price?: string; free?: boolean }
export interface WName { name: string; roots: string; parts: WNamePart[]; tagline: string; score: number; dom?: WDom | null; alt?: WDom | null }

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
  logo?: { key: string; title: string; seed: number; accent?: string } | null;
  taste?: unknown;          // the Brand chapter's taste picks
  palette?: { name: string; hex: string }[]; // brand colours once the book exists
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
    gen<WConcept>("wrapconcept", { sentence, chips }, () => ACTIVE().concept),

  // One style per call, six calls in parallel: the field lands in a single
  // fast-model latency and each column renders the moment it arrives.
  wordStyle: (sentence: string, concept: string, territories: WTerritory[], style: WTerritory, idx: number, prefs?: unknown) =>
    gen<{ styles: WStyle[] }>("wrapwords", { sentence, concept, territories, style, prefs }, () =>
      ({ styles: [ACTIVE().styles[idx] || ACTIVE().styles[0]] })),

  namesRaw: (payload: Record<string, unknown>) => gen<{ names: WName[] }>("wrapnames", payload, () =>
    ({ names: (payload.exclude as string[])?.length ? ACTIVE().moreNames : ACTIVE().names })),

  // Two parallel halves merged into one book: a single Sonnet-latency total.
  book: async (sentence: string, chips: string[], concept: string, name: string, parts: WNamePart[], taste?: unknown): Promise<WBook | null> => {
    const base = { sentence, chips, concept, name, parts, taste };
    const [a, b] = await Promise.all([
      gen<Partial<WBook>>("wrapbook", { ...base, half: "a" }, () => sampleBook(name)),
      gen<Partial<WBook>>("wrapbook", { ...base, half: "b" }, () => sampleBook(name)),
    ]);
    if (!a?.story || !b?.palette) return null;
    return { ...a, ...b } as WBook;
  },
};

/* ── streaming names: Opus quality, cards appearing as they're coined ── */
export interface NameStream {
  names: WName[];          // grows as the model writes
  done: boolean;
  error: boolean;
  listeners: Set<() => void>;
  final: Promise<WName[] | null>;
  abort: () => void;
}

const cleanName = (n: WName): WName => {
  n.tagline = (n.tagline || "").replace(/^[*_\s]+|[*_\s]+$/g, "");
  if (!Array.isArray(n.parts)) n.parts = [];
  return n;
};

// Pull every COMPLETE {"name": …} object out of a partially-streamed JSON text.
function extractNames(text: string): WName[] {
  const out: WName[] = [];
  let i = 0;
  while ((i = text.indexOf('{"name"', i)) !== -1) {
    let depth = 0, j = i, inStr = false, esc = false, closed = false;
    for (; j < text.length; j++) {
      const c = text[j];
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === "{") depth++;
      else if (c === "}") { depth--; if (!depth) { closed = true; break; } }
    }
    if (!closed) break; // still streaming this one
    try {
      const o = JSON.parse(text.slice(i, j + 1));
      if (o?.name && typeof o.score === "number") out.push(o as WName);
    } catch { /* malformed fragment, skip */ }
    i = j + 1;
  }
  return out;
}

export async function fetchFreeDom(name: string, doms?: string[]): Promise<{ dom: WDom | null; alt: WDom | null }> {
  const r = await post<{ dom: WDom | null; alt: WDom | null }>({ phase: "freedom", payload: { name, doms } });
  return { dom: r?.dom ?? null, alt: r?.alt ?? null };
}

export function coinNames(sentence: string, chips: string[], concept: string, words: WWord[], exclude: string[] = [], prefs?: unknown): NameStream {
  const payload = { sentence, chips, concept, words, exclude, prefs };
  const ctrl = new AbortController();
  const st: NameStream = { names: [], done: false, error: false, listeners: new Set(), final: null as any, abort: () => ctrl.abort() };
  const notify = () => st.listeners.forEach((f) => { try { f(); } catch { /* listener gone */ } });

  st.final = (async (): Promise<WName[] | null> => {
    if (TEST) {
      await pause(400);
      st.names = (exclude.length ? ACTIVE().moreNames : ACTIVE().names).map((n) => ({ ...n }));
      st.done = true; notify();
      return st.names;
    }
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phase: "wrapstream", payload, process: PROCESS, test: TEST }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error("stream unavailable");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "", seen = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const objs = extractNames(buf);
        for (const n of objs.slice(seen)) {
          cleanName(n);
          st.names = [...st.names, n];
          notify();
          // Each card's verified free domain fills in the moment we have it.
          fetchFreeDom(n.name, (prefs as any)?.doms).then((d) => { n.dom = d.dom; n.alt = d.alt; notify(); }).catch(() => {});
        }
        seen = Math.max(seen, objs.length);
      }
      if (!st.names.length) throw new Error("empty stream");
      st.done = true; notify();
      return st.names;
    } catch {
      if (ctrl.signal.aborted) { st.done = true; st.error = true; notify(); return null; }
      // One non-streaming retry (server-enriched) before giving up honestly.
      const r = await wrapApi.namesRaw(payload);
      if (r?.names?.length) {
        st.names = r.names.map(cleanName);
        st.done = true; notify();
        return st.names;
      }
      st.error = true; st.done = true; notify();
      return null;
    }
  })();
  return st;
}

/* ── tracking (best-effort, never in test mode) ── */
export function track(event: string, payload: Record<string, unknown> = {}): void {
  if (TEST) return;
  try { void post({ phase: "track", event, payload }); } catch { /* best effort */ }
}

/* ── domains ── */
const boardCache = new Map<string, Promise<DomainBoardData>>();
export function fetchDomainBoard(name: string, doms?: string[]): Promise<DomainBoardData> {
  const key = (name || "").trim().toLowerCase() + "|" + (doms || []).join(",");
  const empty: DomainBoardData = { name, tlds: [], variants: [], source: "none" };
  if (!(name || "").trim()) return Promise.resolve(empty);
  if (TEST) return Promise.resolve(SAMPLE_BOARD((name || "").trim().toLowerCase()));
  const hit = boardCache.get(key);
  if (hit) return hit;
  const p = (async () => (await post<DomainBoardData>({ phase: "domainboard", payload: { name, doms } })) || empty)();
  boardCache.set(key, p);
  p.then((r) => { if (!r.tlds.length) boardCache.delete(key); }).catch(() => boardCache.delete(key));
  return p;
}

// Register at the registrar whose live prices we display (Porkbun), so the
// number a founder sees is the number at checkout.
export const registrarUrl = (domain: string) =>
  `https://porkbun.com/checkout/search?q=${encodeURIComponent(domain)}`;

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

/* ── learned wait estimate for the names run (drives the real-time bar) ── */
const ETA_KEY = "ns.nameEta";
export function loadEta(): number {
  try {
    const arr: number[] = JSON.parse(localStorage.getItem(ETA_KEY) || "[]");
    if (!arr.length) return 20000;
    const s = [...arr].sort((a, b) => a - b);
    return Math.min(45000, Math.max(6000, s[Math.floor(s.length / 2)]));
  } catch { return 20000; }
}
export function recordEta(ms: number): void {
  if (ms < 3000) return; // a warm, prefetched run says nothing about cold waits
  try {
    const arr: number[] = JSON.parse(localStorage.getItem(ETA_KEY) || "[]");
    arr.push(Math.round(ms));
    localStorage.setItem(ETA_KEY, JSON.stringify(arr.slice(-6)));
  } catch { /* ignore */ }
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
    alts: ["quiet confidence", "a sharp mind"],
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
    { name: "Aurova", roots: "aurora + nova", parts: [{ part: "aurora", note: "the sky's first colour" }, { part: "nova", note: "Latin, a new star" }], tagline: "The sky's first colour, meeting a new star. A beginning that shines.", score: 97, dom: { domain: "aurova.com", tld: ".com", price: "$12" } },
    { name: "Embra", roots: "ember + bravo", parts: [{ part: "ember", note: "a live glowing coal" }, { part: "bravo", note: "warm approval" }], tagline: "A glow that never goes out, with the courage to catch fire.", score: 88, dom: { domain: "embra.com", tld: ".com", price: "$12" } },
    { name: "Albara", roots: "alba + clara", parts: [{ part: "alba", note: "Italian, dawn" }, { part: "clara", note: "clear, bright" }], tagline: "Italian dawn, made clear. Soft light on a fresh page.", score: 84, dom: { domain: "albara.io", tld: ".io", price: "$38" } },
    { name: "Sparq", roots: "spark, respelled", parts: [{ part: "spark", note: "the flash that starts it" }], tagline: "The flash that starts everything. Quick, bright, unforgettable.", score: 79, dom: { domain: "sparq.com", tld: ".com", price: "$12" } },
    { name: "Novalba", roots: "nova + alba", parts: [{ part: "nova", note: "a new star" }, { part: "alba", note: "Italian, dawn" }], tagline: "A new star at first light. Two beginnings in one word.", score: 74, dom: { domain: "novalba.com", tld: ".com", price: "$12" } },
    { name: "Lumen", roots: "lumen, Latin light", parts: [{ part: "lumen", note: "Latin, a unit of light" }], tagline: "Light you can measure. Calm, exact, quietly bright.", score: 71, dom: { domain: "lumen.app", tld: ".app", price: "$14" } },
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

// Second test fixture: Tiller, an iPad POS for restaurants — /test/<step> URLs
// run the whole flow on it so any screen is one click away.
export const TILLER: typeof SAMPLE = {
  concept: {
    concept: "a steady hand on the service",
    para: "A restaurant at full tilt is a hundred decisions a minute: orders, tables, stock, staff. The name has to feel like the thing that keeps it all steady, calm, capable, in charge.",
    alts: ["order in the rush", "the counter, in control"],
    territories: [
      { name: "Service", desc: "hosting, welcome, the room" },
      { name: "The till", desc: "counts, ledgers, the counter" },
      { name: "Rhythm", desc: "the rush, pace, the flow of a shift" },
    ],
  },
  styles: [
    { name: "Service", words: [
      W("serve", "to look after a table"), W("host", "the one who welcomes"), W("salle", "the dining room", "FR"), W("maitre", "the master of the room", "FR"),
      W("table", "where it all happens"), W("cover", "one seated guest"), W("carte", "the menu", "FR"), W("plate", "what leaves the pass"),
      W("course", "one act of the meal"), W("mesa", "table", "ES"), W("tavola", "table", "IT"), W("convivio", "a shared meal", "IT"),
      W("banquet", "a feast for many"), W("regale", "to feast, to delight"), W("care", "attention to each guest"), W("welcome", "the first thing served"),
    ] },
    { name: "The till", words: [
      W("till", "the counter's cash drawer"), W("ledger", "where every count lives"), W("tally", "a running count"), W("caisse", "the register", "FR"),
      W("count", "to know exactly"), W("counter", "where trade happens"), W("register", "the record of the day"), W("tab", "what the table owes"),
      W("conto", "the bill", "IT"), W("cuenta", "the account", "ES"), W("abacus", "the first calculator"), W("sum", "everything, added up"),
      W("balance", "when it all adds up"), W("comanda", "the kitchen order slip", "ES"), W("addition", "the bill", "FR"), W("cash", "money in hand"),
    ] },
    { name: "Rhythm", words: [
      W("rush", "the busiest hour"), W("tempo", "the pace", "IT"), W("shift", "one working stretch"), W("flow", "continuous motion"),
      W("cadence", "a steady rhythm"), W("pulse", "the beat of the room"), W("turn", "a table served and reset"), W("swing", "full speed, in control"),
      W("pace", "how fast it moves"), W("steady", "calm under load"), W("prime", "the peak hour"), W("hum", "a room running well"),
      W("beat", "a steady time"), W("clock", "the service timer"), W("stream", "steady and unbroken"), W("brio", "spirited energy", "IT"),
    ] },
    { name: "The helm", words: [
      W("tiller", "the bar that steers a boat"), W("helm", "where the ship is steered"), W("rudder", "what sets the course"), W("keel", "what keeps it steady"),
      W("anchor", "holds firm in any rush"), W("compass", "always knows the way"), W("pilot", "the one who guides"), W("steer", "to set direction"),
      W("captain", "in charge of the crew"), W("crew", "the team on shift"), W("deck", "where the work happens"), W("port", "safe harbour"),
      W("north", "the fixed point"), W("course", "the route you hold"), W("timon", "tiller, helm", "ES"), W("barre", "the tiller", "FR"),
    ] },
    { name: "Craft", words: [
      W("craft", "skill made visible"), W("forge", "to shape with heat"), W("plancha", "the flat iron grill", "ES"), W("brigade", "the kitchen's crew", "FR"),
      W("mise", "everything in its place", "FR"), W("prep", "ready before the rush"), W("knife", "the chef's first tool"), W("flame", "the heart of the stove"),
      W("season", "to bring to taste"), W("simmer", "controlled heat"), W("atelier", "a maker's workshop", "FR"), W("bottega", "artisan's workshop", "IT"),
      W("officina", "workshop", "IT"), W("whisk", "the cook's quick tool"), W("hand", "made by someone"), W("maker", "one who builds"),
    ] },
    { name: "Languages", words: [
      W("oste", "innkeeper", "IT"), W("fonda", "a small inn", "ES"), W("bistro", "a small quick restaurant", "FR"), W("taberna", "tavern", "LA"),
      W("meson", "a traditional inn", "ES"), W("locanda", "a country inn", "IT"), W("auberge", "an inn", "FR"), W("cantina", "cellar, canteen", "IT"),
      W("izakaya", "a stay-and-drink house", "JP"), W("gasthaus", "guest house", "DE"), W("patron", "the owner of the house", "FR"), W("chef", "the chief", "FR"),
      W("cocina", "kitchen", "ES"), W("cucina", "kitchen", "IT"), W("wirt", "the host, the innkeeper", "DE"), W("kuche", "kitchen", "DE"),
    ] },
  ],
  names: [
    { name: "Tiller", roots: "till + tiller", parts: [{ part: "till", note: "the counter's cash drawer" }, { part: "tiller", note: "the bar that steers a boat" }], tagline: "One hand on the till, one on the helm. Every service, steered calmly.", score: 96, dom: { domain: "tiller.com", tld: ".com", price: "$32" } },
    { name: "Servio", roots: "servire, Latin to serve", parts: [{ part: "servire", note: "Latin, to serve" }], tagline: "Service, made effortless. The room runs itself.", score: 88, dom: { domain: "servio.com", tld: ".com", price: "$12" } },
    { name: "Comanda", roots: "comanda, the order slip", parts: [{ part: "comanda", note: "the kitchen's order slip" }], tagline: "Every order, exactly where it should be.", score: 84, dom: { domain: "comanda.io", tld: ".io", price: "$38" } },
    { name: "Mesa", roots: "mesa, Spanish table", parts: [{ part: "mesa", note: "Spanish, the table" }], tagline: "The whole restaurant, on one table.", score: 80, dom: { domain: "mesa.app", tld: ".app", price: "$14" } },
    { name: "Caisso", roots: "caisse + o", parts: [{ part: "caisse", note: "French, the register" }], tagline: "The register, reinvented for the iPad.", score: 75, dom: { domain: "caisso.com", tld: ".com", price: "$12" } },
    { name: "Brigade", roots: "brigade, the kitchen's crew", parts: [{ part: "brigade", note: "the kitchen's chain of command" }], tagline: "Run the room like a brigade: everyone, in step.", score: 72, dom: { domain: "brigade.app", tld: ".app", price: "$14" } },
  ],
  moreNames: [
    { name: "Tablio", roots: "tavola + io", parts: [{ part: "tavola", note: "Italian, the table" }], tagline: "Every table, in view.", score: 81, dom: { domain: "tablio.com", tld: ".com", price: "$12" } },
    { name: "Contero", roots: "conto + counter", parts: [{ part: "conto", note: "Italian, the bill" }], tagline: "Counts you can trust.", score: 77, dom: { domain: "contero.com", tld: ".com", price: "$12" } },
    { name: "Sallo", roots: "salle + o", parts: [{ part: "salle", note: "French, the dining room" }], tagline: "The room, run right.", score: 74, dom: { domain: "sallo.io", tld: ".io", price: "$38" } },
    { name: "Plancha", roots: "plancha, the flat grill", parts: [{ part: "plancha", note: "Spanish, the flat iron grill" }], tagline: "Hot, fast, precise.", score: 72, dom: { domain: "plancha.app", tld: ".app", price: "$14" } },
    { name: "Turno", roots: "turno, the shift", parts: [{ part: "turno", note: "Spanish, the shift" }], tagline: "Shift after shift, smooth.", score: 70, dom: { domain: "turno.com", tld: ".com", price: "$12" } },
    { name: "Ancora", roots: "ancora, Italian anchor", parts: [{ part: "ancora", note: "Italian, the anchor" }], tagline: "Steady through the rush.", score: 68, dom: { domain: "ancora.dev", tld: ".dev", price: "$12" } },
  ],
};

// Which fixture test mode runs on: ?test = Aurova (the design sample),
// /test/<step> = Tiller. Set once by the router before the app renders.
let FIXTURE: "aurova" | "tiller" = "aurova";
export function setFixture(f: "aurova" | "tiller") { FIXTURE = f; }
export const ACTIVE = () => FIXTURE === "tiller" ? TILLER : SAMPLE;
export const ACTIVE_BRIEF = () => FIXTURE === "tiller"
  ? { sentence: "An iPad-based POS and management platform for restaurant owners and merchants", chips: ["B2B SaaS", "Restaurants", "Merchants"] }
  : { sentence: "An AI naming studio that gives founders a strategist's rigor in minutes", chips: ["B2B SaaS", "Global", "Founders"] };

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
  if (FIXTURE === "tiller") return tillerBook();
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

// The Tiller fixture's brand book (mirrors sampleBook's shape).
export function tillerBook(): WBook {
  return {
    tagline: "Every great service runs on a steady hand.",
    story: {
      headline: "The calm behind the counter.",
      para: "A restaurant at full tilt is a hundred decisions a minute: orders, tables, stock, staff. The tools behind the counter should carry that load, not add to it. Tiller exists for that.",
      oneSentence: "Tiller gives restaurant owners one calm place to run orders, payments and the whole house.",
      believe: "The rush should never run the restaurant.",
      wedo: "Put the whole service on one screen.",
      whofor: "Restaurant owners and merchants.",
    },
    origin: {
      headline: "One word, two lives",
      parts: [
        { part: "till", lang: "Middle English", gloss: "The cash drawer", para: "The drawer where the day's takings live, from Middle English tillen, to draw out. For centuries the till has been the heart of every counter: the place where the trade adds up, coin by coin, cover by cover." },
        { part: "tiller", lang: "Old French", gloss: "The steering bar", para: "The bar that steers a boat, from telier, a weaver's beam. One hand on the tiller holds the whole vessel on course: small movements, full control, especially in rough water." },
      ],
      carries: [
        { word: "Trade", note: "the till: where business adds up" },
        { word: "Control", note: "the tiller: a steady course" },
        { word: "Calm", note: "small movements, not big corrections" },
        { word: "Trust", note: "the count is always right" },
      ],
      closing: "Tiller is a real, warm English word that already lives behind a counter and at a helm. That double life is the brand.",
    },
    saying: {
      ipa: "/\u02c8t\u026al.\u0259r/", plain: "TILL-er",
      syllables: [{ s: "TILL", stress: true }, { s: "er" }],
      world: [
        { language: "English", sounds: "TILL-er", note: "reference pronunciation" },
        { language: "French", sounds: "ti-LAIR", note: "the stress slides to the end" },
        { language: "Spanish · Italian", sounds: "TI-ler", note: "reads exactly as spelled" },
        { language: "German", sounds: "TIL-la", note: "the final r rounds off" },
      ],
      writeYes: ["Tiller, one word, capital T", "Tiller's (possessive)"],
      writeNever: ["TILLER", "TilLer", "Tiller.", "Tillr"],
    },
    who: {
      mission: "Give every restaurant owner a calm, exact view of their whole house.",
      vision: "A world where running a restaurant feels as good as a full room.",
      values: [
        { name: "Count everything", note: "The numbers are always right, and always yours." },
        { name: "Calm under rush", note: "Built for the worst Friday night, not the demo." },
        { name: "Merchant-side", note: "We work for the owner, not the platform." },
      ],
      personality: [
        { left: "Playful", right: "Serious", pos: 70 },
        { left: "Warm", right: "Cool", pos: 30 },
        { left: "Classic", right: "Modern", pos: 60 },
        { left: "Quiet", right: "Loud", pos: 25 },
      ],
    },
    palette: [
      { name: "Copper", hex: "#D97B4F" }, { name: "Cream", hex: "#F2E5D0" },
      { name: "Olive", hex: "#8A9464" }, { name: "Charcoal", hex: "#191611" },
    ],
    colourNote: "Copper for the warmth of the room, Cream for the tablecloth, Olive for the kitchen's calm, Charcoal for the counter. Charcoal carries text and most surfaces; Copper is saved for the moments that matter.",
    voice: {
      words: ["Exact", "Warm", "Steady"],
      lines: [
        { word: "Exact", note: "Numbers first. Every claim checks out." },
        { word: "Warm", note: "We talk like someone who has worked a floor." },
        { word: "Steady", note: "No drama at 8pm, no drama in the copy." },
      ],
      yes: "Service ends. The count is done.",
      not: "Leverage our seamless omnichannel restaurant solution.",
    },
    messaging: {
      oneLiner: "Tiller puts a restaurant's whole service, orders, payments and stock, on one iPad.",
      pitch: "Running a restaurant means juggling a register, a kitchen, a stock room and a team, usually across four different tools. Tiller puts the whole house on one iPad: orders flow to the kitchen, payments land in the count, stock updates itself, and the owner sees everything in one calm screen. You close the night with the count already done.",
      boilerplate: "Tiller is an iPad-based point of sale and management platform for restaurants and merchants. Founded in 2026, it gives independent owners the control of a large group: orders, payments, stock and staff in one place. Learn more at tiller.com.",
      use: ["count", "service", "steady", "yours"],
      avoid: ["leverage", "seamless", "omnichannel", "disrupt"],
    },
  };
}
