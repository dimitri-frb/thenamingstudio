// The studio's taste: 30 great brand names, each categorized by our criteria
// (style, sector) with why it earns its place. This is the database the founder
// asked for: it feeds the swipe deck (02·b) and — mirrored in the worker — the
// naming prompt's quality bar. Add to it freely; keep the "why" to one line.

export interface InspireBrand {
  name: string;
  style: "real word" | "invented" | "compound" | "classical" | "foreign" | "place" | "person" | "myth" | "initials";
  sector: string;
  why: string;
  domain?: string; // the brand's site, for its logo on the swipe card
  vibe?: string;   // two adjectives for the card's descriptor line
}

// "A place · evocative, rugged" — the card's one-breath descriptor.
export const styleArticle = (s: InspireBrand["style"]): string =>
  s === "real word" ? "A real word" : s === "invented" ? "An invented word" : s === "compound" ? "A compound" :
  s === "classical" ? "A classical root" : s === "foreign" ? "A foreign word" : s === "place" ? "A place" :
  s === "person" ? "A person" : s === "myth" ? "A myth" : "Initials";

// A brand's logo, by domain (Google's favicon service: no key, no asset
// redistribution on our side, and a graceful 404 when a logo is missing).
export const brandLogo = (domain?: string, size = 128): string =>
  domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}` : "";

/* How each swipe-deck brand scores on the four taste axes (0-1), used by the
   02-b-s summary to read a founder's taste from their likes. Old deck members
   stay listed so historical runs keep reading correctly. */
export const BRAND_AXES: Record<string, { short: number; evoc: number; warm: number; real: number }> = {
  Stripe:  { short: 1.0, evoc: 0.8, warm: 0.4, real: 1.0 },
  Apple:   { short: 1.0, evoc: 0.9, warm: 0.8, real: 1.0 },
  Kodak:   { short: 1.0, evoc: 0.5, warm: 0.3, real: 0.0 },
  Google:  { short: 0.8, evoc: 0.6, warm: 0.6, real: 0.2 },
  Nike:    { short: 1.0, evoc: 1.0, warm: 0.5, real: 0.4 },
  Amazon:  { short: 0.6, evoc: 1.0, warm: 0.5, real: 1.0 },
  Lego:    { short: 1.0, evoc: 0.6, warm: 0.7, real: 0.2 },
  LVMH:    { short: 0.4, evoc: 0.1, warm: 0.1, real: 0.0 },
  Tesla:   { short: 0.8, evoc: 0.8, warm: 0.4, real: 0.4 },
  Airbnb:  { short: 0.5, evoc: 0.5, warm: 0.6, real: 0.2 },
  Notion:  { short: 0.8, evoc: 0.6, warm: 0.5, real: 1.0 },
  "Liquid Death": { short: 0.2, evoc: 1.0, warm: 0.1, real: 1.0 },
  Figma:   { short: 0.9, evoc: 0.4, warm: 0.6, real: 0.1 },
  Perplexity: { short: 0.3, evoc: 0.8, warm: 0.4, real: 1.0 },
  Anduril: { short: 0.6, evoc: 0.9, warm: 0.2, real: 0.1 },
  Oatly:   { short: 0.9, evoc: 0.5, warm: 0.9, real: 0.3 },
  Mistral: { short: 0.8, evoc: 0.9, warm: 0.5, real: 0.8 },
  "Teenage Engineering": { short: 0.0, evoc: 0.7, warm: 0.7, real: 1.0 },
  Patagonia: { short: 0.3, evoc: 0.9, warm: 0.6, real: 0.8 },
  Slack:   { short: 1.0, evoc: 0.6, warm: 0.5, real: 1.0 },
  Arc:     { short: 1.0, evoc: 0.7, warm: 0.4, real: 1.0 },
  Calm:    { short: 1.0, evoc: 0.7, warm: 1.0, real: 1.0 },
  Superhuman: { short: 0.2, evoc: 0.8, warm: 0.4, real: 1.0 },
  Nothing: { short: 0.7, evoc: 0.8, warm: 0.3, real: 1.0 },
  Toast:   { short: 1.0, evoc: 0.6, warm: 0.9, real: 1.0 },
  Innocent: { short: 0.6, evoc: 0.6, warm: 0.9, real: 1.0 },
  Allbirds: { short: 0.6, evoc: 0.6, warm: 0.8, real: 0.8 },
  "Back Market": { short: 0.4, evoc: 0.7, warm: 0.4, real: 1.0 },
  Headspace: { short: 0.5, evoc: 0.7, warm: 0.8, real: 1.0 },
  Monzo:   { short: 0.9, evoc: 0.3, warm: 0.6, real: 0.1 },
  "Häagen-Dazs": { short: 0.3, evoc: 0.5, warm: 0.5, real: 0.0 },
  Glossier: { short: 0.6, evoc: 0.6, warm: 0.7, real: 0.3 },
  Klarna:  { short: 0.8, evoc: 0.4, warm: 0.5, real: 0.2 },
  Asana:   { short: 0.8, evoc: 0.7, warm: 0.8, real: 0.8 },
  Muji:    { short: 1.0, evoc: 0.6, warm: 0.7, real: 0.4 },
  Starbucks: { short: 0.5, evoc: 0.7, warm: 0.6, real: 0.6 },
  Runway:  { short: 0.7, evoc: 0.9, warm: 0.5, real: 1.0 },
  "Red Bull": { short: 0.7, evoc: 0.9, warm: 0.3, real: 1.0 },
};

export const INSPIRE: InspireBrand[] = [
  { name: "Apple", style: "real word", sector: "Tech", why: "An everyday word made iconic by total contrast with its category." },
  { name: "Stripe", style: "real word", sector: "Payments", why: "Concrete and visual, one syllable; speed and simplicity without saying payments." },
  { name: "Slack", style: "real word", sector: "Software", why: "A negative word reclaimed: workplace looseness turned into a virtue." },
  { name: "Calm", style: "real word", sector: "Wellness", why: "The product's promise is the name itself. Nothing to explain." },
  { name: "Toast", style: "real word", sector: "Restaurant tech", why: "Warm and human, lifted straight from the industry's own vocabulary." },
  { name: "Square", style: "real word", sector: "Payments", why: "Geometry as fairness (fair and square), plus the hardware's literal shape." },
  { name: "Arc", style: "real word", sector: "Browsers", why: "Three letters that imply trajectory and curve: motion in a static word." },
  { name: "Notion", style: "real word", sector: "Productivity", why: "An abstract noun that frames the product as thought itself." },
  { name: "Linear", style: "real word", sector: "Dev tools", why: "An adjective as a promise: order, direction, no mess." },
  { name: "Amazon", style: "place", sector: "Commerce", why: "The world's biggest river for the world's biggest store: scale by metaphor." },
  { name: "Patagonia", style: "place", sector: "Outdoor", why: "Borrowed wilderness: the place carries the brand's values for it." },
  { name: "Kodak", style: "invented", sector: "Imaging", why: "Invented for sound alone: hard Ks chosen to be sharp, short, unownable by any language." },
  { name: "Google", style: "invented", sector: "Search", why: "A misspelled mathematical giant (googol): playful erudition at scale." },
  { name: "Figma", style: "invented", sector: "Design", why: "Soft coinage hinting at figure: friendly, ownable, two syllables." },
  { name: "Vercel", style: "invented", sector: "Dev tools", why: "Latin-flavoured blend (versus, excel) that sounds fast and precise." },
  { name: "Monzo", style: "invented", sector: "Banking", why: "Bouncy and sayable in any language, with zero banking baggage." },
  { name: "Klarna", style: "invented", sector: "Fintech", why: "From Swedish klar, clear: the promise of clarity hidden in the sound." },
  { name: "Rivian", style: "invented", sector: "EVs", why: "River folded into an automotive suffix: nature inside a machine name." },
  { name: "Canva", style: "invented", sector: "Design", why: "Canvas minus a letter: the tool implied, the word ownable." },
  { name: "Xerox", style: "classical", sector: "Imaging", why: "Greek xeros, dry: lab science turned into a verb the world uses." },
  { name: "Volvo", style: "classical", sector: "Automotive", why: "Latin for I roll: the product's motion, spoken in first person." },
  { name: "Nike", style: "myth", sector: "Sportswear", why: "The goddess of victory: two sounds carrying an infinite story." },
  { name: "Oracle", style: "myth", sector: "Enterprise", why: "Ancient authority applied to data: an audacious, confident metaphor." },
  { name: "Lego", style: "foreign", sector: "Toys", why: "Danish leg godt, play well: the company's values hidden in plain sight." },
  { name: "Uber", style: "foreign", sector: "Mobility", why: "German for above: one borrowed word, total ambition." },
  { name: "Allbirds", style: "compound", sector: "Footwear", why: "Plain words joined into a story: New Zealand, all birds, no predators." },
  { name: "Airbnb", style: "compound", sector: "Travel", why: "Air mattress and B&B compressed into a rhythm you can't forget." },
  { name: "Headspace", style: "compound", sector: "Wellness", why: "Two plain words that name the product's exact territory." },
  { name: "Mailchimp", style: "compound", sector: "Marketing", why: "Serious utility plus a mascot's mischief: personality as strategy." },
  { name: "Warby Parker", style: "person", sector: "Eyewear", why: "Two invented literary characters from Kerouac's journals: fiction as heritage." },
  { name: "Tesla", style: "person", sector: "EVs", why: "The overlooked inventor as patron saint: engineering romance." },
  { name: "LVMH", style: "initials", sector: "Luxury", why: "Three houses folded into four letters: a monogram worn like a crest." },
  { name: "Liquid Death", style: "compound", sector: "Water", why: "Two ordinary words at war with each other: water sold with a metal band's swagger." },
  { name: "Perplexity", style: "real word", sector: "AI", why: "Uncertainty itself claimed as a name: curiosity turned into intellectual authority." },
  { name: "Anduril", style: "myth", sector: "Defense", why: "Tolkien's reforged blade: literary myth lending force, lineage and a story." },
  { name: "Oatly", style: "compound", sector: "Food", why: "The ingredient wearing a wink: personality where the category sells purity." },
  { name: "Mistral", style: "foreign", sector: "AI", why: "A named wind from the south of France: speed, force and geography in two syllables." },
  { name: "Teenage Engineering", style: "compound", sector: "Audio hardware", why: "Two familiar words whose collision creates mischief, subculture and total ownability." },
  { name: "Superhuman", style: "real word", sector: "Email", why: "The customer's transformation as the name: an aspiration, not a feature." },
  { name: "Nothing", style: "real word", sector: "Phones", why: "A counterintuitive ordinary word with enormous tonal confidence." },
  { name: "Innocent", style: "real word", sector: "Drinks", why: "A virtue word with a wink: purity claimed with a smile, not a lab coat." },
  { name: "Back Market", style: "compound", sector: "Refurbished tech", why: "The grey market renamed with a smirk: the shady made proudly official." },
  { name: "Häagen-Dazs", style: "invented", sector: "Ice cream", why: "Completely fake Danish: invented foreignness as premium theatre." },
  { name: "Glossier", style: "invented", sector: "Beauty", why: "Gloss bent through French: an accent as the whole brand attitude." },
  { name: "Asana", style: "foreign", sector: "Productivity", why: "Sanskrit for a steady posture: calm imported whole from yoga." },
  { name: "Muji", style: "foreign", sector: "Retail", why: "No-brand quality goods, compressed: anti-branding worn as a brand." },
  { name: "Starbucks", style: "person", sector: "Coffee", why: "Moby-Dick's first mate: literature hiding in a coffee cup." },
  { name: "Runway", style: "real word", sector: "AI video", why: "A place where things take off: preparation, speed and show in one picture." },
  { name: "Red Bull", style: "compound", sector: "Energy drinks", why: "Two blunt words fused into pure energy imagery: an animal as a promise." },
];

// The swipe pool (02·b): 30 brands spanning every naming move, tilted toward
// the modern and the daring. Each run DRAWS 8 — returning founders see fresh
// cards, and every round teaches the taste axes something new.
const POOL_DOMAINS: Record<string, string> = {
  Stripe: "stripe.com", Notion: "notion.so", Slack: "slack.com", Arc: "arc.net", Calm: "calm.com",
  Superhuman: "superhuman.com", Perplexity: "perplexity.ai", Nothing: "nothing.tech", Runway: "runwayml.com",
  Innocent: "innocentdrinks.co.uk", "Liquid Death": "liquiddeath.com", Oatly: "oatly.com",
  "Red Bull": "redbull.com", Airbnb: "airbnb.com", Allbirds: "allbirds.com",
  "Back Market": "backmarket.com", Headspace: "headspace.com", Figma: "figma.com", Google: "google.com",
  Monzo: "monzo.com", "Häagen-Dazs": "haagen-dazs.com", Glossier: "glossier.com", Klarna: "klarna.com",
  Mistral: "mistral.ai", Lego: "lego.com", Asana: "asana.com", Muji: "muji.com",
  Anduril: "anduril.com", Patagonia: "patagonia.com", Starbucks: "starbucks.com",
};
const POOL_VIBES: Record<string, string> = {
  Stripe: "minimal, grounded", Notion: "intellectual, quiet", Slack: "subversive, witty", Arc: "minimal, geometric",
  Calm: "serene, direct", Superhuman: "aspirational, bold", Perplexity: "curious, authoritative", Nothing: "deadpan, confident",
  Runway: "dynamic, cinematic", Innocent: "warm, playful", "Liquid Death": "provocative, unforgettable", Oatly: "friendly, irreverent",
  "Red Bull": "primal, direct", Airbnb: "modern, practical", Allbirds: "warm, storytelling", "Back Market": "cheeky, confident",
  Headspace: "calm, poetic", Figma: "friendly, modern", Google: "witty, approachable", Monzo: "playful, international",
  "Häagen-Dazs": "theatrical, premium", Glossier: "chic, modern", Klarna: "clear, nordic", Mistral: "fast, forceful",
  Lego: "warm, principled", Asana: "calm, steady", Muji: "restrained, principled", Anduril: "forceful, storied",
  Patagonia: "evocative, rugged", Starbucks: "narrative, familiar",
};
export const SWIPE_POOL: InspireBrand[] = [
  // ordinary words claimed whole
  "Stripe", "Notion", "Slack", "Arc", "Calm", "Superhuman", "Perplexity", "Nothing", "Runway", "Innocent",
  // two words with attitude
  "Liquid Death", "Oatly", "Red Bull", "Airbnb", "Allbirds", "Back Market", "Headspace",
  // coinages with a shape
  "Figma", "Google", "Monzo", "Häagen-Dazs", "Glossier", "Klarna",
  // borrowed worlds
  "Mistral", "Lego", "Asana", "Muji",
  // myth, story, place
  "Anduril", "Patagonia", "Starbucks",
].map((n) => ({ ...INSPIRE.find((b) => b.name === n)!, domain: POOL_DOMAINS[n], vibe: POOL_VIBES[n] }));

export const DECK_SIZE = 8;
// A fresh hand: shuffled, but never more than two cards of the same style,
// so every round still spans genuinely different naming moves.
export function drawDeck(n: number = DECK_SIZE): InspireBrand[] {
  const pool = [...SWIPE_POOL].sort(() => Math.random() - 0.5);
  const perStyle: Record<string, number> = {};
  const out: InspireBrand[] = [];
  for (const b of pool) {
    if (out.length >= n) break;
    if ((perStyle[b.style] || 0) >= 2) continue;
    perStyle[b.style] = (perStyle[b.style] || 0) + 1;
    out.push(b);
  }
  for (const b of pool) { if (out.length >= n) break; if (!out.includes(b)) out.push(b); }
  return out;
}
