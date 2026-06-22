import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { spawn } from "node:child_process";
import { copyFileSync } from "node:fs";

// On GitHub Pages the app is served from https://<user>.github.io/brandr/,
// so production assets need the "/brandr/" base. Dev stays at "/".
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/brandr/" : "/",
  plugins: [react(), tailwindcss(), claudeBridge(), spa404()],
}));

// GitHub Pages has no SPA rewrite, so deep paths like /brandr/admin 404. Copying
// the built index.html to 404.html makes GitHub serve the app for any unknown
// path, and the client router takes over.
function spa404() {
  return {
    name: "spa-404",
    closeBundle() {
      try { copyFileSync("dist/index.html", "dist/404.html"); } catch { /* dev / no dist */ }
    },
  };
}

/**
 * Dev-only bridge: POST /api/naming -> runs `claude -p` with the right prompt
 * for each phase, using the machine's logged-in Claude account. The browser
 * never sees a key. Works in `npm run dev`; not available on static hosting.
 */
function claudeBridge() {
  return {
    name: "claude-bridge",
    configureServer(server: any) {
      server.middlewares.use("/api/naming", (req: any, res: any, next: any) => {
        if (req.method !== "POST") return next();
        let body = "";
        req.on("data", (c: any) => (body += c));
        req.on("end", async () => {
          try {
            const { phase, brief, payload } = JSON.parse(body || "{}");
            // Domain availability is pure RDAP (no Claude), mirrors the Worker.
            if (phase === "domains") {
              res.setHeader("content-type", "application/json");
              res.end(JSON.stringify(await domainsForNode(payload?.name || "")));
              return;
            }
            // INPI needs a licensed account + token (only on the deployed Worker).
            // In dev we return "unknown" so the UI keeps its heuristic estimate.
            if (phase === "inpi") {
              res.setHeader("content-type", "application/json");
              res.end(JSON.stringify({ ok: false, verdict: "unknown", classes: payload?.classes || [], hits: [] }));
              return;
            }
            const prompt = buildPrompt(phase, brief, payload);
            const raw = await runClaude(prompt);
            const json = extractJson(raw);
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify(json));
          } catch (e: any) {
            res.statusCode = 500;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ error: String(e?.message || e) }));
          }
        });
      });
    },
  };
}

function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // stdin: "ignore" => immediate EOF so `claude -p` doesn't block reading stdin.
    const child = spawn("claude", ["-p", prompt], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), 180_000);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else reject(new Error(err.trim() || `claude exited with code ${code}`));
    });
  });
}

// Dev-only RDAP domain availability (mirrors the Worker's domainsFor).
const RDAP_BASE_NODE: Record<string, string> = {
  com: "https://rdap.verisign.com/com/v1/",
  io: "https://rdap.identitydigital.services/rdap/",
  ai: "https://rdap.identitydigital.services/rdap/",
  app: "https://pubapi.registry.google/rdap/",
};
async function rdapNode(slug: string, tld: string): Promise<"available" | "taken" | "unknown"> {
  const base = RDAP_BASE_NODE[tld];
  if (!base || !slug) return "unknown";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    const res = await fetch(`${base}domain/${slug}.${tld}`, { headers: { accept: "application/rdap+json" }, signal: ctrl.signal });
    if (res.status === 404) return "available";
    if (res.status === 200) return "taken";
    return "unknown";
  } catch { return "unknown"; } finally { clearTimeout(timer); }
}
async function domainsForNode(name: string): Promise<{ domains: any[]; suggested: any[] }> {
  const slug = (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!slug) return { domains: [], suggested: [] };
  const tlds = ["com", "io", "ai", "app"];
  const tweakSlugs = [`get${slug}`, `${slug}app`, `${slug}hq`, `try${slug}`, `${slug}ly`, `${slug}io`, `join${slug}`, `${slug}go`, `hey${slug}`, `${slug}flow`];
  const PR: Record<string, [string, string]> = { com: ["$12", "$14/yr"], io: ["$38", "$46/yr"], ai: ["$70", "$110/yr"], app: ["$14", "$18/yr"] };
  const [primary, tweaks] = await Promise.all([
    Promise.all(tlds.map((t) => rdapNode(slug, t))),
    Promise.all(tweakSlugs.map((v) => rdapNode(v, "com"))),
  ]);
  const states: Record<string, string> = {};
  tlds.forEach((t, i) => { states[t] = primary[i]; });
  const domains = ["com", "io", "ai"].map((t) => ({ tld: "." + t, available: states[t] === "available" }));
  const suggested: any[] = [];
  for (const t of tlds) { if (suggested.length >= 3) break; if (states[t] === "available") suggested.push({ domain: `${slug}.${t}`, price: PR[t][0], renewal: PR[t][1] }); }
  tweakSlugs.forEach((v, i) => { if (suggested.length < 3 && tweaks[i] === "available") suggested.push({ domain: `${v}.com`, price: PR.com[0], renewal: PR.com[1] }); });
  return { domains, suggested: suggested.slice(0, 3) };
}

function extractJson(text: string): any {
  const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = Math.min(...["{", "["].map((c) => (cleaned.indexOf(c) + 1 || Infinity)) ) - 1;
    const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("Model did not return valid JSON. Got: " + cleaned.slice(0, 200));
  }
}

const SYS =
  "You are a senior brand-naming strategist and linguist working at a boutique naming studio. " +
  "You think in stories and brand strategy, not keyword soup. Copy is crisp, warm and human, never buzzwordy, never robotic. " +
  "NEVER use em dashes or en dashes (the characters — or –) anywhere in your output; use commas, periods, colons or parentheses instead. " +
  "CRITICAL: respond with ONLY strict, valid, minified JSON matching the requested schema. No markdown, no code fences, no commentary before or after.";

function briefBlock(b: any): string {
  return [
    `What the company does: ${b.does || "—"}`,
    `Industry: ${b.industry || "—"}`,
    `Problem solved: ${b.problem || "—"}`,
    `Target audience: ${b.audience || "—"}`,
    `What they value: ${b.values || "—"}`,
    `Unique value proposition: ${b.uvp || "—"}`,
    `The name SHOULD signal: ${(b.signal || []).join(", ") || "—"}`,
    `The name should NOT signal: ${(b.avoid || []).join(", ") || "—"}`,
    `Brand tone / personality: ${(b.tone || []).join(", ") || "—"}`,
    `Naming lanes to explore: ${(b.lanes || []).join(", ") || "any"}`,
  ].join("\n");
}

function buildPrompt(phase: string, brief: any, payload: any): string {
  const B = briefBlock(brief);
  switch (phase) {
    case "concepts":
      return `${SYS}\n\nBRIEF:\n${B}\n\nTASK: Propose exactly 10 distinct CONCEPT TERRITORIES, the creative naming angles for this brand. Each TITLE must be INSPIRING and instantly CLEAR: a founder should read the title alone and immediately grasp the idea and feel a spark. Push past the obvious. Include clever strategic angles such as: "The ironic inversion" (name it the opposite of what it is, e.g. Ordinary, Regular, Beige, and let the wink do the work), "The insider code" (a name that reads like a password only the right people get), "The hidden name" (understated, almost a secret you discover), alongside metaphor, borrowed-from-nature, borrowed-myth, invented-word, plain-spoken and playful-twist angles. Every territory must fit the brief, tone and chosen lanes. For each give: a short evocative title (2-4 words), a one-sentence blurb that makes the angle clear and exciting (and hints at the kind of names it leads to), and the single best-fit lane from [descriptive, suggestive, compound, invented, abstract, founder, acronym, evocative, geographic, playful].\nSCHEMA: {"concepts":[{"title":"","blurb":"","lane":""}]}`;
    case "synthesize":
      return `${SYS}\n\nBRIEF (in progress):\n${B}\n\nTASK: Write ONE sharp sentence (max 22 words) that reframes what this brand really is, in plain confident language, showing you understand it — do NOT just repeat their words. Then give 2 or 3 short lowercase tags (1-2 words each) capturing its character.\nSCHEMA: {"line":"","tags":["",""]}`;
    case "feelings":
      return `${SYS}\n\nBRIEF:\n${B}\n\nTASK: Propose exactly 9 distinct FEELINGS the brand's name could evoke, chosen and worded for THIS specific brand. The founder will swipe through them like Tinder, so make each one feel hand-picked for them. For each give: word (a single evocative feeling, e.g. Trust, Effortless, Rebellion) and why (one short, warm sentence, max ~14 words, that ties the feeling directly to what they do, who it's for, or the problem they solve — reference their audience or offering specifically, never generic). Spread across a real emotional range; avoid near-duplicates.\nSCHEMA: {"feelings":[{"word":"","why":""}]}`;
    case "words":
      return `${SYS}\n\nBRIEF:\n${B}\n\nCHOSEN TERRITORIES:\n${JSON.stringify(payload.concepts)}\n\nTASK: Mine these territories for exactly 24 evocative WORDS that could seed a brand name — real words, roots, metaphors, foreign-language gems, phonetic plays. Spread them across the chosen territories. For each: the word, and which territory title it came from.\nSCHEMA: {"words":[{"word":"","territory":""}]}`;
    case "explore":
      return `${SYS}\n\nBRIEF:\n${B}\n\nDIRECTION TO EXPLORE:\n${JSON.stringify(payload.concept)}\n\nTASK: Turn this one direction into a CONSTELLATION OF WORDS the founder will explore to spark a name. Give:\n- blurb: one clear, plain sentence on what this direction is (no jargon).\n- words: exactly 13 evocative SEED words that capture this world, the raw material of a great name (single words: nouns, adjectives, metaphors, roots; varied, on-brief, no duplicates). For EACH seed give exactly 5 related words to go deeper: synonyms, metaphors, foreign-language gems, sounds, or short forms.\nSCHEMA: {"title":"","blurb":"","words":[{"word":"","related":["","","","",""]}]}`;
    case "relate":
      return `${SYS}\n\nBRIEF:\n${B}\n\nWORLD: ${JSON.stringify(payload.world)}\nFOCUS WORD: ${JSON.stringify(payload.seed || payload.world)}\n\nTASK: The founder is exploring naming material. Pick the single best FOCUS WORD (use the given focus word if it is a real, evocative single word; otherwise pick the strongest word for this world). Give a one-line definition, then list words RELATED to that focus word, grouped by HOW they relate. Each group: exactly 5 items, each with the word and a UNIQUE 2-4 word note specific to THAT exact word (its own meaning, image or flavour) — the note must NEVER restate the group name or use a generic line like "same field" or "related word"; translations also include a 2-letter language code. Groups: related (same lexical field), metaphor (symbols/images), translation (the idea in other tongues), root (Latin/Greek/Old etymological roots), mythic (famous people, places, myths). Favour distinctive, varied words; avoid generic choices and do not repeat across groups.${Array.isArray(payload.exclude) && payload.exclude.length ? ` Avoid these already-shown words: ${payload.exclude.slice(-50).join(", ")}.` : ``}\nSCHEMA: {"word":"","def":"","groups":[{"rel":"related","words":[{"w":"","note":""}]},{"rel":"metaphor","words":[{"w":"","note":""}]},{"rel":"translation","words":[{"w":"","note":"","lang":"IT"}]},{"rel":"root","words":[{"w":"","note":""}]},{"rel":"mythic","words":[{"w":"","note":""}]}]}`;
    case "names": {
      const nwords = Array.isArray(payload.sketch?.words) ? payload.sketch.words : [];
      const nn = nwords.length <= 1 ? 6 : Math.min(12, nwords.length + 3);
      return `${SYS}\n\nYou are the lead namer at a world-class branding studio. Founders come to you because your names feel inevitable, the kind a company grows into and competitors envy.\n\nBRIEF:\n${B}\n\nCreative direction(s) the founder chose: ${JSON.stringify(payload.sketch?.concepts ?? [])}\nWord(s) the founder saved and responded to (your primary raw material): ${JSON.stringify(nwords)}\n\nTASK: Coin ${nn} brand names built from and around that material. They must feel genuinely interesting, original and alive, the opposite of generic AI output, the kind that makes a founder lean in.\n\n${nwords.length > 1 ? `Spread the names across the saved words: every saved word should inspire at least one name. Tag each name with "seed" = the EXACT saved word it grew from.\n\n` : `Tag each name with "seed" = "${nwords[0] || ""}".\n\n`}WHAT GREAT LOOKS LIKE:\n- Short: 1 to 3 syllables, ideally 4 to 8 letters. Sayable once, spellable from hearing. Never long or clunky.\n- Original: surprising, not the word a rival would guess.\n- Evocative: suggests a feeling or image tied to this brief, does not literally describe the product.\n- Ownable: distinctive enough to be a real trademark and brand, not a plain category word.\n- Sound: real mouthfeel and rhythm, a name that rings aloud.\n\nTECHNIQUES, use a SPREAD across the set (never lean on one trick): a real word repurposed (Stripe, Arc, Halo, Ember); a blend or portmanteau (Pinterest, Vercel, Brisk); a coined word from a Latin/Greek/old root (Vela, Solva, Lumen); a foreign-language gem that fits; a short sound-led invented word that simply feels right; a myth, place or figure bent to fit (Atlas, Juno, Sienna). Treat the saved word as a springboard: bend it, blend it, translate it, trace its root, or coin a fresh word that carries its feeling, not just a synonym.\n\nHARD RULES: no tired startup tells (no -ly / -ify / -io / -ai / -able / -ster / -hub / -fy endings, no dropped trailing vowel, Flickr style); no filler coinages built on doubled or stacked vowels (Lumora, Zeneo, Aetheria, Qoraa); ${Array.isArray(brief?.lanes) && brief.lanes.includes("compound") ? "compounds are welcome (the founder chose the Compound lane): fuse two real words into one fresh, ownable, surprising name, never a lazy category mashup like SmartPay or QuickHire" : "no two obvious words mashed together (SmartPay, QuickHire)"}; nothing unpronounceable, nothing over 3 syllables, nothing a famous company already owns; do not just return the saved word or a plain synonym of it.\n\nVary length and rhythm so no two feel like siblings. Order strongest first. Score honestly 60 to 95 with real spread (most land 70 to 85; reserve 90+ for the rare exceptional one). For each, a one-line rationale (max 14 words) that is vivid and specific to THIS brand. For each: name, type (one of [descriptive, suggestive, compound, invented, abstract, founder, acronym, evocative, geographic, playful]), rationale, score, seed.\nSCHEMA: {"names":[{"name":"","type":"","rationale":"","score":0,"seed":""}]} with exactly ${nn} items`;
    }
    case "brandbook":
      return `${SYS}\n\nBRIEF:\n${B}\n\nCHOSEN NAME: ${payload.name}\n\nTASK: Produce a concise STARTER BRAND BOOK for the brand "${payload.name}", drawn entirely from the brief. Be specific to THIS brand, warm and human, never generic or templated. Give:\n- essence: the one-line soul of the brand (a few words).\n- tagline: a short, memorable tagline.\n- story: a 2-3 sentence positioning paragraph (what it is, who it's for, why it matters).\n- whyName: one sentence on why "${payload.name}" fits this brand.\n- voice: { adjectives: 4 single tone words; dos: 3 short "do" guidelines for how the brand writes; donts: 3 short "don'ts"; sample: one example sentence written in the brand's actual voice }.\n- palette: exactly 5 colours that fit the brand's feeling, each { hex (#RRGGBB), name (evocative), role (one of Ink, Primary, Accent, Surface, Highlight) }. Tasteful, harmonious, usable.\n- fontKey: pick the single best-fitting typography pairing from exactly these options: editorial, modern, classic, friendly, warm.\n- fontNote: one short sentence on why that pairing fits.\n- messaging: { pitch: a one-sentence elevator pitch; boilerplate: a 2-sentence company boilerplate; taglines: 3 alternative taglines; valueProps: 3 short value propositions }.\nSCHEMA: {"essence":"","tagline":"","story":"","whyName":"","voice":{"adjectives":["","","",""],"dos":["","",""],"donts":["","",""],"sample":""},"palette":[{"hex":"#","name":"","role":""}],"fontKey":"editorial","fontNote":"","messaging":{"pitch":"","boilerplate":"","taglines":["","",""],"valueProps":["","",""]}}`;
    case "suggest":
      return `${SYS}\n\nBRIEF SO FAR:\n${B}\n\nTASK: The founder is filling the "${payload.field}" field of their brief. Suggest exactly 3 short, punchy options they could pick (each a few words, specific to THIS brand, not generic).\nSCHEMA: {"suggestions":["","",""]}`;
    case "interview":
      return `${SYS}\n\nYou are a warm, sharp brand-naming consultant running a quick SPOKEN intake — like a friendly studio call. Ask ONE short, natural question at a time (one sentence, conversational, no lists) to uncover, across the whole chat: what the company does, its industry, the problem it solves, the target audience, what they value, the unique value proposition, what the name should signal and avoid, the brand tone, and which naming lanes fit.\n\nCONVERSATION SO FAR (you are "assistant", the founder is "user"):\n${JSON.stringify(payload.messages)}\n\nProduce ONLY the next assistant turn as JSON. Rules:\n- If you still need more, set done=false and put your next spoken question in "say" (warm, brief, builds on their last answer). Omit "brief".\n- Once you have enough (typically after the founder has answered ~5-7 questions), set done=true, put a short friendly closing in "say" (e.g. "Perfect — I've got a clear picture. Let me find some names."), and fill "brief" with your best synthesis, inferring sensible values from the conversation.\n- lanes must be chosen from [descriptive, suggestive, compound, invented, abstract, founder, acronym, evocative, geographic, playful].\nSCHEMA: {"say":"","done":false,"brief":{"does":"","industry":"","problem":"","audience":"","values":"","uvp":"","signal":[],"avoid":[],"tone":[],"lanes":[]}}`;
    case "compare":
      return `${SYS}\n\nBRIEF:\n${B}\n\nSHORTLIST TO COMPARE:\n${JSON.stringify(payload.names)}\n\nTASK: Build a decision comparison for these names. For EACH name: score 1-5 on intuitive, visual, sound, emotional and give total (sum, out of 20). tagline = a short BRAND tagline (3 to 6 words) for the COMPANY if it were named this, capturing what it does or how it feels for the brief, NOT a description of the word itself (e.g. for a calm finance app: "Money, finally at peace"). domains = a best-GUESS availability read on 3 TLDs, .com ALWAYS FIRST, then .io and .ai (available is your honest estimate true/false; these are guesses, not live lookups). inpi = your best estimate (true if it looks clear to register as a French/EU trademark, false if there's a plausible earlier mark) and inpiNote = one short sentence explaining (mention it's an estimate). instagram = your best estimate of whether the @handle (the name, lowercased, no spaces) is likely free on Instagram. verdict = one short, human sentence. Finally choose the single best "recommended" name and write "why" as one warm, human, first-person paragraph from the studio (not AI-sounding). Also pick "niceClasses": the 1 to 3 Nice classification numbers (1 to 45) this brand would register in based on what it does (e.g. software/SaaS -> 9 and 42; apparel -> 25; cosmetics -> 3; food -> 29 or 30; agency/consulting -> 35; media -> 41).\nSCHEMA: {"rows":[{"name":"","intuitive":0,"visual":0,"sound":0,"emotional":0,"total":0,"tagline":"","domains":[{"tld":".com","available":true},{"tld":".io","available":true},{"tld":".ai","available":true}],"inpi":true,"inpiNote":"","instagram":true,"verdict":""}],"recommended":"","why":"","niceClasses":[9,42]}`;
    default:
      throw new Error("Unknown phase: " + phase);
  }
}
