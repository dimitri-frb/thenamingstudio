import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { spawn } from "node:child_process";

// On GitHub Pages the app is served from https://<user>.github.io/brandr/,
// so production assets need the "/brandr/" base. Dev stays at "/".
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/brandr/" : "/",
  plugins: [react(), tailwindcss(), claudeBridge()],
}));

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
  "You think in stories and brand strategy, not keyword soup. Copy is crisp, warm and human — never buzzwordy, never robotic. " +
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
      return `${SYS}\n\nBRIEF:\n${B}\n\nTASK: Propose exactly 10 distinct CONCEPT TERRITORIES to mine for this brand name — creative directions or metaphors, each telling a small story (e.g. "Craft & forge", "The blank page", "Flow & momentum"). They must fit the brief, tone and chosen lanes. For each give: a short title (1-3 words), a one-sentence blurb explaining the angle/story, and the single best-fit lane from [descriptive, suggestive, compound, invented, abstract, founder, acronym, evocative, geographic, playful].\nSCHEMA: {"concepts":[{"title":"","blurb":"","lane":""}]}`;
    case "words":
      return `${SYS}\n\nBRIEF:\n${B}\n\nCHOSEN TERRITORIES:\n${JSON.stringify(payload.concepts)}\n\nTASK: Mine these territories for exactly 24 evocative WORDS that could seed a brand name — real words, roots, metaphors, foreign-language gems, phonetic plays. Spread them across the chosen territories. For each: the word, and which territory title it came from.\nSCHEMA: {"words":[{"word":"","territory":""}]}`;
    case "explore":
      return `${SYS}\n\nBRIEF:\n${B}\n\nDIRECTION TO EXPLORE:\n${JSON.stringify(payload.concept)}\n\nTASK: Turn this one direction into a "world" the founder will feel out through a few quick questions. Keep it simple and inspiring — talk to their gut. Give:\n- blurb: one clear, plain sentence on what this direction is (no jargon).\n- feelings: exactly 5 single feeling words this world could evoke (e.g. warm, bold, calm) — varied, on-brief.\n- quotes: exactly 4 short manifesto-style lines in the brand's VOICE — how it would actually talk (evocative, NOT generic marketing).\n- brands: exactly 5 real, well-known brands that already live in this world; for each give name + a 4-8 word "why" describing the shared vibe (do NOT use the founder's own company).\nSCHEMA: {"title":"","blurb":"","feelings":["","","","",""],"quotes":["","","",""],"brands":[{"name":"","why":""}]}`;
    case "names":
      return `${SYS}\n\nBRIEF:\n${B}\n\nTHE BRAND SO FAR (the founder's answers while exploring — treat this as their taste/soul):\n${JSON.stringify(payload.sketch)}\n\nTASK: Generate exactly 12 candidate BRAND NAMES that feel like they belong to THIS brand sketch — drawn from the chosen directions, the feelings, the manifesto quotes (voice) and the reference brands (vibe). Use a mix of the chosen lanes. Avoid names obviously owned by famous companies; prefer ownable, brandable options. For each: name, type (one of [descriptive, suggestive, compound, invented, abstract, founder, acronym, evocative, geographic, playful]), a one-line human rationale tying it back to the sketch, and a 0-100 "pulse" score for overall brand strength.\nSCHEMA: {"names":[{"name":"","type":"","rationale":"","score":0}]}`;
    case "suggest":
      return `${SYS}\n\nBRIEF SO FAR:\n${B}\n\nTASK: The founder is filling the "${payload.field}" field of their brief. Suggest exactly 3 short, punchy options they could pick (each a few words, specific to THIS brand, not generic).\nSCHEMA: {"suggestions":["","",""]}`;
    case "interview":
      return `${SYS}\n\nYou are a warm, sharp brand-naming consultant running a quick SPOKEN intake — like a friendly studio call. Ask ONE short, natural question at a time (one sentence, conversational, no lists) to uncover, across the whole chat: what the company does, its industry, the problem it solves, the target audience, what they value, the unique value proposition, what the name should signal and avoid, the brand tone, and which naming lanes fit.\n\nCONVERSATION SO FAR (you are "assistant", the founder is "user"):\n${JSON.stringify(payload.messages)}\n\nProduce ONLY the next assistant turn as JSON. Rules:\n- If you still need more, set done=false and put your next spoken question in "say" (warm, brief, builds on their last answer). Omit "brief".\n- Once you have enough (typically after the founder has answered ~5-7 questions), set done=true, put a short friendly closing in "say" (e.g. "Perfect — I've got a clear picture. Let me find some names."), and fill "brief" with your best synthesis, inferring sensible values from the conversation.\n- lanes must be chosen from [descriptive, suggestive, compound, invented, abstract, founder, acronym, evocative, geographic, playful].\nSCHEMA: {"say":"","done":false,"brief":{"does":"","industry":"","problem":"","audience":"","values":"","uvp":"","signal":[],"avoid":[],"tone":[],"lanes":[]}}`;
    case "compare":
      return `${SYS}\n\nBRIEF:\n${B}\n\nSHORTLIST TO COMPARE:\n${JSON.stringify(payload.names)}\n\nTASK: Build a decision comparison for these names. For EACH name score 1-5 on intuitive, visual, sound, emotional and give total (sum, out of 20). Then: negatives = a short cross-language check for awkward/negative meanings across English, French, Spanish, German (write "clean" if none); domain = a realistic best-GUESS note on the .com (clearly a guess, e.g. ".com likely taken — try .io/get-"); trademark = a short risk note (flag any known clashes); verdict = one short, human sentence. Finally choose the single best "recommended" name and write "why" as one warm, human, first-person paragraph from the studio (not AI-sounding).\nSCHEMA: {"rows":[{"name":"","intuitive":0,"visual":0,"sound":0,"emotional":0,"total":0,"negatives":"","domain":"","trademark":"","verdict":""}],"recommended":"","why":""}`;
    default:
      throw new Error("Unknown phase: " + phase);
  }
}
