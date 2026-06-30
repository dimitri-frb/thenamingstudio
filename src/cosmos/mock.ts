// Sample data for "test mode" (?test): lets you jump to any of the 10 steps with
// a coherent, pre-filled session, so each page can be reviewed on the live site
// without running a real flow (no Claude calls).
import type { Brief, Comparison, Concept, Feeling, NameIdea, RelGroupData } from "../lib/namingApi";
import type { SavedIdea, SeedRow } from "./Shortlist";

export interface TestSeed {
  step: number;
  brief: Brief;
  stage: string;
  workingName: string;
  feelings: Feeling[];
  concepts: Concept[];
  chosen: string[];
  saved: SavedIdea[];
  exploreSeed: { focus: { word: string; def: string }; groups: RelGroupData[] };
  shortlistRows: SeedRow[];
  shortlist: string[];
  comp: Comparison;
  taglines: Record<string, string>;
  chosenFinal: string;
}

const brief: Brief = {
  does: "An AI naming studio that helps founders find a brand name with the rigor of a strategist, in minutes instead of months.",
  industry: "B2B SaaS",
  problem: "Founders spend weeks on naming and settle for something generic or compromised.",
  audience: "Startup founders and brand strategists, time-pressed and taste-conscious.",
  values: "",
  uvp: "Strategy-first naming with the rigor of a senior consultant.",
  signal: ["Clarity", "Momentum", "Craft"],
  avoid: ["Generic name generators", "Tech-bro acronyms"],
  tone: ["Confident", "Polished"],
  lanes: ["suggestive", "evocative", "invented"],
  geos: ["EU", "US"],
};

// Pre-filled "signal" feelings so the emotional step (3) shows real chips without
// a live call when walking the test flow forward.
const feelings: Feeling[] = [
  { word: "Clarity", why: "the relief of finally seeing the name clearly" },
  { word: "Momentum", why: "a brief that turns into motion, fast" },
  { word: "Craft", why: "made with the care of a senior studio" },
  { word: "Confidence", why: "a name you can stand behind in any room" },
  { word: "Warmth", why: "human and inviting, never clinical" },
  { word: "Precision", why: "every word earns its place" },
];

const concepts: Concept[] = [
  { title: "The Exhale Moment", blurb: "The relief of finally landing the right name.", lane: "evocative" },
  { title: "The Forge", blurb: "Raw material hammered into something lasting.", lane: "evocative" },
  { title: "First Light", blurb: "The hopeful clarity of a new beginning.", lane: "suggestive" },
  { title: "The Instant Curator", blurb: "A discerning eye that works at machine speed.", lane: "suggestive" },
];

const groups: RelGroupData[] = [
  { rel: "related", words: [
    { w: "daybreak", note: "the exact moment light appears" }, { w: "sunrise", note: "sun crossing the horizon" },
    { w: "aurora", note: "luminous glow before full sun" }, { w: "first light", note: "earliest visible trace of day" },
    { w: "cockcrow", note: "traditional herald of morning" } ] },
  { rel: "metaphor", words: [
    { w: "spark", note: "tiny flash that starts everything" }, { w: "bloom", note: "a flower opening for the first time" },
    { w: "inhale", note: "the breath before something begins" }, { w: "thaw", note: "ice releasing into warmth" },
    { w: "ember", note: "quiet glow holding future fire" } ] },
  { rel: "translation", words: [
    { w: "alba", note: "poetic, warm", lang: "IT" }, { w: "aube", note: "soft, elegant", lang: "FR" },
    { w: "amanecer", note: "musical, expansive", lang: "ES" }, { w: "morgenrot", note: "red glow of morning", lang: "DE" },
    { w: "fajr", note: "sacred first light", lang: "AR" } ] },
  { rel: "root", words: [
    { w: "aurora", note: "Latin: goddess of dawn" }, { w: "eos", note: "Greek: dawn" },
    { w: "dagaz", note: "Proto-Germanic rune for day" }, { w: "lucere", note: "Latin: to shine" },
    { w: "oriri", note: "Latin: to rise" } ] },
  { rel: "mythic", words: [
    { w: "Eos", note: "Greek goddess who opens the sky" }, { w: "Ushas", note: "Vedic goddess of radiant dawn" },
    { w: "Hemera", note: "Greek spirit of daylight" }, { w: "Brigid", note: "Celtic goddess of fire & renewal" },
    { w: "Khepri", note: "Egyptian god of sunrise" } ] },
];

const saved: SavedIdea[] = [
  { w: "dawn", concept: "The Exhale Moment" }, { w: "aurora", concept: "The Exhale Moment" },
  { w: "ember", concept: "The Forge" }, { w: "spark", concept: "The Forge" },
  { w: "alba", concept: "First Light" }, { w: "first light", concept: "First Light", mine: true },
];

const idea = (name: string, score: number, type = "invented", rationale = "", seed = ""): NameIdea => ({ name, type, rationale, score, seed });
const shortlistRows: SeedRow[] = [
  { seed: "dawn", concept: "The Exhale Moment", ideas: [
    idea("Aurova", 97, "evocative", "Dawn made luminous and new. The clearest, most ownable of the set.", "aurora + nova"),
    idea("Daybreak", 87, "real-word", "The moment everything starts. Poetic and direct, but harder to trademark.", "day + break"),
    idea("Dawnly", 80, "invented", "Friendly and native to SaaS, though it gives up some distinctiveness.", "dawn + -ly"),
    idea("Lumen", 73, "real-word", "The unit of light itself. Clean and trusted, but in crowded territory.", "Latin · light"),
    idea("Dawnara", 66, "invented", "Expansive and feminine, with a global feel. Slightly harder to pronounce.", "dawn + ara"),
  ]},
  { seed: "ember", concept: "The Forge", ideas: [
    idea("Embra", 87, "invented", "A quiet glow with confidence. Punchy, warm and instantly easy to say.", "ember + bravo"),
    idea("Emberly", 76, "invented", "Warmer but softer. Works well for consumer brands.", "ember + -ly"),
    idea("Glow", 70, "real-word", "Pure and visceral. Generic risk is high.", ""),
    idea("Embero", 63, "invented", "Italian-tinged and distinctive. Needs some teaching.", "ember + -o"),
    idea("Emberhaus", 58, "invented", "Strong craft feel. Too niche for a broad SaaS play.", "ember + haus"),
  ]},
  { seed: "alba", concept: "First Light", ideas: [
    idea("Albara", 80, "invented", "Italian dawn made musical. Elegant and distinctive, a touch long.", "alba + clara"),
    idea("Alva", 72, "real-word", "Short, sharp, Scandinavian. Could be a person's name.", "Old Norse · elf"),
    idea("Albright", 67, "real-word", "Authority and light in one word. Leans formal.", "alba + right"),
    idea("Alvenly", 60, "invented", "Heavenly register. Romantic, but harder to say fast.", "alven + -ly"),
    idea("Albo", 55, "invented", "Very short and punchy. Informal feel.", "alba + -o"),
  ]},
  { seed: "spark", concept: "The Forge", ideas: [
    idea("Sparq", 80, "invented", "The flash that starts everything. Digital and punchy, needs teaching.", "spark, respelled"),
    idea("Ignite", 74, "real-word", "Visceral and direct. Highly competitive space.", ""),
    idea("Sparko", 62, "invented", "Playful and energetic. Works for consumer, less for enterprise.", "spark + -o"),
    idea("Sparkhaus", 56, "invented", "A craft workshop feel. Too literal for a naming studio.", "spark + haus"),
    idea("Sparkly", 50, "real-word", "Descriptive and friendly. Lacks naming-studio gravitas.", "spark + -ly"),
  ]},
];

const shortlist = ["Aurova", "Embra", "Albara", "Lumen", "Sparq"];

type Dims = { intuitive: number; visual: number; sound: number; emotional: number };
const row = (name: string, d: Dims, inpi: boolean, ig: boolean, verdict: string, tagline: string, suggested: { domain: string; price: string; renewal: string }[]) => ({
  name, ...d, total: d.intuitive + d.visual + d.sound + d.emotional,
  domains: [{ tld: ".com", available: false }, { tld: ".io", available: true }, { tld: ".ai", available: true }],
  suggested, inpi, inpiNote: inpi ? "No earlier mark in classes 9 / 42 (estimate)" : "Possible earlier mark, worth a closer look (estimate)",
  instagram: ig, verdict, tagline,
});

const comp: Comparison = {
  recommended: "Aurova",
  why: "Aurova clears every column: a warm, ownable coinage with a clear dawn story and domains you can grab today.",
  niceClasses: [9, 42],
  rows: [
    row("Aurova", { intuitive: 5, visual: 5, sound: 5, emotional: 5 }, true, true, "Warm, ownable, and instantly evokes the dawn.", "Begin again, every morning.",
      [{ domain: "aurova.com", price: "$12", renewal: "$14/yr" }, { domain: "aurova.io", price: "$38", renewal: "$46/yr" }, { domain: "aurova.app", price: "$14", renewal: "$18/yr" }]),
    row("Embra", { intuitive: 4, visual: 5, sound: 4, emotional: 5 }, true, true, "Soft warmth with a quiet glow; reads premium.", "Calm, beautifully held.",
      [{ domain: "embra.io", price: "$38", renewal: "$46/yr" }, { domain: "getembra.com", price: "$12", renewal: "$14/yr" }, { domain: "embraapp.com", price: "$12", renewal: "$14/yr" }]),
    row("Albara", { intuitive: 4, visual: 4, sound: 4, emotional: 4 }, true, false, "Elegant and musical, a touch long.", "Your quiet companion.",
      [{ domain: "albara.ai", price: "$70", renewal: "$110/yr" }, { domain: "getalbara.com", price: "$12", renewal: "$14/yr" }, { domain: "albarahq.com", price: "$12", renewal: "$14/yr" }]),
    row("Lumen", { intuitive: 4, visual: 4, sound: 5, emotional: 3 }, false, false, "Clear and bright but a touch generic.", "Clarity, switched on.",
      [{ domain: "lumenly.com", price: "$12", renewal: "$14/yr" }, { domain: "lumenio.com", price: "$12", renewal: "$14/yr" }, { domain: "joinlumen.com", price: "$12", renewal: "$14/yr" }]),
    row("Sparq", { intuitive: 3, visual: 4, sound: 4, emotional: 3 }, true, true, "Punchy and short; the dropped vowel feels a little dated.", "A spark for builders.",
      [{ domain: "sparq.io", price: "$38", renewal: "$46/yr" }, { domain: "sparq.app", price: "$14", renewal: "$18/yr" }, { domain: "getsparq.com", price: "$12", renewal: "$14/yr" }]),
  ],
};

export const MOCK: TestSeed = {
  step: 0, brief, stage: "Building it", workingName: "Untitled",
  feelings, concepts, chosen: ["The Exhale Moment", "The Forge"], saved,
  exploreSeed: { focus: { word: "dawn", def: "The first light that breaks the darkness, signaling a new beginning." }, groups },
  shortlistRows, shortlist, comp, taglines: {}, chosenFinal: "Aurova",
};
