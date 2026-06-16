// the naming studio - API Worker (plain-JS version for the Cloudflare dashboard).
// Paste this WHOLE file into the Cloudflare Worker code editor, then click Deploy.
// Afterwards add a Secret named ANTHROPIC_API_KEY in the Worker's Settings.

const MODEL = {
  fast: "claude-haiku-4-5-20251001",
  smart: "claude-sonnet-4-6",
};

const SYS =
  "You are a world-class brand naming strategist working inside a naming studio. " +
  "You are warm, opinionated and precise. You ALWAYS respond with one valid, minified JSON value and nothing else: no prose, no markdown, no code fences. " +
  "Never use em dashes or en dashes (the characters); use commas, periods, colons or parentheses instead.";

function cors(env) {
  return {
    "Access-Control-Allow-Origin": (env && env.ALLOWED_ORIGIN) || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors(env) });
    if (req.method !== "POST") return json({ error: "POST only" }, env, 405);

    let body;
    try { body = await req.json(); } catch (e) { return json({ error: "bad json" }, env, 400); }

    const phase = (body && body.phase) || "";
    const spec = PROMPTS[phase];
    if (!spec) return json({ error: "unknown phase: " + phase }, env, 400);

    try {
      const out = spec(body);
      const text = await callClaude(env, out.model, out.prompt, out.max);
      let data = parseJSON(text);
      if (data == null) return json({ error: "parse failed" }, env, 502);
      if (phase === "candidates") data = fixCandidates(data);
      return json(data, env);
    } catch (e) {
      return json({ error: String((e && e.message) || e) }, env, 502);
    }
  },
};

async function callClaude(env, model, user, max_tokens) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      max_tokens: max_tokens,
      system: [{ type: "text", text: SYS, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error("anthropic " + res.status + ": " + (await res.text()));
  const data = await res.json();
  return (data.content || []).map(function (b) { return b.text || ""; }).join("");
}

function parseJSON(text) {
  let t = (text || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch (e) { /* try slicing */ }
  const starts = ["{", "["].map(function (c) { const i = t.indexOf(c); return i < 0 ? Infinity : i; });
  const s = Math.min.apply(null, starts);
  const e = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (s !== Infinity && e > s) { try { return JSON.parse(t.slice(s, e + 1)); } catch (e2) { /* give up */ } }
  return null;
}

function json(data, env, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ "content-type": "application/json" }, cors(env)),
  });
}

const briefV1 = function (b) { return JSON.stringify(b || {}); };
const briefV2 = function (b) { return JSON.stringify(b || {}); };

const PROMPTS = {
  /* ---------------- v1 ---------------- */
  concepts: (b) => ({ model: MODEL.smart, max: 1200, prompt:
    "Brief: " + briefV1(b.brief) + ".\nPropose 8 distinct, inspiring naming concept territories (clever angles, not names). " +
    'Return JSON {"concepts":[{"title":"short evocative title","blurb":"one inspiring sentence on the angle","lane":"suggestive|invented|evocative|descriptive|abstract|compound|playful"}]} with exactly 8 items.' }),

  feelings: (b) => ({ model: MODEL.fast, max: 900, prompt:
    "Brief: " + briefV1(b.brief) + ".\nList 14 feelings the brand name could evoke. Each needs a one-line why it fits THIS brand that references the audience. " +
    'Return JSON {"feelings":[{"word":"Trust","why":"..."}]} with 14 items.' }),

  explore: (b) => ({ model: MODEL.smart, max: 1400, prompt:
    "Brief: " + briefV1(b.brief) + ".\nConcept to explore: " + JSON.stringify((b.payload && b.payload.concept) || {}) + ".\n" +
    "Give 13 seed words or short expressions that mine this concept, each with 4 to 5 related words. " +
    'Return JSON {"title":"the concept title","blurb":"the concept blurb","words":[{"word":"...","related":["...","..."]}]}.' }),

  names: (b) => ({ model: MODEL.smart, max: 1500, prompt:
    "Brief: " + briefV1(b.brief) + ".\nConcepts: " + JSON.stringify((b.payload && b.payload.sketch && b.payload.sketch.concepts) || []) +
    ". Resonant words: " + JSON.stringify((b.payload && b.payload.sketch && b.payload.sketch.words) || []) + ".\n" +
    "Coin 12 brand name candidates drawing on these. Mix lanes. Each: a short rationale and a score 70-98. " +
    'Return JSON {"names":[{"name":"Lumora","type":"suggestive","rationale":"one line","score":88}]} with 12 items.' }),

  compare: (b) => ({ model: MODEL.smart, max: 1800, prompt:
    "Brief: " + briefV1(b.brief) + ".\nScore these names: " + JSON.stringify(((b.payload && b.payload.names) || []).map(function (n) { return n.name; })) + ".\n" +
    "For each give intuitive, visual, sound, emotional (each 3-6), total (their sum), a one-line verdict, and BEST-GUESS availability estimates: " +
    'domains [{"tld":".com","available":true},{"tld":".io","available":true},{"tld":".co","available":true}], inpi (boolean), inpiNote, instagram (boolean). Pick the strongest as recommended and say why. ' +
    'Return JSON {"rows":[{"name":"","intuitive":0,"visual":0,"sound":0,"emotional":0,"total":0,"domains":[],"inpi":true,"inpiNote":"","instagram":true,"verdict":""}],"recommended":"Name","why":"2-3 sentences"}.' }),

  brandbook: (b) => ({ model: MODEL.smart, max: 1800, prompt:
    "Brief: " + briefV1(b.brief) + '.\nCreate a starter brand book for the chosen name "' + ((b.payload && b.payload.name) || "") + '". ' +
    'Return JSON {"essence":"3 words","tagline":"short","story":"3 sentences","whyName":"1-2 sentences","voice":{"adjectives":["a","b","c","d"],"dos":["a","b","c"],"donts":["a","b","c"],"sample":"one sentence of brand voice"},' +
    '"palette":[{"hex":"#1F1B18","name":"Espresso","role":"Ink"}],"fontKey":"editorial|modern|classic|friendly|warm","fontNote":"one line",' +
    '"messaging":{"pitch":"one line","boilerplate":"2 sentences","taglines":["a","b","c"],"valueProps":["a","b","c"]}} (palette must have 5 swatches).' }),

  suggest: (b) => ({ model: MODEL.fast, max: 300, prompt:
    "Brief so far: " + briefV1(b.brief) + '.\nSuggest 3 short, concrete options for the "' + ((b.payload && b.payload.field) || "") + '" field. ' +
    'Return JSON {"suggestions":["...","...","..."]}.' }),

  interview: (b) => ({ model: MODEL.smart, max: 700, prompt:
    "You are interviewing a founder to build a naming brief. Conversation so far (newest last): " + JSON.stringify((b.payload && b.payload.messages) || []) + ".\n" +
    "If there are at least 5 user answers, set done true and produce the brief; otherwise ask ONE warm, specific next question and set done false. " +
    'Return JSON {"say":"your line","done":false,"brief":{"does":"","industry":"","problem":"","audience":"","values":"","uvp":"","signal":[],"avoid":[],"tone":[],"lanes":[]}} (omit brief unless done).' }),

  /* ---------------- v2 ---------------- */
  territories: (b) => ({ model: MODEL.smart, max: 1300, prompt:
    "Brief: " + briefV2(b.brief) + ".\nPropose 6 naming territories (directions) that fit this brief. Each must carry an explicit tradeoff. " +
    'Return JSON {"territories":[{"id":"slug","name":"The invented word","description":"one line","examplePattern":"Brand1 / Brand2 / Brand3","buys":"what it gives you","costs":"the tradeoff","selected":false}]} with 6 items.' }),

  board: (b) => ({ model: MODEL.smart, max: 1500, prompt:
    "Brief: " + briefV2(b.brief) + ".\nConcepts chosen: " + JSON.stringify((b.territories || []).map(function (t) { return { name: t.name, description: t.description }; })) + ".\n" +
    "Produce 14 evocative REAL words and 2 to 3 short quotes that these concepts suggest (raw material, NOT brand names). " +
    "Each item: its source concept name and a one-line studio read of what it evokes. " +
    'Return JSON {"seeds":[{"label":"word or short quote","kind":"word","concept":"source concept name","description":"one line"}]} (kind is word or quote).' }),

  candidates: (b) => ({ model: MODEL.smart, max: 2600, prompt:
    "Brief: " + briefV2(b.brief) + ".\nKept words and quotes: " + JSON.stringify(b.keptWords || []) +
    ". Concepts: " + JSON.stringify((b.territories || []).filter(function (t) { return t.selected; }).map(function (t) { return { id: t.id, name: t.name }; })) + ".\n" +
    "Coin " + (b.count || 8) + ' brand name candidates from this material. For each: name; territoryId (a concept id or ""); rationale (one line); ' +
    "smile {suggestive,memorable,imagery,legs,emotional,overall} each 0-100; scratch {spellingChallenged,copycat,restrictive,annoying,tame,hardToPronounce} booleans; " +
    'availability {domainCom:"available|taken|premium",otherTlds:{".io":"available|taken",".co":"available|taken"},instagram:"available|taken",trademarkINPI:"clear|conflict|unknown"} as rough estimates; ownable (boolean). ' +
    'Return JSON {"candidates":[{"name":"","territoryId":"","rationale":"","smile":{},"scratch":{},"availability":{},"ownable":true}]}.' }),

  pressure: (b) => ({ model: MODEL.fast, max: 500, prompt:
    "Brief markets: " + JSON.stringify((b.brief && b.brief.targetMarkets) || ["FR"]) + '.\nPressure-test the name "' + ((b.candidate && b.candidate.name) || "") + '". ' +
    'Return JSON {"candidateId":"' + ((b.candidate && b.candidate.id) || "") + '","barTest":"pass","spellTest":"pass","linguisticSafety":[{"market":"FR","result":"pass"}],"stretchTest":"pass"} (each test is pass, warn or fail; add a note only when not pass).' }),

  rationale: (b) => ({ model: MODEL.smart, max: 500, prompt:
    "Brief: " + briefV2(b.brief) + '.\nWrite the case for choosing the name "' + ((b.candidate && b.candidate.name) || "") + '": 4 to 5 sentences, investor-grade, warm and specific, no dashes. ' +
    'Return JSON {"rationale":"..."}.' }),
};

function fixCandidates(data) {
  const list = (data && Array.isArray(data.candidates)) ? data.candidates : [];
  const now = new Date().toISOString();
  data.candidates = list.map(function (c, i) {
    return {
      id: c.id || ("c" + i + "-" + Math.abs(hash(c.name || String(i))).toString(36)),
      name: c.name,
      territoryId: c.territoryId || "",
      rationale: c.rationale || "",
      smile: c.smile || {},
      scratch: c.scratch || {},
      availability: Object.assign({}, c.availability || {}, { checkedAt: now }),
      ownable: !!c.ownable,
    };
  });
  return data;
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
