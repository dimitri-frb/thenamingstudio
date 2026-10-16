// The studio's taste: 30 great brand names, each categorized by our criteria
// (style, sector) with why it earns its place. This is the database the founder
// asked for: it feeds the swipe deck (02·b) and — mirrored in the worker — the
// naming prompt's quality bar. Add to it freely; keep the "why" to one line.

export interface InspireBrand {
  name: string;
  style: "real word" | "invented" | "compound" | "classical" | "foreign" | "place" | "person" | "myth" | "initials";
  sector: string;
  why: string;
}

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
];

// The swipe deck (02·b): 10 brands, every card a genuinely different naming
// move — tilted toward the modern and the daring, so a swipe says something
// about taste, not about brand recognition.
//   Stripe       - a concrete real word     Notion     - an abstract real word
//   Liquid Death - two words at war         Figma      - a soft coinage
//   Perplexity   - an intellectual word     Anduril    - literary myth
//   Oatly        - an ingredient with wink  Mistral    - a named force of nature
//   Teenage Engineering - a two-word character   Patagonia - a place as worldview
export const SWIPE_DECK: InspireBrand[] = [
  "Stripe", "Notion", "Liquid Death", "Figma", "Perplexity",
  "Anduril", "Oatly", "Mistral", "Teenage Engineering", "Patagonia",
].map((n) => INSPIRE.find((b) => b.name === n)!);
