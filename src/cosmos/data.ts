// Shared Cosmos-flow data: the relation taxonomy (Exploration), the naming lanes,
// the emotional-register option lists, and a small domain price estimate table.

export interface Relation { id: RelId; label: string; sub: string; glyph: string; on: boolean; weak?: boolean }
export type RelId = "related" | "metaphor" | "translation" | "root" | "mythic" | "coin";

export const RELATIONS: Relation[] = [
  { id: "related",     label: "Related",       sub: "lexical field",          glyph: "≈", on: true },
  { id: "metaphor",    label: "Metaphor",      sub: "& symbol",               glyph: "✶", on: true },
  { id: "translation", label: "Translation",   sub: "other tongues",          glyph: "⇄", on: true },
  { id: "root",        label: "Root",          sub: "& etymology",            glyph: "⌂", on: true },
  { id: "mythic",      label: "Famous",        sub: "& mythic",               glyph: "☆", on: true, weak: true },
  { id: "coin",        label: "Invent a form", sub: "blend · respell · clip", glyph: "✿", on: false },
];
export const REL: Record<string, Relation> = Object.fromEntries(RELATIONS.map((r) => [r.id, r]));

// The nine naming lanes (step 4), with examples + a one-line trade-off.
export interface Lane { key: string; name: string; ex: string; d: string }
export const LANES: Lane[] = [
  { key: "descriptive", name: "Descriptive", ex: "PayPal, General Motors", d: "Says what it is. Strong SEO, weak distinction." },
  { key: "suggestive",  name: "Suggestive",  ex: "Salesforce, Buffer",     d: "Hints at the benefit. Best of both worlds." },
  { key: "evocative",   name: "Evocative",   ex: "Amazon, Nike",           d: "Borrowed metaphor. Strong identity, needs marketing." },
  { key: "invented",    name: "Invented",    ex: "Kodak, Verso",           d: "Pure coinage. Max distinctiveness, zero meaning." },
  { key: "compound",    name: "Compound",    ex: "Facebook, YouTube",      d: "Two real words fused. Easy to grasp, can cliche." },
  { key: "acronym",     name: "Acronym",     ex: "IBM, BMW",               d: "Initials. Corporate, hard to love." },
  { key: "geographic",  name: "Geographic",  ex: "Patagonia, Cisco",       d: "Place-anchored. Carries a story." },
  { key: "founder",     name: "Founder",     ex: "Ford, Disney",           d: "Eponymous. Personal, hard to sell later." },
  { key: "playful",     name: "Playful",     ex: "Slack, Yahoo",           d: "Real words used cheekily. Memorable, sometimes too cute." },
];

// Emotional value (step 3) option lists. The "signal" list is a fallback used
// only when the live model has not produced personalised feelings yet.
export const SIGNAL_FALLBACK = ["Velocity", "Elegance", "Joy", "Taste", "Craft", "Sharpness", "Trust", "Warmth", "Rigor", "Optimism", "Mystery", "Play"];
export const TONE_OPTIONS = ["Witty", "Confident", "Polished", "Plain-spoken", "Bold", "Editorial", "Provocative", "Warm", "Wry"];
export const AVOID_FALLBACK = ["Generic name generators", "Tech-bro acronyms", "Cutesy compounds"];

// Domain extensions shown in the comparison. Only .com/.io/.ai are checked for
// real (RDAP, via the worker); they map to the live availability verdicts.
export const TLDS = [".com", ".io", ".ai"] as const;

// Rough first-year + renewal price estimates per extension, for the price column.
export const TLD_PRICE: Record<string, [string, string]> = {
  ".com": ["$12", "$14/yr"],
  ".io":  ["$38", "$46/yr"],
  ".ai":  ["$70", "$110/yr"],
  ".app": ["$14", "$18/yr"],
};

// Client-side fallback (dev / no worker): derive up to three available domains
// from the estimated TLD availability, then fill with name tweaks (almost always
// free). The live worker replaces this with real RDAP results in `row.suggested`.
export interface DomOption { domain: string; price: string; renewal: string; premium?: boolean }
export function availableDomains(name: string, domains?: { tld: string; available: boolean }[], suggested?: DomOption[]): DomOption[] {
  if (suggested?.length) return suggested.slice(0, 3);
  const slug = slugify(name);
  const out: DomOption[] = [];
  (domains || []).filter((d) => d.available).forEach((d) => {
    const p = TLD_PRICE[d.tld] || ["$12", "$14/yr"];
    out.push({ domain: `${slug}${d.tld}`, price: p[0], renewal: p[1] });
  });
  for (const v of [`get${slug}.com`, `${slug}app.com`, `${slug}hq.com`]) {
    if (out.length >= 3) break;
    if (!out.some((o) => o.domain === v)) out.push({ domain: v, price: "$12", renewal: "$14/yr" });
  }
  return out.slice(0, 3);
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Autocomplete suggestions for the Industry field (free text, datalist-backed).
export const INDUSTRIES = [
  "B2B SaaS", "Consumer app", "Fintech", "Healthtech", "E-commerce", "Marketplace",
  "Creator tools", "Developer tools", "AI / ML", "EdTech", "Productivity", "Hardware",
  "Agency / Studio", "Food & beverage", "Fashion & apparel", "Real estate / Proptech",
  "Gaming", "Climate / Energy", "Travel & hospitality", "Media & entertainment",
];

// Options for the Stage dropdown.
export const STAGES = [
  "Just an idea", "Pre-launch · building MVP", "Private beta", "Just launched",
  "Early revenue", "Growing / scaling", "Established",
];
