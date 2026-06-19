// the naming studio - API Worker.
//
// A thin Cloudflare Worker that proxies the Anthropic API so the key never ships
// to the browser. Both the v1 client (namingApi -> VITE_NAMING_API) and the v2
// client (studioApi -> VITE_STUDIO_API) POST { phase, ... } here; we dispatch on
// `phase`, build a prompt, call Claude, and return strict JSON matching the
// shapes the frontend expects. If anything fails the frontend falls back to its
// local demo engine, so a bad response never breaks the flow.
//
// Models are split by job to control cost: Haiku for mechanical work, Sonnet for
// the creative work. The system prompt is cached (5-min TTL) to cut input cost.

// Minimal Cloudflare runtime types (present at runtime; declared here so this
// no-package worker typechecks without an @cloudflare/workers-types dependency).
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  list(options?: { prefix?: string; limit?: number }): Promise<{ keys: { name: string }[] }>;
}
interface ExecutionContext { waitUntil(promise: Promise<unknown>): void }

export interface Env {
  ANTHROPIC_API_KEY: string;
  ALLOWED_ORIGIN?: string; // optional: lock CORS to your site; defaults to *
  LOG?: KVNamespace;       // optional: central request log (bind a KV namespace named LOG)
  ADMIN_KEY?: string;      // optional: required ?key= to read the log
}

const MODEL = {
  fast: "claude-haiku-4-5-20251001",
  smart: "claude-sonnet-4-6",
};

const SYS =
  "You are a world-class brand naming strategist working inside a naming studio. " +
  "You are warm, opinionated and precise. You ALWAYS respond with one valid, minified JSON value and nothing else: no prose, no markdown, no code fences. " +
  "Never use em dashes or en dashes (the characters — or –); use commas, periods, colons or parentheses instead.";

function cors(env: Env): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors(env) });

    // Central request log read endpoint: GET ?log=1[&key=ADMIN_KEY][&limit=N].
    if (req.method === "GET") {
      const url = new URL(req.url);
      if (url.searchParams.has("log")) return readLog(env, url);
      return json({ ok: true }, env);
    }
    if (req.method !== "POST") return json({ error: "POST only" }, env, 405);

    let body: any;
    try { body = await req.json(); } catch { return json({ error: "bad json" }, env, 400); }

    const phase: string = body?.phase || "";
    const spec = PROMPTS[phase];
    if (!spec) return json({ error: `unknown phase: ${phase}` }, env, 400);

    try {
      const { model, max, prompt } = spec(body);
      const text = await callClaude(env, model, prompt, max);
      let data = parseJSON(text);
      if (data == null) return json({ error: "parse failed" }, env, 502);
      if (phase === "candidates") data = await enrichCandidates(data);
      if (phase === "compare") data = await enrichCompare(data);
      // Best-effort central log (only if a KV namespace is bound). Never blocks the response.
      if (env.LOG) ctx.waitUntil(writeLog(env, phase, { brief: body.brief, payload: body.payload }, data));
      return json(data, env);
    } catch (e: any) {
      return json({ error: String(e?.message || e) }, env, 502);
    }
  },
};

async function callClaude(env: Env, model: string, user: string, max_tokens: number): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens,
      system: [{ type: "text", text: SYS, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
  const data: any = await res.json();
  return (data.content || []).map((b: any) => b.text || "").join("");
}

function parseJSON(text: string): any {
  let t = (text || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch { /* try to slice */ }
  const s = Math.min(...["{", "["].map((c) => { const i = t.indexOf(c); return i < 0 ? Infinity : i; }));
  const e = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (s !== Infinity && e > s) { try { return JSON.parse(t.slice(s, e + 1)); } catch { /* fall */ } }
  return null;
}

// ── Central request log (Cloudflare KV) ──
// Each generation is stored under "log:<reverse-timestamp>:<rand>" so a prefix
// list returns newest-first. A 60-day TTL keeps the store self-pruning.
async function writeLog(env: Env, phase: string, input: unknown, output: unknown): Promise<void> {
  if (!env.LOG) return;
  try {
    const at = Date.now();
    const rev = (1e15 - at).toString().padStart(16, "0");
    const key = `log:${rev}:${Math.random().toString(36).slice(2, 8)}`;
    await env.LOG.put(key, JSON.stringify({ at, phase, source: "live", input, output }), { expirationTtl: 60 * 60 * 24 * 60 });
  } catch { /* logging is best-effort */ }
}

async function readLog(env: Env, url: URL): Promise<Response> {
  if (!env.LOG) return json({ items: [], note: "no KV namespace bound (LOG)" }, env);
  if (env.ADMIN_KEY && url.searchParams.get("key") !== env.ADMIN_KEY) return json({ error: "unauthorized" }, env, 401);
  const limit = Math.min(300, Math.max(1, Number(url.searchParams.get("limit")) || 150));
  const list = await env.LOG.list({ prefix: "log:", limit });
  const items = (await Promise.all(list.keys.map(async (k) => {
    const v = await env.LOG!.get(k.name);
    if (!v) return null;
    try { return { id: k.name, ...JSON.parse(v) }; } catch { return null; }
  }))).filter(Boolean);
  return json({ items }, env);
}

function json(data: unknown, env: Env, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...cors(env) },
  });
}

const briefV1 = (b: any) => JSON.stringify(b || {});
const briefV2 = (b: any) => JSON.stringify(b || {});

// Each phase -> { model, max, prompt }. Shapes mirror the TS interfaces the
// frontend parses (see src/lib/namingApi.ts and src/v2/types.ts).
const PROMPTS: Record<string, (body: any) => { model: string; max: number; prompt: string }> = {
  /* ---------------- v1 (namingApi) ---------------- */
  concepts: (b) => ({ model: MODEL.smart, max: 1200, prompt:
    `Brief: ${briefV1(b.brief)}.\nPropose 8 distinct, inspiring naming concept territories (clever angles, not names). ` +
    `Return JSON {"concepts":[{"title":"short evocative title","blurb":"one inspiring sentence on the angle","lane":"suggestive|invented|evocative|descriptive|abstract|compound|playful"}]} with exactly 8 items.` }),

  feelings: (b) => ({ model: MODEL.fast, max: 900, prompt:
    `Brief: ${briefV1(b.brief)}.\nList 14 feelings the brand name could evoke. Each needs a one-line "why it fits THIS brand" that references the audience. ` +
    `Return JSON {"feelings":[{"word":"Trust","why":"..."}]} with 14 items.` }),

  explore: (b) => ({ model: MODEL.smart, max: 1400, prompt:
    `Brief: ${briefV1(b.brief)}.\nConcept to explore: ${JSON.stringify(b.payload?.concept || {})}.\n` +
    `Give 13 seed words or short expressions that mine this concept, each with 4 to 5 related words (synonyms, sounds, short forms). ` +
    `Return JSON {"title":"the concept title","blurb":"the concept blurb","words":[{"word":"...","related":["...","..."]}]}.` }),

  relate: (b) => ({ model: MODEL.fast, max: 1100, prompt:
    `Brief: ${briefV1(b.brief)}.\nThe founder is exploring naming material in the world "${b.payload?.world || ""}". ` +
    `Focus word: "${b.payload?.seed || b.payload?.world || ""}".\n` +
    `Pick the single best focus word (the focus word itself if it is a real, evocative word, else the strongest word for this world), give a one-line definition, ` +
    `then list words RELATED to that focus word, grouped by HOW they relate. Each group: 6 items, each with the word and a 3-6 word note; translations also include a 2-letter language code. ` +
    `Groups: related (same lexical field), metaphor (symbols/images), translation (the idea in other tongues), root (Latin/Greek/Old etymological roots), mythic (famous people, places, myths). ` +
    `Return JSON {"word":"swift","def":"one line","groups":[{"rel":"related","words":[{"w":"fleet","note":"fast and nimble"}]},{"rel":"metaphor","words":[...]},{"rel":"translation","words":[{"w":"veloce","note":"fast","lang":"IT"}]},{"rel":"root","words":[...]},{"rel":"mythic","words":[...]}]}.` }),

  names: (b) => ({ model: MODEL.smart, max: 1500, prompt:
    `Brief: ${briefV1(b.brief)}.\nConcepts: ${JSON.stringify(b.payload?.sketch?.concepts || [])}. Resonant words: ${JSON.stringify(b.payload?.sketch?.words || [])}.\n` +
    `Coin 12 brand name candidates drawing on these. Mix lanes. Each: a short rationale and a score 70-98. ` +
    `Return JSON {"names":[{"name":"Lumora","type":"suggestive","rationale":"one line","score":88}]} with 12 items.` }),

  compare: (b) => ({ model: MODEL.smart, max: 1800, prompt:
    `Brief: ${briefV1(b.brief)}.\nScore these names: ${JSON.stringify((b.payload?.names || []).map((n: any) => n.name))}.\n` +
    `For each give intuitive, visual, sound, emotional (each 3-6), total (their sum), a one-line verdict, and BEST-GUESS availability estimates: ` +
    `domains [{"tld":".com","available":bool},{"tld":".io","available":bool},{"tld":".ai","available":bool}], inpi (bool, trademark looks clear), inpiNote, instagram (bool, handle free). Pick the strongest as recommended and say why. ` +
    `Return JSON {"rows":[{"name","intuitive","visual","sound","emotional","total","domains","inpi","inpiNote","instagram","verdict"}],"recommended":"Name","why":"2-3 sentences"}.` }),

  brandbook: (b) => ({ model: MODEL.smart, max: 1800, prompt:
    `Brief: ${briefV1(b.brief)}.\nCreate a starter brand book for the chosen name "${b.payload?.name || ""}". ` +
    `Return JSON {"essence":"3 words","tagline":"short","story":"3 sentences","whyName":"1-2 sentences","voice":{"adjectives":["..x4"],"dos":["..x3"],"donts":["..x3"],"sample":"one sentence of brand voice"},` +
    `"palette":[{"hex":"#1F1B18","name":"Espresso","role":"Ink"} and 4 more, 5 total],"fontKey":"editorial|modern|classic|friendly|warm","fontNote":"one line",` +
    `"messaging":{"pitch":"one line","boilerplate":"2 sentences","taglines":["..x3"],"valueProps":["..x3"]}}.` }),

  suggest: (b) => ({ model: MODEL.fast, max: 300, prompt:
    `Brief so far: ${briefV1(b.brief)}.\nSuggest 3 short, concrete options for the "${b.payload?.field || ""}" field. ` +
    `Return JSON {"suggestions":["...","...","..."]}.` }),

  interview: (b) => ({ model: MODEL.smart, max: 700, prompt:
    `You are interviewing a founder to build a naming brief. Conversation so far (newest last): ${JSON.stringify(b.payload?.messages || [])}.\n` +
    `If there are at least 5 user answers, set done true and produce the brief; otherwise ask ONE warm, specific next question and set done false. ` +
    `Return JSON {"say":"your line","done":false,"brief":{"does":"","industry":"","problem":"","audience":"","values":"","uvp":"","signal":[],"avoid":[],"tone":[],"lanes":[]}} (omit brief unless done).` }),

  /* ---------------- v2 (studioApi) ---------------- */
  territories: (b) => ({ model: MODEL.smart, max: 1300, prompt:
    `Brief: ${briefV2(b.brief)}.\nPropose 6 naming territories (directions) that fit this brief. Each must carry an explicit tradeoff. ` +
    `Return JSON {"territories":[{"id":"slug","name":"The invented word","description":"one line","examplePattern":"Brand1 / Brand2 / Brand3","buys":"what it gives you","costs":"the tradeoff","selected":false}]} with 6 items.` }),

  board: (b) => ({ model: MODEL.smart, max: 1500, prompt:
    `Brief: ${briefV2(b.brief)}.\nConcepts chosen: ${JSON.stringify((b.territories || []).map((t: any) => ({ name: t.name, description: t.description })))}.\n` +
    `Produce 14 evocative REAL words and 2 to 3 short quotes that these concepts suggest (these are raw material, NOT brand names). ` +
    `Each item: its source concept name and a one-line studio read of what it evokes. ` +
    `Return JSON {"seeds":[{"label":"word or short quote","kind":"word|quote","concept":"source concept name","description":"one line"}]}.` }),

  candidates: (b) => ({ model: MODEL.smart, max: 2600, prompt:
    `Brief: ${briefV2(b.brief)}.\nKept words and quotes: ${JSON.stringify(b.keptWords || [])}. Concepts: ${JSON.stringify((b.territories || []).filter((t: any) => t.selected).map((t: any) => ({ id: t.id, name: t.name })))}.\n` +
    `Coin ${b.count || 8} brand name candidates from this material. For each return: name; territoryId (one of the concept ids or ""); rationale (one line); ` +
    `smile {suggestive,memorable,imagery,legs,emotional,overall} each 0-100; scratch {spellingChallenged,copycat,restrictive,annoying,tame,hardToPronounce} booleans; ` +
    `availability {domainCom:"available|taken|premium",otherTlds:{".io":"available|taken",".co":"available|taken"},instagram:"available|taken",trademarkINPI:"clear|conflict|unknown"} as rough estimates; ownable (boolean: .com not taken, no INPI conflict, not a copycat). ` +
    `Return JSON {"candidates":[{"name","territoryId","rationale","smile","scratch","availability","ownable"}]}.` }),

  pressure: (b) => ({ model: MODEL.fast, max: 500, prompt:
    `Brief markets: ${JSON.stringify(b.brief?.targetMarkets || ["FR"])}.\nPressure-test the name "${b.candidate?.name || ""}". ` +
    `Return JSON {"candidateId":"${b.candidate?.id || ""}","barTest":"pass|warn|fail","spellTest":"pass|warn|fail","linguisticSafety":[{"market":"FR","result":"pass|warn|fail","note":"only if not pass"}],"stretchTest":"pass|warn|fail"}.` }),

  rationale: (b) => ({ model: MODEL.smart, max: 500, prompt:
    `Brief: ${briefV2(b.brief)}.\nWrite the case for choosing the name "${b.candidate?.name || ""}": 4 to 5 sentences, investor-grade, warm and specific, no dashes. ` +
    `Return JSON {"rationale":"..."}.` }),
};

// Real .com availability via RDAP (the modern, free WHOIS). 404 = unregistered
// (free), 200 = registered (taken). Authoritative, not a guess. Fails soft to
// "unknown" so the flow never hangs on a slow registry.
// Authoritative RDAP server per TLD (verified to return 404 = free, 200 = taken).
// .co and most ccTLDs have no public RDAP, so they are intentionally absent.
const RDAP_BASE: Record<string, string> = {
  com: "https://rdap.verisign.com/com/v1/",
  net: "https://rdap.verisign.com/net/v1/",
  org: "https://rdap.publicinterestregistry.org/rdap/",
  io: "https://rdap.identitydigital.services/rdap/",
  ai: "https://rdap.identitydigital.services/rdap/",
  app: "https://pubapi.registry.google/rdap/",
  dev: "https://pubapi.registry.google/rdap/",
  xyz: "https://rdap.centralnic.com/xyz/",
};

// The alternative TLDs we check alongside .com, in the order founders care about.
const ALT_TLDS = ["io", "ai", "app"];

async function rdap(slug: string, tld: string): Promise<"available" | "taken" | "unknown"> {
  const base = RDAP_BASE[tld];
  if (!base || !slug) return "unknown";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4500);
  try {
    const res = await fetch(`${base}domain/${slug}.${tld}`, {
      headers: { accept: "application/rdap+json" },
      signal: ctrl.signal,
    });
    if (res.status === 404) return "available";
    if (res.status === 200) return "taken";
    return "unknown";
  } catch {
    return "unknown";
  } finally {
    clearTimeout(timer);
  }
}

// Claude does not know a stable id, timestamp, or true availability, so we stamp
// ids/time and replace the .com guess with a real RDAP lookup (run in parallel).
async function enrichCandidates(data: any): Promise<any> {
  const list = Array.isArray(data?.candidates) ? data.candidates : [];
  const now = new Date().toISOString();
  await Promise.all(list.map(async (c: any, i: number) => {
    const slug = (c.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    // Real .com plus the alternative TLDs, all checked directly for the user.
    const [domainCom, ...altStates] = await Promise.all([rdap(slug, "com"), ...ALT_TLDS.map((t) => rdap(slug, t))]);
    const otherTlds: Record<string, string> = {};
    ALT_TLDS.forEach((t, j) => { otherTlds["." + t] = altStates[j]; });
    c.id = c.id || `c${i}-${Math.abs(hash(c.name || String(i))).toString(36)}`;
    c.territoryId = c.territoryId || "";
    c.rationale = c.rationale || "";
    c.smile = c.smile || {};
    c.scratch = c.scratch || {};
    // Keep Claude's Instagram / INPI estimates; the domains are now real.
    c.availability = { ...(c.availability || {}), domainCom, otherTlds, checkedAt: now };
    c.ownable = domainCom !== "taken" && c.availability.trademarkINPI !== "conflict" && !c.scratch?.copycat;
  }));
  data.candidates = list;
  return data;
}

// v1 compare: real RDAP lookups. For every name we find up to THREE domains that
// are genuinely available — first by swapping the TLD (.com/.io/.ai/.app), then by
// tweaking the name (get…, …app, …hq) so the founder always leaves with options
// they can actually register. Each carries a rough price (it's available, but paid).
const COMPARE_TLDS = ["com", "io", "ai"];
const PRICE: Record<string, [string, string]> = {
  com: ["$12", "$14/yr"], io: ["$38", "$46/yr"], ai: ["$70", "$110/yr"], app: ["$14", "$18/yr"],
};
// Name tweaks tried (all .com) when the plain TLDs don't yield three. Ordered so
// coined names resolve fast; the longer tail covers common words whose obvious
// variants are already grabbed (gettiller/tillerapp taken, but jointiller free).
const NAME_TWEAKS = (slug: string) => [
  `get${slug}`, `${slug}app`, `${slug}hq`, `try${slug}`, `${slug}ly`,
  `${slug}io`, `join${slug}`, `${slug}go`, `hey${slug}`, `${slug}flow`,
];
// Free-plan worker allows ~50 subrequests; cap RDAP calls so a long shortlist
// can't blow the budget (the Claude call is one more). Shared across all rows.
const RDAP_BUDGET = 44;

async function enrichCompare(data: any): Promise<any> {
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const budget = { n: 0 };
  await Promise.all(rows.map(async (r: any) => {
    const slug = (r.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const prior: Record<string, boolean> = {};
    (Array.isArray(r.domains) ? r.domains : []).forEach((d: any) => { prior[d.tld] = !!d.available; });

    // Check the four primary TLDs in parallel.
    const tlds = ["com", "io", "ai", "app"];
    const states: Record<string, string> = {};
    await Promise.all(tlds.map(async (t) => {
      if (budget.n >= RDAP_BUDGET) { states[t] = "unknown"; return; }
      budget.n++;
      states[t] = await rdap(slug, t);
    }));

    // .com/.io/.ai verdict (kept for the Decision screen + back-compat).
    r.domains = COMPARE_TLDS.map((t) => {
      const tld = "." + t;
      const s = states[t];
      const available = s === "available" ? true : s === "taken" ? false : (prior[tld] ?? false);
      return { tld, available };
    });

    // Build up to three genuinely-available suggestions.
    const suggested: any[] = [];
    for (const t of tlds) {
      if (suggested.length >= 3) break;
      if (states[t] === "available") suggested.push({ domain: `${slug}.${t}`, price: PRICE[t][0], renewal: PRICE[t][1] });
    }
    for (const v of NAME_TWEAKS(slug)) {
      if (suggested.length >= 3 || budget.n >= RDAP_BUDGET) break;
      budget.n++;
      if (await rdap(v, "com") === "available") suggested.push({ domain: `${v}.com`, price: PRICE.com[0], renewal: PRICE.com[1] });
    }
    r.suggested = suggested.slice(0, 3);
  }));
  data.rows = rows;
  return data;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
