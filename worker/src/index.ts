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
  INPI_LOGIN?: string;     // optional: INPI data-account login (for the trademark check)
  INPI_PASSWORD?: string;  // optional: INPI data-account password
  FASTLY_KEY?: string;     // optional: Fastly API token for the Domain Research API
                           // (Domainr, now part of Fastly): available / for-sale / taken
  GODADDY_KEY?: string;    // optional: GoDaddy API key (buy-now prices for for-sale domains)
  GODADDY_SECRET?: string; // optional: GoDaddy API secret (paired with GODADDY_KEY)
}

const MODEL = {
  fast: "claude-haiku-4-5-20251001",
  smart: "claude-sonnet-4-6",
  opus: "claude-opus-4-8", // reserved for the creative peak (coining names)
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

    // Requests from the sample/test flow are flagged and never logged centrally.
    const skipLog = !!body?.test;

    // Domain availability for ONE name (its own request => its own subrequest
    // budget => fast + thorough). No Claude call. Called per-name in parallel by
    // the comparison screen, so the table can show scores instantly and fill in
    // domains as they land.
    if (phase === "domains") {
      return json(await domainsFor(body?.payload?.name || ""), env);
    }

    // The full domain board for ONE name: a broad set of TLDs (+ variants) each
    // tagged available / negotiable / taken. Uses Domainr when a key is set (real
    // aftermarket signal), else RDAP (available vs taken only).
    if (phase === "domainboard") {
      return json(await domainBoard(env, body?.payload?.name || ""), env);
    }

    // What's actually on a (taken) domain, plus whether it looks like a real
    // competitor in the founder's space. Fetches the live site, reads title +
    // description, then one fast Claude call for the "same-space?" read.
    if (phase === "siteinfo") {
      return json(await siteInfo(env, body?.payload?.domain || "", body?.brief), env);
    }

    // Real INPI trademark check for ONE name, class-aware: is there a live French/EU
    // mark with this wording in the Nice classes that matter for THIS brand? A mark
    // in a different class is fine. No Claude call. Soft-fails to "unknown" so the
    // client keeps its heuristic when INPI isn't configured or is unreachable.
    if (phase === "inpi") {
      const name = body?.payload?.name || "";
      const classes: number[] = Array.isArray(body?.payload?.classes) ? body.payload.classes : [];
      if (body?.payload?.debug) return json(await inpiDebug(env, body.payload), env); // safe: statuses only, never the token
      return json(await inpiCheck(env, name, classes), env);
    }

    // Lead capture (sign-up at step 1, or the email gate). No Claude call, just logged.
    if (phase === "lead") {
      if (env.LOG && !skipLog) ctx.waitUntil(writeLog(env, "lead", body.process, { brief: body.brief, payload: body.payload }, body.payload || {}));
      return json({ ok: true }, env);
    }

    // End-of-flow feedback (step 10 sliders + notes). No Claude call, just logged.
    if (phase === "feedback") {
      if (env.LOG && !skipLog) ctx.waitUntil(writeLog(env, "feedback", body.process, { payload: body.payload }, body.payload || {}));
      return json({ ok: true }, env);
    }

    // Vote sessions (step 8 Share & vote). Stored in LOG KV with "vote:" prefix, 14-day TTL.
    if (phase === "vote-create") {
      if (!env.LOG) return json({ sessionId: "" }, env);
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      const id = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * 36)]).join("");
      const names: string[] = Array.isArray(body.names) ? body.names : [];
      const session = { names, about: String(body.about || ""), votes: Object.fromEntries(names.map((n: string) => [n, 0])), voters: [] as string[] };
      await env.LOG.put(`vote:${id}`, JSON.stringify(session), { expirationTtl: 60 * 60 * 24 * 14 });
      return json({ sessionId: id }, env);
    }

    if (phase === "vote-cast") {
      if (!env.LOG) return json({ ok: true }, env);
      const raw = await env.LOG.get(`vote:${body.sessionId}`);
      if (!raw) return json({ error: "not found" }, env, 404);
      const session = JSON.parse(raw);
      const voterId: string = String(body.voterId || "");
      if (voterId && (session.voters as string[]).includes(voterId)) return json({ ok: true, duplicate: true }, env);
      const liked: string[] = Array.isArray(body.liked) ? body.liked : [];
      liked.forEach((n: string) => { if (session.votes[n] !== undefined) session.votes[n]++; });
      if (voterId) (session.voters as string[]).push(voterId);
      await env.LOG.put(`vote:${body.sessionId}`, JSON.stringify(session), { expirationTtl: 60 * 60 * 24 * 14 });
      return json({ ok: true }, env);
    }

    if (phase === "vote-results") {
      if (!env.LOG) return json({ votes: {}, total: 0, voters: 0 }, env);
      const raw = await env.LOG.get(`vote:${body.sessionId}`);
      if (!raw) return json({ votes: {}, total: 0, voters: 0 }, env);
      const session = JSON.parse(raw);
      const votes: Record<string, number> = session.votes || {};
      const total = (Object.values(votes) as number[]).reduce((a, b) => a + b, 0);
      return json({ votes, total, voters: (session.voters || []).length }, env);
    }

    const spec = PROMPTS[phase];
    if (!spec) return json({ error: `unknown phase: ${phase}` }, env, 400);

    try {
      const { model, max, prompt } = spec(body);
      const text = await callClaude(env, model, prompt, max);
      let data = parseJSON(text);
      if (data == null) return json({ error: "parse failed" }, env, 502);
      if (phase === "candidates") data = await enrichCandidates(data);
      // Comparison no longer blocks on RDAP: the client fetches real domains
      // per-name via the "domains" phase, so the scored table appears instantly.
      // Best-effort central log (only if a KV namespace is bound, not the test flow,
      // and not the high-volume exploration phase which would flood the log).
      if (env.LOG && !skipLog && phase !== "relate") ctx.waitUntil(writeLog(env, phase, body.process, { brief: body.brief, payload: body.payload }, data));
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
async function writeLog(env: Env, phase: string, process: unknown, input: unknown, output: unknown): Promise<void> {
  if (!env.LOG) return;
  try {
    const at = Date.now();
    const rev = (1e15 - at).toString().padStart(16, "0");
    const key = `log:${rev}:${Math.random().toString(36).slice(2, 8)}`;
    const proc = typeof process === "string" ? process : "";
    await env.LOG.put(key, JSON.stringify({ at, process: proc, phase, source: "live", input, output }), { expirationTtl: 60 * 60 * 24 * 60 });
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

// A labelled brief the model can actually reason over (beats dumping raw JSON).
const briefV1 = (b: any) => [
  `What the company does: ${b?.does || "n/a"}`,
  `Industry: ${b?.industry || "n/a"}`,
  `Problem solved: ${b?.problem || "n/a"}`,
  `Target audience: ${b?.audience || "n/a"}`,
  `What they value: ${b?.values || "n/a"}`,
  `Unique value proposition: ${b?.uvp || "n/a"}`,
  `The name SHOULD signal: ${(b?.signal || []).join(", ") || "n/a"}`,
  `Brand tone: ${(b?.tone || []).join(", ") || "n/a"}`,
  `Naming lanes to explore: ${(b?.lanes || []).join(", ") || "any"}`,
  `Markets it must work in: ${(b?.geos || []).join(", ") || "not specified"}`,
].join("\n");
const briefV2 = (b: any) => JSON.stringify(b || {});

// Each phase -> { model, max, prompt }. Shapes mirror the TS interfaces the
// frontend parses (see src/lib/namingApi.ts and src/v2/types.ts).
const PROMPTS: Record<string, (body: any) => { model: string; max: number; prompt: string }> = {
  /* ---------------- v1 (namingApi) ---------------- */
  concepts: (b) => ({ model: MODEL.smart, max: 1200, prompt:
    `Brief: ${briefV1(b.brief)}.\nPropose 8 distinct, inspiring naming concept territories (clever angles, not names). ` +
    `Return JSON {"concepts":[{"title":"short evocative title","blurb":"one inspiring sentence on the angle","lane":"suggestive|invented|evocative|descriptive|abstract|compound|playful"}]} with exactly 8 items.` }),

  // A single reframed sentence that proves we understand the brand, shown live on
  // the brief steps as the founder types. Cheap + fast; reframes, never echoes.
  synthesize: (b) => ({ model: MODEL.fast, max: 140, prompt:
    `Here is a founder's brief, in progress: ${briefV1(b.brief)}.\n` +
    (b.payload?.prev
      ? `You already wrote this one-line reframe: "${String(b.payload.prev).slice(0, 200)}". ` +
        `KEEP IT. Only adjust it slightly to fold in any genuinely new detail above, change as few words as possible, and if nothing material changed, return it unchanged. Do not rewrite it from scratch or swap the angle.\n`
      : `Write ONE sharp sentence (max 22 words) that reframes what this brand really is, in plain confident language, showing you understand it, do NOT just repeat their words.\n`) +
    `Then give 2 or 3 short lowercase tags (1-2 words each) that capture its character. ` +
    `Return ONLY JSON {"line":"...","tags":["...","..."]}.` }),

  feelings: (b) => ({ model: MODEL.fast, max: 600, prompt:
    `Brief: ${briefV1(b.brief)}.\nList 9 feelings the brand name could evoke. Each needs a short one-line "why it fits THIS brand" (max 14 words) that references the audience. ` +
    `Return JSON {"feelings":[{"word":"Trust","why":"..."}]} with 9 items.` }),

  explore: (b) => ({ model: MODEL.smart, max: 1400, prompt:
    `Brief: ${briefV1(b.brief)}.\nConcept to explore: ${JSON.stringify(b.payload?.concept || {})}.\n` +
    `Give 13 seed words or short expressions that mine this concept, each with 4 to 5 related words (synonyms, sounds, short forms). ` +
    `Return JSON {"title":"the concept title","blurb":"the concept blurb","words":[{"word":"...","related":["...","..."]}]}.` }),

  relate: (b) => ({ model: MODEL.fast, max: 800, prompt:
    `Brief: ${briefV1(b.brief)}.\nThe founder is exploring naming material in the world "${b.payload?.world || ""}". ` +
    `Focus word: "${b.payload?.seed || b.payload?.world || ""}".\n` +
    (b.payload?.seed
      ? `The focus word is "${b.payload.seed}". Use it EXACTLY as the focus word ("word"), never substitute a different word for it. Give a one-line definition of it, `
      : `Pick the single strongest focus word for this world, give a one-line definition, `) +
    `then list words RELATED to that focus word, grouped by HOW they relate. Each group: 5 items, each with the word and a UNIQUE 2-4 word note specific to THAT exact word (its own meaning, image or flavour). The note must NEVER restate the group name or use a generic line like "same field" or "related word"; translations also include a 2-letter language code. ` +
    `Groups: related (same lexical field), metaphor (symbols/images), translation (the idea in other tongues), root (Latin/Greek/Old etymological roots), mythic (famous people, places, myths). ` +
    `Favour distinctive, varied words; avoid generic choices and do not repeat across groups.` +
    (Array.isArray(b.payload?.exclude) && b.payload.exclude.length
      ? ` Avoid these already-shown words: ${b.payload.exclude.slice(-50).join(", ")}.`
      : ``) +
    `\nReturn JSON {"word":"swift","def":"one line","groups":[{"rel":"related","words":[{"w":"fleet","note":"fast and nimble"}]},{"rel":"metaphor","words":[...]},{"rel":"translation","words":[{"w":"veloce","note":"fast","lang":"IT"}]},{"rel":"root","words":[...]},{"rel":"mythic","words":[...]}]}.` }),

  names: (b) => {
   const words = Array.isArray(b.payload?.sketch?.words) ? b.payload.sketch.words : [];
   const n = words.length <= 1 ? 6 : Math.min(12, words.length + 3);
   return { model: MODEL.opus, max: 1800, prompt:
    `You are the lead namer at a world-class branding studio. Founders come to you because your names feel inevitable, the kind of name a company grows into and competitors envy.\n\n` +
    `BRIEF:\n${briefV1(b.brief)}.\n` +
    `Creative direction(s) the founder chose: ${JSON.stringify(b.payload?.sketch?.concepts || [])}.\n` +
    `Word(s) the founder saved and responded to (your primary raw material): ${JSON.stringify(words)}.\n\n` +
    (b.payload?.refine
      ? `THE FOUNDER'S STEER (weight this ABOVE everything else, every name must honour it): "${String(b.payload.refine).slice(0, 240)}".\n\n`
      : ``) +
    `Coin ${n} brand names built from and around that material. They must feel genuinely interesting, original and alive, the opposite of generic AI output. A founder should read the list and feel a spark. Every single one must be a name you would stake the studio's reputation on: no filler to reach the count, no near-duplicates.\n\n` +
    (words.length > 1 ? `Treat the saved words as your palette: you need NOT use every one. Lean into the words with the most naming potential and coin the strongest possible names. Quality over coverage. Tag each with "seed" = the saved word it grew from (or the closest one).\n\n` : `Tag each name with "seed" = "${words[0] || ""}".\n\n`) +
    `WHAT GREAT LOOKS LIKE:\n` +
    `- Short: 1 to 3 syllables, ideally 4 to 8 letters. Sayable once, spellable from hearing. Never long or clunky.\n` +
    `- Original: surprising, not the word a rival would guess. It should make the founder lean in.\n` +
    `- Evocative: it suggests a feeling or an image tied to this brief, it does not literally describe the product.\n` +
    `- Ownable: distinctive enough to be a real trademark and brand, not a plain category word.\n` +
    `- Sound: real mouthfeel and rhythm, a name that rings when said aloud.\n\n` +
    `TECHNIQUES, use a SPREAD across the set (never lean on one trick):\n` +
    `- A real word repurposed (Stripe, Arc, Halo, Ember).\n` +
    `- A blend or portmanteau (Pinterest, Vercel, Brisk).\n` +
    `- A coined word from a Latin, Greek or old root (Vela, Solva, Lumen).\n` +
    `- A foreign-language gem that fits the brief.\n` +
    `- A short, sound-led invented word that simply feels right.\n` +
    `- A myth, place or figure bent to fit (Atlas, Juno, Sienna).\n` +
    `Treat the saved word as a springboard: bend it, blend it, translate it, trace its root, or coin a fresh word that carries its feeling, not just a synonym of it.\n\n` +
    `HARD RULES:\n` +
    `- No tired startup tells: no -ly / -ify / -io / -ai / -able / -ster / -hub / -fy endings, and no dropped trailing vowel (Flickr style).\n` +
    `- No filler coinages built on doubled or stacked vowels (Lumora, Zeneo, Aetheria, Qoraa).\n` +
    (Array.isArray(b.brief?.lanes) && b.brief.lanes.includes("compound")
      ? `- Compounds are welcome here (the founder chose the Compound lane): fuse two real words into one fresh, ownable name. Make it surprising, never a lazy category mashup like SmartPay or QuickHire.\n`
      : `- No two obvious words mashed together (SmartPay, QuickHire).\n`) +
    `- Nothing unpronounceable, nothing over 3 syllables, nothing a famous company already owns.\n` +
    `- CRITICAL: never output any of the saved words verbatim, capitalised, or as a trivial variant. Every name must be a NEW coinage you built FROM that material (bent, blended, rooted, translated), not the input word itself.\n` +
    (Array.isArray(b.brief?.geos) && b.brief.geos.length ? `- MARKETS: the name must read and sound clean in these markets: ${b.brief.geos.join(", ")}. Easy to say and spell there, no accented characters, no unfortunate meaning in their languages.\n` : ``) +
    `\n` +
    (Array.isArray(b.payload?.exclude) && b.payload.exclude.length
      ? `Already proposed (the founder wants DIFFERENT ones, do NOT repeat or lightly vary these): ${b.payload.exclude.slice(-40).join(", ")}.\n\n`
      : ``) +
    `Vary length and rhythm so no two feel like siblings. Order them strongest first. Score honestly 60 to 95 with real spread (most land 70 to 85; reserve 90+ for the rare exceptional one). For each, write a one-line rationale (max 14 words) that is vivid and specific to THIS brand, the kind of line that makes a founder say yes.\n` +
    `Reason silently and return ONLY minified JSON {"names":[{"name":"","type":"one of: descriptive, suggestive, compound, invented, abstract, founder, acronym, evocative, geographic, playful","rationale":"","score":0,"seed":""}]} with exactly ${n} items.` };
  },

  compare: (b) => ({ model: MODEL.smart, max: 2000, prompt:
    `BRIEF:\n${briefV1(b.brief)}.\nScore these names: ${JSON.stringify((b.payload?.names || []).map((n: any) => n.name))}.\n` +
    `For each give intuitive, visual, sound, emotional (each 3-6), total (their sum), a one-line verdict, a "tagline" and BEST-GUESS availability estimates: ` +
    `domains [{"tld":".com","available":bool},{"tld":".io","available":bool},{"tld":".ai","available":bool}], inpi (bool, trademark looks clear), inpiNote, instagram (bool, handle free). ` +
    `STAY POSITIVE: the founder loved every one of these names enough to shortlist it, so the "verdict" and "why" must LEAD WITH what is genuinely good about each name. Find the real strength in every one, be warm and constructive, never harsh or dismissive. The verdict is an encouraging one-liner, not a critique. ` +
    `The tagline is a short BRAND tagline (3 to 6 words) for the COMPANY if it were named this, capturing what it does or how it feels for the brief, NOT a description of the word itself (e.g. for a calm finance app: "Money, finally at peace"). ` +
    `Pick the strongest as recommended and say why (celebrate it). ` +
    `Also pick "niceClasses": the 1 to 3 Nice classification numbers (1 to 45) that this brand would actually register in, based on what it does (e.g. software/SaaS -> 9 and 42; apparel -> 25; cosmetics -> 3; food -> 29 or 30; agency/consulting -> 35; media -> 41). ` +
    `Return JSON {"rows":[{"name","intuitive","visual","sound","emotional","total","tagline","domains","inpi","inpiNote","instagram","verdict"}],"recommended":"Name","why":"2-3 sentences","niceClasses":[9,42]}.` }),

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

async function rdapOnce(slug: string, tld: string, ms: number): Promise<"available" | "taken" | "unknown"> {
  const base = RDAP_BASE[tld];
  if (!base || !slug) return "unknown";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(`${base}domain/${slug}.${tld}`, { headers: { accept: "application/rdap+json" }, signal: ctrl.signal });
    if (res.status === 404) return "available";
    if (res.status === 200) return "taken";
    return "unknown";
  } catch { return "unknown"; }
  finally { clearTimeout(timer); }
}

// Two passes: a fast first try, then one slower retry for anything that came back
// "unknown" (a timeout or a hiccup), so a genuinely-free domain is far less likely
// to be hidden as "not available". 404 = free, 200 = taken.
async function rdap(slug: string, tld: string): Promise<"available" | "taken" | "unknown"> {
  const first = await rdapOnce(slug, tld, 4000);
  if (first !== "unknown") return first;
  return rdapOnce(slug, tld, 6000);
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
// The availability badges shown on the comparison row, in the order founders care
// about for the NAME ITSELF. (.co is intentionally absent: it has no public RDAP,
// so it can't be verified, and we never want to show a guess as a fact.)
const COMPARE_TLDS = ["com", "app", "io"];
const PRICE: Record<string, [string, string]> = {
  com: ["$12", "$14/yr"], app: ["$14", "$18/yr"], io: ["$38", "$46/yr"], ai: ["$70", "$110/yr"],
};
// Logical fallbacks when the exact name is gone, in priority order: the kind of
// thing real startups do (joinX / tryX / getX / useX), then a "the" prefix. All .com.
const NAME_TWEAKS = (slug: string) => [
  `join${slug}`, `try${slug}`, `get${slug}`, `use${slug}`, `the${slug}`, `${slug}app`, `${slug}hq`,
];

function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ").trim();
}

// Best-effort look at who's behind a (taken) domain: fetch the live site, read its
// title + description, then one fast Claude call for "is this a real competitor in
// the founder's space?". Soft-fails to {ok:false} so the UI degrades gracefully.
async function siteInfo(env: Env, domain: string, brief: any): Promise<any> {
  const clean = (domain || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!clean || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(clean)) return { ok: false };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 7000);
  let html = "", finalUrl = `https://${clean}`;
  try {
    const res = await fetch(`https://${clean}`, {
      redirect: "follow", signal: ctrl.signal,
      headers: { "user-agent": "Mozilla/5.0 (compatible; NamingStudioBot/1.0; +https://thenamingstudio)", accept: "text/html" },
    });
    finalUrl = res.url || finalUrl;
    if (res.ok) html = (await res.text()).slice(0, 120000);
  } catch { /* unreachable / blocked / timeout */ }
  finally { clearTimeout(t); }
  if (!html) return { ok: false, url: finalUrl };

  const pick = (re: RegExp) => { const m = html.match(re); return m ? decodeEntities(m[1]) : ""; };
  const title = pick(/<title[^>]*>([^<]{1,200})<\/title>/i)
    || pick(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  const desc = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,400})["']/i)
    || pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{1,400})["']/i)
    || pick(/<meta[^>]+content=["']([^"']{1,400})["'][^>]+name=["']description["']/i);

  // Parked / for-sale placeholder, never treat as a competitor.
  const blob = (title + " " + desc).toLowerCase();
  const parked = /domain (is )?for sale|buy this domain|is parked|sedo|afternic|dan\.com|hugedomains/.test(blob) && blob.length < 140;

  let competitor = false, note = "";
  if ((title + desc).trim().length > 8 && !parked && brief?.does) {
    try {
      const prompt = `A founder is naming a company. Their brief: "${String(brief.does).slice(0, 300)}" (industry: ${brief.industry || "n/a"}).\n\n` +
        `The domain they wanted is already used by a site:\nTitle: ${title}\nDescription: ${desc}\n\n` +
        `Is this existing site an ACTUAL company operating in the SAME space (a real naming/brand conflict), as opposed to unrelated, a personal site, or parked? ` +
        `Reply ONLY JSON: {"competitor": true|false, "note": "<max 12 words: what the site is>"}`;
      const out = parseJSON(await callClaude(env, MODEL.fast, prompt, 120));
      if (out) { competitor = !!out.competitor; note = String(out.note || "").slice(0, 90); }
    } catch { /* leave competitor=false if the read fails */ }
  }
  return { ok: true, url: finalUrl, title: title.slice(0, 120), desc: desc.slice(0, 240), parked, competitor, note };
}

// Real availability for ONE name, in the founder's priority order:
//   1. the name itself on .com, .app, .io (each verified via RDAP)
//   2. logical variants (joinX, tryX, getX, useX) on .com
//   3. a "the" prefix (theX.com)
// All checked in parallel via RDAP, then up to three registrable domains returned.
async function domainsFor(name: string): Promise<{ domains: any[]; suggested: any[] }> {
  const slug = (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!slug) return { domains: [], suggested: [] };
  const tlds = ["com", "app", "io"];   // the name itself, in priority order
  const tweakSlugs = NAME_TWEAKS(slug);
  const [primary, tweaks] = await Promise.all([
    Promise.all(tlds.map((t) => rdap(slug, t))),
    Promise.all(tweakSlugs.map((v) => rdap(v, "com"))),
  ]);
  const states: Record<string, string> = {};
  tlds.forEach((t, i) => { states[t] = primary[i]; });

  const domains = COMPARE_TLDS.map((t) => ({ tld: "." + t, available: states[t] === "available" }));

  const suggested: any[] = [];
  // Tier 1 — the exact name across the priority TLDs.
  for (const t of tlds) {
    if (suggested.length >= 3) break;
    if (states[t] === "available") suggested.push({ domain: `${slug}.${t}`, price: PRICE[t][0], renewal: PRICE[t][1] });
  }
  // Tier 2 + 3 — logical variants, then the "the" prefix.
  tweakSlugs.forEach((v, i) => {
    if (suggested.length < 3 && tweaks[i] === "available") suggested.push({ domain: `${v}.com`, price: PRICE.com[0], renewal: PRICE.com[1] });
  });

  return { domains, suggested: suggested.slice(0, 3) };
}

// ───────────────────────── domain board (Fastly Domain Research + RDAP) ─────────────────────────
// A generous spread of extensions the exact name could live on, each tagged so the
// founder can see, at a glance, what they can register, what's negotiable on the
// aftermarket (with the asking price), and what's gone. Fastly's Domain Research
// API (formerly Domainr) is the only source that knows "negotiable" and the offer
// price; RDAP can only tell available vs taken.
const BOARD_TLDS = ["com", "co", "io", "ai", "app", "dev", "xyz", "net"];
const BOARD_PRICE: Record<string, [string, string]> = {
  com: ["$12", "$14/yr"], co: ["$24", "$30/yr"], io: ["$38", "$46/yr"], ai: ["$70", "$110/yr"],
  app: ["$14", "$18/yr"], dev: ["$12", "$16/yr"], xyz: ["$10", "$12/yr"], net: ["$12", "$15/yr"],
};
type DomStatus = "available" | "negotiable" | "taken" | "unknown";
type DrInfo = { status: DomStatus; premium: boolean; offerPrice?: string; offerUrl?: string };

// Map a Domainr/Fastly status token string to our three buckets.
function classifyStatus(tokens: string): { status: DomStatus; premium: boolean } {
  const t = (tokens || "").toLowerCase();
  const premium = /premium/.test(t);
  if (/inactive|undelegated/.test(t)) return { status: "available", premium };
  if (/marketed|priced|parked|transferable|aftermarket/.test(t)) return { status: "negotiable", premium };
  if (/active|claimed|reserved|disallowed|dpml|tld|zone/.test(t)) return { status: "taken", premium };
  return { status: "unknown", premium };
}

// Pull a usable asking price (and link) out of Fastly's `offers` array. Shapes vary
// by vendor, so read defensively; an offer with no number still means "for sale".
function pickOffer(offers: any): { price?: string; url?: string } | null {
  if (!Array.isArray(offers) || !offers.length) return null;
  for (const o of offers) {
    const raw = o?.price ?? o?.amount ?? o?.priceUsd ?? o?.value;
    const num = raw != null ? Number(String(raw).replace(/[^0-9.]/g, "")) : NaN;
    if (Number.isFinite(num) && num > 0) {
      const cur = String(o?.currency || "USD").toUpperCase();
      const sym = cur === "USD" ? "$" : cur === "EUR" ? "€" : cur === "GBP" ? "£" : "";
      const price = sym ? `${sym}${Math.round(num).toLocaleString("en-US")}` : `${Math.round(num).toLocaleString("en-US")} ${cur}`;
      return { price, url: o?.url || o?.link || "" };
    }
  }
  return { url: offers[0]?.url || offers[0]?.link || "" };
}

// Fastly Domain Research "status" lookups (one per domain, in parallel). Soft-fails
// to {} so the board falls back to RDAP when the key is absent or the call errors.
async function fastlyStatus(env: Env, domains: string[]): Promise<Record<string, DrInfo>> {
  const out: Record<string, DrInfo> = {};
  if (!env.FASTLY_KEY) return out;
  await Promise.all(domains.map(async (domain) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    try {
      const url = `https://api.fastly.com/domain-management/v1/tools/status?domain=${encodeURIComponent(domain)}`;
      const res = await fetch(url, { signal: ctrl.signal, headers: { "Fastly-Key": env.FASTLY_KEY!, accept: "application/json" } });
      if (!res.ok) return;
      const data: any = await res.json();
      const item = Array.isArray(data?.results) ? data.results[0] : Array.isArray(data?.status) ? data.status[0] : data;
      const cl = classifyStatus(String(item?.status || item?.summary || ""));
      const offer = pickOffer(item?.offers);
      // An offer means it's for sale, even if the status string didn't say so.
      const status: DomStatus = offer && cl.status !== "available" ? "negotiable" : cl.status;
      out[domain] = { status, premium: cl.premium, offerPrice: offer?.price, offerUrl: offer?.url };
    } catch { /* leave to RDAP fallback */ }
    finally { clearTimeout(timer); }
  }));
  return out;
}

// GoDaddy buy-now price for a for-sale domain (Afternic "Fast Transfer" inventory
// shows up as available:true with a price). Price is in micro-units (USD * 1e6),
// e.g. 1500000000 = $1,500; we read defensively. Soft-fails to null.
async function godaddyPrice(env: Env, domain: string): Promise<{ price: string } | null> {
  if (!env.GODADDY_KEY || !env.GODADDY_SECRET) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const url = `https://api.godaddy.com/v1/domains/available?domain=${encodeURIComponent(domain)}&checkType=FULL`;
    const res = await fetch(url, { signal: ctrl.signal, headers: { authorization: `sso-key ${env.GODADDY_KEY}:${env.GODADDY_SECRET}`, accept: "application/json" } });
    if (!res.ok) return null;
    const d: any = await res.json();
    const raw = Number(d?.price);
    if (!Number.isFinite(raw) || raw <= 0) return null;
    const dollars = raw >= 100000 ? raw / 1e6 : raw; // micro-units vs plain dollars
    const cur = String(d?.currency || "USD").toUpperCase();
    const sym = cur === "USD" ? "$" : cur === "EUR" ? "€" : cur === "GBP" ? "£" : "";
    const price = sym ? `${sym}${Math.round(dollars).toLocaleString("en-US")}` : `${Math.round(dollars).toLocaleString("en-US")} ${cur}`;
    return { price };
  } catch { return null; }
  finally { clearTimeout(timer); }
}

async function domainBoard(env: Env, name: string): Promise<any> {
  const slug = (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!slug) return { name, tlds: [], variants: [], source: "none" };
  const exact = BOARD_TLDS.map((t) => `${slug}.${t}`);
  const variantSlugs = [`get${slug}`, `try${slug}`, `join${slug}`, `${slug}app`, `${slug}hq`];
  const variants = variantSlugs.map((v) => `${v}.com`);

  const dr = await fastlyStatus(env, [...exact, ...variants]);
  const source = env.FASTLY_KEY && Object.keys(dr).length ? "fastly" : "rdap";

  // For anything Fastly didn't resolve (or no key), fall back to RDAP where we can.
  async function statusFor(domain: string): Promise<DrInfo> {
    if (dr[domain]) return dr[domain];
    const dot = domain.lastIndexOf(".");
    const s = domain.slice(0, dot), tld = domain.slice(dot + 1);
    const r = await rdap(s, tld);
    return { status: r === "available" ? "available" : r === "taken" ? "taken" : "unknown", premium: false };
  }

  const [exactStatuses, variantStatuses] = await Promise.all([
    Promise.all(exact.map(statusFor)),
    Promise.all(variants.map(statusFor)),
  ]);

  // For the for-sale extensions, fetch GoDaddy's buy-now price in parallel, only
  // those domains, so the founder sees an actual number where one exists.
  const priceByDomain: Record<string, string> = {};
  if (env.GODADDY_KEY && env.GODADDY_SECRET) {
    const forSale = BOARD_TLDS.filter((_, i) => exactStatuses[i].status === "negotiable").map((t) => `${slug}.${t}`);
    const prices = await Promise.all(forSale.map((d) => godaddyPrice(env, d)));
    forSale.forEach((d, i) => { if (prices[i]?.price) priceByDomain[d] = prices[i]!.price; });
  }

  const tlds = BOARD_TLDS.map((t, i) => {
    const st = exactStatuses[i];
    const [price, renewal] = BOARD_PRICE[t] || ["$15", "$18/yr"];
    const dom = `${slug}.${t}`;
    return {
      domain: dom, tld: "." + t, status: st.status, premium: st.premium,
      price: st.status === "available" && !st.premium ? price : undefined,
      renewal: st.status === "available" && !st.premium ? renewal : undefined,
      offerPrice: priceByDomain[dom] || st.offerPrice, offerUrl: st.offerUrl,
    };
  });
  const variantHits = variants
    .map((d, i) => ({ domain: d, status: variantStatuses[i].status, price: BOARD_PRICE.com[0], renewal: BOARD_PRICE.com[1] }))
    .filter((v) => v.status === "available");

  return { name, tlds, variants: variantHits, source };
}

// ───────────────────────── INPI trademark check ─────────────────────────
// The INPI "Diffusion PI" API (api-gateway.inpi.fr). We log in once for a Bearer
// token (cached), then search the trademark registers for a given wording and
// decide, class by class, whether it actually conflicts with THIS brand.
//
// Two values below are set to INPI's documented defaults and may need a one-line
// tweak once validated against a live, search-entitled account: AUTH (how the
// login returns its token) and the Solr field names (INPI_F_*). Everything else
// (collections, class logic, parsing, verdict) is settled.
const INPI_BASE = "https://api-gateway.inpi.fr";
const INPI_SEARCH = INPI_BASE + "/services/apidiffusion/api/marques/search";
const INPI_LOGIN_URL = INPI_BASE + "/auth/login";
// FR national + EU (EUTM) + international marks: all three can block a name in France.
const INPI_COLLECTIONS = ["FMARK", "CTMARK", "TMINT"];
// Solr fields, "INPI syntax". Isolated so they're a single change if the catalogue
// names differ from these conventional ones.
const INPI_F_WORDING = "markVerbalElementText";

// The gateway protects every POST with a cookie-based CSRF token, so logging in is
// a handshake: GET to receive an XSRF-TOKEN cookie, then POST /auth/login with that
// token echoed in the X-XSRF-TOKEN header. We carry the cookies forward so the
// (also POST) search passes CSRF too.
// A throwaway login POST (dummy creds) just to receive a fresh XSRF-TOKEN cookie;
// the gateway sets it on every response. We use a fake username so the real
// account is never touched by the priming call.
async function inpiPrime(): Promise<string> {
  // The gateway occasionally 522s the priming call from Cloudflare's egress; retry
  // until we actually get an XSRF-TOKEN cookie.
  for (let i = 0; i < 4; i++) {
    try {
      const p = await fetch(INPI_LOGIN_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "_", password: "_" }) });
      const c = mergeCookies(p.headers);
      if (xsrfOf(c)) return c;
    } catch { /* retry */ }
  }
  return "";
}

// Merge Set-Cookie(s) from a response into a "name=value; ..." Cookie header.
function mergeCookies(headers: Headers, prev = ""): string {
  const jar = new Map<string, string>();
  for (const part of prev.split(/;\s*/)) { const i = part.indexOf("="); if (i > 0) jar.set(part.slice(0, i), part.slice(i + 1)); }
  const list: string[] = typeof (headers as any).getSetCookie === "function"
    ? (headers as any).getSetCookie()
    : (headers.get("set-cookie") ? [headers.get("set-cookie") as string] : []);
  for (const sc of list) { const head = sc.split(";")[0]; const i = head.indexOf("="); if (i > 0) jar.set(head.slice(0, i).trim(), head.slice(i + 1)); }
  return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
}
const xsrfOf = (cookie: string): string => (cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1] || "";

// Cached auth (module scope persists across requests on a warm isolate).
let inpiAuthCache: { token: string; cookies: string; exp: number } | null = null;

async function inpiAuth(env: Env): Promise<{ token: string; cookies: string } | null> {
  if (!env.INPI_LOGIN || !env.INPI_PASSWORD) return null;
  const now = Date.now();
  if (inpiAuthCache && inpiAuthCache.exp > now + 60_000) return inpiAuthCache;
  try {
    let cookies = await inpiPrime();                                   // 1. get the XSRF cookie
    const r = await fetch(INPI_LOGIN_URL, {                             // 2. login with the CSRF token
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json", "X-XSRF-TOKEN": xsrfOf(cookies), cookie: cookies },
      body: JSON.stringify({ username: env.INPI_LOGIN, password: env.INPI_PASSWORD }),
    });
    if (!r.ok) return null;
    cookies = mergeCookies(r.headers, cookies);                        // carry any rotated cookies
    let token = (r.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) { try { const j: any = await r.json(); token = j?.id_token || j?.token || j?.access_token || ""; } catch { /* no body token */ } }
    if (!token) return null;
    inpiAuthCache = { token, cookies, exp: now + 50 * 60_000 };        // tokens last ~1h; refresh early
    return inpiAuthCache;
  } catch { return null; }
}

// Pull (wording, Nice classes, status) from each ST66 record in the XML response.
// Tolerant by design: matches the ST66 tags but also bare local names, so a small
// namespace/prefix difference doesn't drop everything.
function parseInpiMarks(xml: string): { name: string; classes: number[]; status: string }[] {
  const out: { name: string; classes: number[]; status: string }[] = [];
  // Split into per-mark blocks (ST66 uses <TradeMark>...</TradeMark>).
  const blocks = xml.split(/<\/(?:[a-zA-Z]+:)?TradeMark>/).slice(0, -1);
  const grab = (s: string, tag: string) => {
    const m = s.match(new RegExp(`<(?:[a-zA-Z]+:)?${tag}>([^<]+)</`, "i"));
    return m ? m[1].trim() : "";
  };
  for (const b of blocks) {
    const name = grab(b, "MarkVerbalElementText") || grab(b, "WordMarkSpecification");
    const status = grab(b, "MarkCurrentStatusCode") || grab(b, "MarkFeature");
    const classes = Array.from(b.matchAll(/<(?:[a-zA-Z]+:)?ClassNumber>\s*(\d{1,2})\s*</gi)).map((m) => parseInt(m[1], 10));
    if (name) out.push({ name, classes: Array.from(new Set(classes)), status });
  }
  return out;
}

// A mark is "dead" (ignore it) only if its status clearly says so. Anything else
// (registered, pending, unknown) counts as a live obstacle.
function inpiDead(status: string): boolean {
  return /expir|withdraw|retir|radi|annul|refus|reject|lapsed|abandon|expired|surrender/i.test(status || "");
}

// Safe diagnostic: returns where the INPI flow stands (HTTP statuses, whether a
// token came back, a sanitized sample of the search response) WITHOUT ever
// returning the token, password, or login body. Used to validate the two
// constants against a live entitled account.
async function inpiDebug(env: Env, p: any): Promise<any> {
  const out: any = { credsPresent: !!(env.INPI_LOGIN && env.INPI_PASSWORD) };
  if (!out.credsPresent) return out;
  try {
    // Fresh login here (don't depend on the cache) and capture the granted scope.
    let cookies = await inpiPrime();
    const lr = await fetch(INPI_LOGIN_URL, { method: "POST", headers: { "content-type": "application/json", accept: "application/json", "X-XSRF-TOKEN": xsrfOf(cookies), cookie: cookies }, body: JSON.stringify({ username: env.INPI_LOGIN, password: env.INPI_PASSWORD }) });
    out.loginStatus = lr.status;
    const lj: any = await lr.json().catch(() => ({}));
    const token = lj?.access_token || lj?.id_token || lj?.token || "";
    out.gotToken = !!token;
    out.scope = lj?.scope; out.tokenType = lj?.token_type;
    // Decode the JWT payload's authorities/roles (claims are not secrets; never the token).
    try { const pl = JSON.parse(atob((token.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/"))); out.jwtClaims = { auth: pl.auth, authorities: pl.authorities, scope: pl.scope, aud: pl.aud, sub: pl.sub, user: pl.user_name || pl.preferred_username, client: pl.client_id || pl.azp }; } catch { /* not a jwt */ }
    if (!token) { out.loginBody = JSON.stringify(lj).slice(0, 200); return out; }
    cookies = mergeCookies(lr.headers, cookies);
    const auth = { token, cookies };
    const H = { authorization: "Bearer " + auth.token, "X-XSRF-TOKEN": xsrfOf(auth.cookies), cookie: auth.cookies };
    // metadata GET (reachability with our token)
    const mr = await fetch(INPI_BASE + "/services/apidiffusion/api/marques/metadata", { headers: { ...H, accept: "application/json" } });
    out.metadataStatus = mr.status; out.metadataSample = (await mr.text()).slice(0, 160);
    // Run a search body (overridable from curl) to capture the failure.
    const accept = p?.accept || "application/xml";
    const body = p?.searchBody || { query: "*:*", collections: ["FMARK"], size: 2, position: 0, withFacets: false };
    const sr = await fetch(INPI_SEARCH, { method: "POST", headers: { ...H, "content-type": "application/json", accept }, body: JSON.stringify(body) });
    out.sentBody = body; out.accept = accept;
    out.searchStatus = sr.status; out.searchContentType = sr.headers.get("content-type");
    const txt = await sr.text();
    out.searchHasMarks = /MarkVerbalElementText|TradeMark/i.test(txt);
    try { const ej = JSON.parse(txt); out.searchError = { status: ej.status, title: ej.title, detail: ej.detail, message: ej.message, path: ej.path }; } catch { out.searchSample = txt.slice(0, 300); }
  } catch (e: any) { out.error = String(e?.message || e); }
  return out;
}

async function inpiCheck(env: Env, rawName: string, classes: number[]): Promise<{
  ok: boolean; verdict: "clear" | "conflict" | "adjacent" | "unknown"; classes: number[]; hits: { name: string; classes: number[] }[];
}> {
  const name = (rawName || "").trim();
  const unknown = { ok: false, verdict: "unknown" as const, classes, hits: [] };
  if (!name) return unknown;
  const auth = await inpiAuth(env);
  if (!auth) return unknown;
  try {
    const q = `${INPI_F_WORDING}:"${name.replace(/["\\]/g, " ")}"`;
    const body = { query: q, collections: INPI_COLLECTIONS, size: 50, position: 0, withFacets: false };
    const r = await fetch(INPI_SEARCH, {
      method: "POST",
      headers: { authorization: "Bearer " + auth.token, "content-type": "application/json", accept: "application/xml", "X-XSRF-TOKEN": xsrfOf(auth.cookies), cookie: auth.cookies },
      body: JSON.stringify(body),
    });
    if (!r.ok) return unknown;
    const xml = await r.text();
    const low = name.toLowerCase();
    // Live marks whose wording actually matches this name (exact, case-insensitive).
    const live = parseInpiMarks(xml).filter((m) => !inpiDead(m.status) && m.name.toLowerCase() === low);
    const wanted = new Set(classes);
    const sameClass = live.filter((m) => m.classes.some((c) => wanted.has(c)));
    const verdict = sameClass.length ? "conflict" : live.length ? "adjacent" : "clear";
    const hits = (sameClass.length ? sameClass : live).slice(0, 5).map((m) => ({ name: m.name, classes: m.classes }));
    return { ok: true, verdict, classes, hits };
  } catch { return unknown; }
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
