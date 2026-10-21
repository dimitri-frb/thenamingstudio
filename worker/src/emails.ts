// Lifecycle emails (handoff 15): W at sign-up, one stop email ~24h after the
// founder leaves, matched to the furthest step. Sent through Cloudflare Email
// Sending (the EMAIL binding) from hello@namename.ai. S·5 and the 3-day
// reminder exist as templates but are intentionally not wired yet.
import { T } from "./emailTemplates";

export interface EmailEnv {
  EMAIL?: { send(msg: { to: string; from: string | { email: string; name?: string }; subject: string; html: string; text?: string; headers?: Record<string, string> }): Promise<{ messageId: string }> };
  LOG?: KVNamespace;
  ADS_KEY?: string;        // doubles as the unsubscribe-link signing secret
  POSTAL_ADDRESS?: string; // CAN-SPAM/CNIL footer address; footer omits it until set
}

const FROM = { email: "hello@namename.ai", name: "Name Name" };
const SITE = "https://namename.ai";
const API = "https://api.namename.ai";

const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function merge(tpl: string, data: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] ?? "");
}

// "a rooftop cinema club in Marseille" → "rooftop cinema club" (≤6 words)
export function projectPhrase(brief: string): string {
  const words = (brief || "").trim().replace(/[.!?]+$/, "").split(/\s+/);
  if (!words.length || !words[0]) return "idea";
  const skip = new Set(["a", "an", "the", "un", "une", "le", "la", "les", "my", "our"]);
  while (words.length && skip.has(words[0].toLowerCase())) words.shift();
  const cutAt = words.findIndex((w) => ["in", "for", "that", "which", "qui", "pour", "à", "dans"].includes(w.toLowerCase()));
  const kept = (cutAt > 0 ? words.slice(0, cutAt) : words).slice(0, 6);
  const out = kept.join(" ").trim();
  return out.length >= 3 ? out : "idea";
}

export async function unsubSig(email: string, secret: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.toLowerCase() + "|" + secret));
  return [...new Uint8Array(buf)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function unsubUrl(email: string, secret: string): Promise<string> {
  const u = btoa(email.toLowerCase()).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${API}/unsub?u=${u}&k=${await unsubSig(email, secret)}`;
}

function common(env: EmailEnv): Record<string, string> {
  return {
    settings_url: `${SITE}/account`,
    postal: env.POSTAL_ADDRESS ? `${esc(env.POSTAL_ADDRESS)} · ` : "",
  };
}

// A plain-text twin of the HTML: mail without one scores as spammier.
function textOf(html: string): string {
  return html
    .replace(/<head[\s\S]*?<\/head>/i, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<a\b[^>]*href="(https?:[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => `${label.replace(/<[^>]+>/g, "").trim()} (${href})`)
    .replace(/<br\s*\/?>|<\/(p|tr|h\d|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#10084;&#65039;/g, "♥").replace(/&#9733;/g, "★").replace(/&#\d+;|&[a-z]+;/g, "")
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*(\n\s*)+/g, "\n\n").trim();
}

async function deliver(env: EmailEnv, to: string, subject: string, html: string, headers?: Record<string, string>): Promise<boolean> {
  if (!env.EMAIL) return false;
  try {
    await env.EMAIL.send({ to, from: FROM, subject: (env as any).PREVIEW ? `[Preview] ${subject}` : subject, html, text: textOf(html), ...(headers ? { headers } : {}) });
    return true;
  } catch (e: any) {
    console.error("email send failed", e?.code, e?.message);
    return false;
  }
}

/* ── W · welcome, instantly at sign-up ── */
export async function sendWelcome(env: EmailEnv, to: string, name: string, brief: string): Promise<void> {
  const project = projectPhrase(brief);
  const html = merge(T.W, {
    ...common(env),
    first_name: esc((name || "").split(" ")[0] || "founder"),
    project: esc(project),
    cta_url: `${SITE}/account?utm_source=email&utm_campaign=w`,
  });
  await deliver(env, to, `Let’s find the perfect name for your ${project}`, html);
}

/* ── the stop email, one per flow, matched to the furthest step ── */
const SIZES = [16, 19, 15, 17];
function wordCloud(words: { w: string; lang?: string }[], total: number): string {
  const top = words.slice(0, 16);
  const starAt = new Set([0, 8]);
  let out = "";
  top.forEach((wd, i) => {
    const w = esc(wd.w);
    if (starAt.has(i)) out += T.S1_CHIP_ON.replace("%W%", w);
    else if (wd.lang && wd.lang.length <= 3) out += T.S1_CHIP_LANG.replace("%W%", w).replace("%L%", esc(wd.lang.toUpperCase()));
    else out += T.S1_CHIP.replace("%W%", w).replace(/font-size:\d+px/, `font-size:${SIZES[i % 4]}px`);
  });
  if (total > top.length) out += T.S1_CHIP_MORE.replace("%W%", String(total - top.length));
  return out;
}

export interface StopCandidate {
  email: string; name: string; flowId: string; brief: string;
  cloud?: { w: string; lang?: string }[];
  starred?: { w: string }[];
  names?: { name: string; tagline?: string; parts?: { part: string; note: string }[]; dom?: { domain: string; free?: boolean; price?: string } | null }[];
  picked?: { name: string; dom?: { domain: string; free?: boolean; price?: string } | null } | null;
  domain?: string; domPrice?: string; domStatus?: string;
  steps?: { domain?: string; logo?: string; book?: string };
  logo?: unknown;
}

type Stage = "S1" | "S2" | "S3" | "S4" | null;
export function stageFor(c: StopCandidate): Stage {
  const brandDone = c.steps?.book === "done" || c.steps?.logo === "done";
  const domChosen = c.domStatus === "chosen" || c.steps?.domain === "done";
  if (domChosen && c.domain) return brandDone ? null : "S4";
  if (c.picked) return "S3";
  if (c.names?.length) return "S2";
  if (!c.starred?.length) return "S1";
  return "S2"; // starred but no names generated — the names page is still the pull
}

export async function sendStop(
  env: EmailEnv,
  c: StopCandidate,
  checkFree: (domain: string) => Promise<boolean>,
): Promise<Stage> {
  const stage = stageFor(c);
  if (!stage || !env.ADS_KEY) return null;
  const resume = (go = "") => `${SITE}/?resume=${encodeURIComponent(c.flowId)}${go ? `&go=${go}` : ""}&utm_source=email&utm_campaign=${stage.toLowerCase()}`;
  const unsub = await unsubUrl(c.email, env.ADS_KEY);
  const base = { ...common(env), unsub_url: unsub, project: esc(projectPhrase(c.brief)) };
  // Gmail/Yahoo one-click unsubscribe (RFC 8058): a POST to the same signed URL
  const LU = { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };

  if (stage === "S1") {
    const words = (c.cloud && c.cloud.length ? c.cloud : (c.starred || []).map((s) => ({ w: s.w }))).filter((w) => w.w);
    if (!words.length) return null; // nothing honest to show — skip rather than fake it
    const total = Math.max(words.length, c.cloud?.length || 0);
    const html = merge(T.S1, { ...base, word_count: String(total), word_cloud: wordCloud(words, total), cta_url: resume() });
    return (await deliver(env, c.email, `${total} words are waiting for you`, html, LU)) ? "S1" : null;
  }

  if (stage === "S2") {
    const names = c.names || [];
    if (!names.length) return null;
    const top = names[0];
    const story = top.tagline || (top.parts?.[0] ? `${top.parts[0].part[0].toUpperCase()}${top.parts[0].part.slice(1)}, ${top.parts[0].note}.` : "");
    let pill = "";
    if (top.dom?.free && top.dom.domain && (await checkFree(top.dom.domain))) pill = T.S2_PILL.replace(/%D%/g, esc(top.dom.domain));
    const html = merge(T.S2, {
      ...base,
      top_name: esc(top.name), top_story: esc(story), dom_pill: pill,
      alt1: esc(names[1]?.name || ""), alt2: esc(names[2]?.name || ""),
      names_more: String(Math.max(0, names.length - 1)), alt_more: String(Math.max(0, names.length - 3)),
      cta_url: resume(),
    });
    return (await deliver(env, c.email, `${top.name} and ${Math.max(1, names.length - 1)} more names are waiting`, html, LU)) ? "S2" : null;
  }

  if (stage === "S3") {
    const dom = c.picked?.dom;
    if (!dom?.domain || !(await checkFree(dom.domain))) return null; // never a stale "available"
    const checked = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }) + " today";
    const html = merge(T.S3, {
      ...base,
      picked_name: esc(c.picked!.name), domain: esc(dom.domain),
      domain_price: esc(dom.price || c.domPrice || ""), checked_at: checked,
      cta_url: resume(),
    });
    return (await deliver(env, c.email, `Don’t lose ${dom.domain}`, html, LU)) ? "S3" : null;
  }

  // S4
  const html = merge(T.S4, { ...base, picked_name: esc(c.picked?.name || c.names?.[0]?.name || "Your name"), cta_url: resume("logo") });
  return (await deliver(env, c.email, `${c.picked?.name || "Your name"} needs a face`, html, LU)) ? "S4" : null;
}

/* ── the unsubscribe door (GET /unsub?u=&k=) ── */
export async function handleUnsub(env: EmailEnv, url: URL): Promise<Response> {
  try {
    const u = url.searchParams.get("u") || "";
    const k = url.searchParams.get("k") || "";
    const email = atob(u.replace(/-/g, "+").replace(/_/g, "/"));
    if (!env.ADS_KEY || !email.includes("@") || k !== (await unsubSig(email, env.ADS_KEY))) {
      return new Response("Invalid link.", { status: 400 });
    }
    if (env.LOG) await env.LOG.put(`optout:${email.toLowerCase()}`, String(Date.now()));
    return new Response(
      `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed</title><body style="font-family:Arial,Helvetica,sans-serif;background:#141413;color:#f2f0ea;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center"><div><p style="font-weight:900;letter-spacing:-0.04em;font-size:20px">NAME NAME</p><h1 style="font-size:26px;margin:8px 0">You’re unsubscribed.</h1><p style="color:#b4b1a8">No more reminder emails. Your names stay saved in <a href="https://namename.ai/account" style="color:#ff4f1a">your account</a>.</p></div>`,
      { headers: { "content-type": "text/html; charset=utf-8" } },
    );
  } catch {
    return new Response("Invalid link.", { status: 400 });
  }
}
