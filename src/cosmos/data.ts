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
// Markets the name should work in (pronounceable, no awkward meaning). Optional.
// Kept broad on purpose (regions, not single countries) per user testing.
export const GEO_OPTIONS = ["EU", "US", "UK", "France", "Spain", "Global"];
export const AVOID_FALLBACK = ["Generic name generators", "Tech-bro acronyms", "Cutesy compounds"];

// Domain extensions shown in the comparison. Only .com/.io/.ai are checked for
// real (RDAP, via the worker); they map to the live availability verdicts.
export const TLDS = [".com", ".app", ".io"] as const;

// The 45 Nice classification categories (short English labels), used to show what
// each trademark class number means on hover in the INPI column.
export const NICE_CLASSES: Record<number, string> = {
  1: "Chemicals", 2: "Paints & coatings", 3: "Cosmetics & cleaning", 4: "Fuels & lubricants",
  5: "Pharmaceuticals", 6: "Common metals & hardware", 7: "Machines & machine tools", 8: "Hand tools",
  9: "Software, electronics & devices", 10: "Medical apparatus", 11: "Lighting, heating & appliances",
  12: "Vehicles", 13: "Firearms & fireworks", 14: "Jewellery & watches", 15: "Musical instruments",
  16: "Paper, stationery & print", 17: "Rubber & plastics", 18: "Leather goods & luggage",
  19: "Non-metal building materials", 20: "Furniture", 21: "Household & kitchen utensils",
  22: "Ropes, nets & raw textiles", 23: "Yarns & threads", 24: "Textiles & fabrics",
  25: "Clothing, footwear & headwear", 26: "Haberdashery & trimmings", 27: "Carpets & floor coverings",
  28: "Games, toys & sporting goods", 29: "Meat, dairy & processed foods", 30: "Coffee, bakery & staples",
  31: "Agriculture & fresh produce", 32: "Beers & soft drinks", 33: "Alcoholic beverages (not beer)",
  34: "Tobacco & smokers' articles", 35: "Advertising, business & retail", 36: "Finance, insurance & real estate",
  37: "Construction & repair", 38: "Telecommunications", 39: "Transport & logistics",
  40: "Treatment of materials", 41: "Education & entertainment", 42: "Software & tech/science services",
  43: "Food services & accommodation", 44: "Medical, beauty & agriculture services", 45: "Legal & security services",
};
export const niceName = (n: number): string => NICE_CLASSES[n] || `Class ${n}`;

// Rough first-year + renewal price estimates per extension, for the price column.
export const TLD_PRICE: Record<string, [string, string]> = {
  ".com": ["$12", "$14/yr"],
  ".io":  ["$38", "$46/yr"],
  ".ai":  ["$70", "$110/yr"],
  ".app": ["$14", "$18/yr"],
};

// Domains we can show as available. ONLY ever surfaces domains that were actually
// verified free (the worker's RDAP `suggested`, or verified-available TLDs of the
// exact name). We never fabricate "getX/joinX" guesses, that would mark taken
// domains as available (e.g. getatlas.com) and break the founder's trust.
export interface DomOption { domain: string; price: string; renewal: string; premium?: boolean }
export function availableDomains(name: string, domains?: { tld: string; available: boolean }[], suggested?: DomOption[]): DomOption[] {
  if (suggested?.length) return suggested.slice(0, 3);
  const slug = slugify(name);
  const out: DomOption[] = [];
  (domains || []).filter((d) => d.available).forEach((d) => {
    const p = TLD_PRICE[d.tld] || ["$12", "$14/yr"];
    out.push({ domain: `${slug}${d.tld}`, price: p[0], renewal: p[1] });
  });
  return out.slice(0, 3);
}

// Up to three Instagram handle options, derived from the available domains so the
// handle matches the domain (e.g. getembra.com -> @getembra), then filled with the
// same name tweaks. Instagram has no reliable availability check, so these are
// candidates to verify, not verdicts.
export function handleOptions(name: string, domains: DomOption[]): string[] {
  const slug = slugify(name);
  const out: string[] = [];
  domains.forEach((d) => { const label = d.domain.split(".")[0]; if (label && !out.includes(label)) out.push(label); });
  for (const v of [slug, `${slug}hq`, `get${slug}`, `${slug}app`, `join${slug}`]) {
    if (out.length >= 3) break;
    if (!out.includes(v)) out.push(v);
  }
  return out.slice(0, 3).map((h) => "@" + h);
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Whether the exact "name.com" is registered. RDAP can only tell us registered vs
// free, NOT whether the owner is reselling it. So a "registered" .com may still be
// buyable on the aftermarket (sometimes premium, hundreds to thousands). We label
// that honestly and send the founder to GoDaddy to see the real price.
// Returns: true = registered, false = free, undefined = not checked yet.
export function comTaken(domains?: { tld: string; available: boolean }[]): boolean | undefined {
  const com = (domains || []).find((d) => d.tld === ".com");
  return com ? !com.available : undefined;
}

export function godaddyUrl(domain: string): string {
  return `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(domain)}`;
}

// The classic quick naming "tests", computed simply from the name itself so they
// render instantly everywhere. Conservative: a cross only shows for a clear miss.
export interface NameTests { bar: boolean; pronounce: boolean; spell: boolean; short: boolean }
export function nameTests(name: string): NameTests {
  const s = name.toLowerCase().replace(/[^a-z]/g, "");
  const vowels = (s.match(/[aeiouy]/g) || []).length;
  const consRuns = s.split(/[aeiouy]+/).filter(Boolean).map((r) => r.length);
  const maxCons = consRuns.length ? Math.max(...consRuns) : 0;
  // Pronounce: has a vowel and no monstrous consonant cluster.
  const pronounce = vowels >= 1 && maxCons <= 4;
  // Spell: no ambiguous patterns (q-not-qu, ends in q/x/v/z, triple letter, 5+
  // consonant run, or tricky digraphs) — i.e. you'd write it right from hearing it.
  const ambiguous = /q(?!u)/.test(s) || /[qxvz]$/.test(s) || /(.)\1\1/.test(s) || /[^aeiouy]{5,}/.test(s) || /ph|yx|tz/.test(s);
  const spell = !ambiguous && s.length > 0;
  // Short: snappy enough to remember and type.
  const short = s.length <= 8;
  // Bar test: say it across a loud bar and a friend writes the right thing back.
  const bar = pronounce && spell;
  return { bar, pronounce, spell, short };
}

// Autocomplete suggestions for the Industry field (free text, datalist-backed).
export const INDUSTRIES = [
  "B2B SaaS", "Consumer app", "Fintech", "Healthtech", "E-commerce", "Marketplace",
  "Creator tools", "Developer tools", "AI / ML", "EdTech", "Productivity", "Hardware",
  "Agency / Studio", "Food & beverage", "Fashion & apparel", "Real estate / Proptech",
  "Gaming", "Climate / Energy", "Travel & hospitality", "Media & entertainment",
];

// Options for the Stage dropdown. Plain-spoken, less "startuppy" per user testing.
export const STAGES = [
  "Just an idea", "Building it", "In early testing", "Just launched",
  "First customers", "Growing", "Established",
];
