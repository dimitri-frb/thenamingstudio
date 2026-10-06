// The studio's taste: 30 great brand names, each categorized by our criteria
// (style, sector) with why it earns its place. This is the database the founder
// asked for: it feeds the swipe deck (02·b) and — mirrored in the worker — the
// naming prompt's quality bar. Add to it freely; keep the "why" to one line.

export interface InspireBrand {
  name: string;
  style: "real word" | "invented" | "compound" | "classical" | "foreign" | "place" | "person" | "myth";
  sector: string;
  why: string;
}

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
];

// The swipe deck (02·b): 10 brands, every card a genuinely different naming
// style, so each swipe teaches the studio something distinct.
//   Stripe   - a real, concrete word        Kodak        - pure invented sound
//   Klarna   - invented from a meaning root Allbirds     - a plain-word compound
//   Xerox    - a classical (Greek) root     Nike         - a myth
//   Patagonia - a place                     Warby Parker - an invented person
//   Uber     - a borrowed foreign word      Google       - a playful misspelling
export const SWIPE_DECK: InspireBrand[] = [
  "Stripe", "Kodak", "Klarna", "Allbirds", "Xerox",
  "Nike", "Patagonia", "Warby Parker", "Uber", "Google",
].map((n) => INSPIRE.find((b) => b.name === n)!);
