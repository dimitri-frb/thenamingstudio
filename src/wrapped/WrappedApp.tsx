// Name Name — the "Wrapped" flow. One black stage:
// 00 landing → 01 the ask → 02 brief wrapped → 03 the words → 04 the names
// (gated when signed out) → 05 the reveal → then the own-it hub:
// 06 domain → 06b/c logo → 07 brand book → 08 socials → 09 all set.
import { Fragment, lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./wrapped.css";
import {
  ACTIVE, ACTIVE_BRIEF, GOOGLE_CLIENT_ID, attrib, authGoogle, clearSnap, coinNames, fetchDomainBoard, fetchMe,
  loadGsi, loadSession, loadSnap, newProcess, processId, putSearch, registrarUrl, sampleBook,
  loadBriefEta, loadEta, loadWordsEta, logoTweak, recordBriefEta, recordEta, recordWordsEta, saveSnap, setProcessId, setTestMode, sharePut, track, wrapApi, type NameStream,
  type DomainBoardData, type DomainCard, type SavedSearch, type WBook, type WConcept,
  type WName, type WStyle, type WTerritory, type WUser, type WWord,
} from "./api";
import { BRAND_TILES, buildLogoPack, ensureFonts, logoConcepts, logoSvg, toPalette, whyItWorks, type CustomSymbol, type LogoConcept, type LogoFont, type LogoShape } from "./logos";
import { BRAND_AXES, SWIPE_POOL, brandLogo, drawDeck, styleArticle, type InspireBrand } from "./inspire";
import { download } from "./zip";
import type { BookCtx } from "./Book";

// The brand book (pages, print CSS, the Word export) is its own chunk: it only
// loads once a founder has picked a name, never on the ad click's first paint.
const BookPreview = lazy(() => import("./Book").then((m) => ({ default: m.BookPreview })));
const BookPrint = lazy(() => import("./Book").then((m) => ({ default: m.BookPrint })));
const ScaledPage = lazy(() => import("./Book").then((m) => ({ default: m.ScaledPage })));

type Step =
  | "land" | "how" | "brief" | "refine" | "brands" | "brandsum" | "words" | "names" | "claim" | "reveal"
  | "brand" | "feel" | "tcol" | "ttype" | "tshape" | "taste" | "logo" | "logodone" | "pers" | "book" | "socials"
  | "done";
// The product is a triptych: Name → Domain → Brand. The domain is claimed
// right inside chapter 1 now (05 Claim), so there's no Domain chapter left.
const CHAPTERS: Partial<Record<Step, { label: string; segs: number; idx: number }>> = {
  brief:  { label: "Chapter 1 · Name", segs: 6, idx: 0 },
  refine: { label: "Chapter 1 · Name", segs: 6, idx: 1 },
  brands: { label: "Chapter 1 · Name", segs: 6, idx: 2 },
  brandsum: { label: "Chapter 1 · Name", segs: 6, idx: 2 },
  words:  { label: "Chapter 1 · Name", segs: 6, idx: 3 },
  names:  { label: "Chapter 1 · Name", segs: 6, idx: 4 },
  claim:  { label: "Claim your name", segs: 6, idx: 5 },
  reveal: { label: "Chapter 1 · Name", segs: 6, idx: 5 },
  brand:  { label: "Chapter 3 · Brand", segs: 0, idx: 0 },
  feel:   { label: "Chapter 3 · Brand · Feeling", segs: 9, idx: 0 },
  tcol:   { label: "Chapter 3 · Brand · Colours", segs: 9, idx: 1 },
  ttype:  { label: "Chapter 3 · Brand · Type", segs: 9, idx: 2 },
  tshape: { label: "Chapter 3 · Brand · Shape", segs: 9, idx: 3 },
  taste:  { label: "Chapter 3 · Brand · Your taste", segs: 9, idx: 4 },
  logo:   { label: "Chapter 3 · Brand · Logos", segs: 9, idx: 5 },
  logodone: { label: "Chapter 3 · Brand · Your logo", segs: 9, idx: 6 },
  pers:   { label: "Chapter 3 · Brand · Personalize", segs: 9, idx: 6 },
  book:   { label: "Chapter 3 · Brand · Brand book", segs: 9, idx: 7 },
  socials: { label: "Chapter 3 · Brand · Socials", segs: 9, idx: 8 },
};
const STEPS_ALL: Step[] = ["land", "brief", "refine", "brands", "brandsum", "words", "names", "claim", "reveal", "brand", "feel", "tcol", "ttype", "tshape", "taste", "logo", "logodone", "pers", "book", "socials", "done"];

// The URL mirrors the step (/2-concept, /4-names…), so the nav shows where you
// are and the browser's back/forward walk the flow.
const STEP_SLUG: Record<Step, string> = {
  land: "", how: "how-it-works", brief: "2-concept", refine: "2-refine", brands: "2-brands", brandsum: "2-your-taste", words: "3-words", names: "4-names", claim: "5-claim", reveal: "5-reveal",
  brand: "7-brand", feel: "7-feeling", tcol: "7-colours", ttype: "7-type", tshape: "7-shape", taste: "7-taste",
  logo: "8-logos", logodone: "8-logo", pers: "8-personalize", book: "9-brand-book", socials: "10-socials", done: "11-done",
};
const SLUG_STEP: Record<string, Step> = Object.fromEntries(
  (Object.entries(STEP_SLUG) as [Step, string][]).filter(([, v]) => v).map(([k, v]) => [v, k]),
) as Record<string, Step>;
// Old links and old snapshots keep working: the ask page folded into the
// landing, and the separate Domain step folded into 05 Claim.
SLUG_STEP["1-brief"] = "land";
SLUG_STEP["6-domain"] = "claim";
const LEGACY_STEP: Record<string, Step> = { ask: "land", domain: "claim" };
const liveStep = (s: string): Step => (LEGACY_STEP[s] || s) as Step;
const pathSlug = () => {
  const base = ((import.meta as any).env.BASE_URL || "/").replace(/\/$/, "");
  return window.location.pathname.replace(base, "").replace(/^\/+|\/+$/g, "").replace(/^test\/?/, "");
};
// Entered through /test/<step>? Then every URL we push keeps the prefix.
const TEST_PATH = /(?:^|\/)test(?:\/|$)/.test(window.location.pathname);

// The Brand chapter's taste quiz: four picks, then sliders.
export interface Taste { feeling: string[]; colours: string[]; type: string; shape: string; sliders: { ce: number; wc: number; rs: number; ss: number; mb: number } }
const TASTE_DEFAULT: Taste = { feeling: ["Soft & warm"], colours: ["Dawn to night"], type: "Elegant serif", shape: "Round & soft", sliders: { ce: 35, wc: 28, rs: 30, ss: 28, mb: 35 } };

/* ── Personalize (06f·p): the symbol set and the "More fonts" catalogue ── */
const PERS_SYMBOLS: { k: CustomSymbol; l: string }[] = [
  { k: "half", l: "Half sun" }, { k: "full", l: "Full sun" }, { k: "ring", l: "Ring" }, { k: "horizon", l: "Horizon" },
  { k: "rays", l: "Rays" }, { k: "arc", l: "Arc" }, { k: "monogram", l: "Monogram" }, { k: "none", l: "None" },
];
function SymIcon({ k }: { k: CustomSymbol }) {
  const p: Record<CustomSymbol, React.ReactNode> = {
    half: <path d="M3 13 A 7 7 0 0 1 17 13 Z" fill="currentColor" />,
    full: <circle cx="10" cy="10" r="6.5" fill="currentColor" />,
    ring: <circle cx="10" cy="10" r="5.5" fill="none" stroke="currentColor" strokeWidth="2.6" />,
    horizon: <><path d="M4.5 11 A 5.5 5.5 0 0 1 15.5 11 Z" fill="currentColor" /><line x1="3" y1="14.5" x2="17" y2="14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>,
    rays: <><circle cx="10" cy="10" r="3.6" fill="currentColor" />{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = (i / 8) * Math.PI * 2; return <line key={i} x1={10 + Math.cos(a) * 5.4} y1={10 + Math.sin(a) * 5.4} x2={10 + Math.cos(a) * 7.4} y2={10 + Math.sin(a) * 7.4} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />; })}</>,
    arc: <path d="M4 13 A 6 6 0 0 1 16 13" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />,
    monogram: <><rect x="3.5" y="3.5" width="13" height="13" rx="3.4" fill="currentColor" /><text x="10" y="13.6" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="var(--night, #141127)" style={{ fontFamily: "var(--sans)" }}>A</text></>,
    none: <><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" /><line x1="5.8" y1="14.2" x2="14.2" y2="5.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>,
  };
  return <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden>{p[k]}</svg>;
}
const PERS_FONTS: { f: string; w: number; cat: string }[] = [
  { f: "Archivo Black", w: 400, cat: "Bold" }, { f: "Anton", w: 400, cat: "Bold" }, { f: "Montserrat", w: 800, cat: "Bold" },
  { f: "Poppins", w: 700, cat: "Bold" }, { f: "Bricolage Grotesque", w: 800, cat: "Bold" },
  { f: "Newsreader", w: 500, cat: "Serif" }, { f: "Playfair Display", w: 600, cat: "Serif" }, { f: "Fraunces", w: 600, cat: "Serif" },
  { f: "DM Serif Display", w: 400, cat: "Serif" }, { f: "Cormorant Garamond", w: 600, cat: "Serif" }, { f: "EB Garamond", w: 500, cat: "Serif" },
  { f: "Lora", w: 600, cat: "Serif" }, { f: "Libre Baskerville", w: 700, cat: "Serif" }, { f: "Marcellus", w: 400, cat: "Serif" },
  { f: "Space Grotesk", w: 600, cat: "Sans" }, { f: "Sora", w: 600, cat: "Sans" }, { f: "Manrope", w: 700, cat: "Sans" }, { f: "Outfit", w: 600, cat: "Sans" },
  { f: "Space Mono", w: 500, cat: "Mono" }, { f: "JetBrains Mono", w: 500, cat: "Mono" }, { f: "IBM Plex Mono", w: 500, cat: "Mono" },
  { f: "Jost", w: 300, cat: "Light" }, { f: "Raleway", w: 300, cat: "Light" }, { f: "Josefin Sans", w: 300, cat: "Light" },
  { f: "Pacifico", w: 400, cat: "Script" }, { f: "Dancing Script", w: 600, cat: "Script" }, { f: "Caveat", w: 600, cat: "Script" },
];
const persFontCat = (cat: string): LogoFont => (cat === "Serif" || cat === "Script" ? "serif" : cat === "Mono" || cat === "Light" ? "light" : "bold");
const TASTE_OPTS = {
  feel: [
    { k: "Soft & warm", d: "Calm, gentle, human" },
    { k: "Bold & bright", d: "Loud, confident, fast" },
    { k: "Calm & minimal", d: "Quiet, clear, essential" },
    { k: "Playful", d: "Curious, fun, a little wild" },
  ],
  tcol: [
    { k: "Dawn to night", d: "Warm peach into deep blue", pal: ["#ff9e7a", "#c9b6ff", "#7c9cff", "#0f0d24"] },
    { k: "Forest & sand", d: "Natural, grounded", pal: ["#8a9b6e", "#d8c3a5", "#4e6e58", "#1b241b"] },
    { k: "Monochrome", d: "Timeless, serious", pal: ["#e8e8e8", "#9a9a9a", "#4a4a4a", "#101010"] },
    { k: "Citrus pop", d: "Energetic, bright", pal: ["#ffb238", "#ff6b35", "#f7c548", "#241a10"] },
  ],
  ttype: [
    { k: "Elegant serif", d: "Literary, trusted" },
    { k: "Modern serif", d: "Sharp, editorial" },
    { k: "Slab serif", d: "Solid, confident" },
    { k: "Clean sans", d: "Modern, simple" },
    { k: "Geometric sans", d: "Precise, friendly" },
    { k: "Grotesque", d: "Raw, characterful" },
    { k: "Strong caps", d: "Bold, architectural" },
    { k: "Rounded", d: "Soft, approachable" },
    { k: "Technical mono", d: "Precise, digital" },
    { k: "Script", d: "Personal, handmade" },
  ],
  tshape: [
    { k: "Round & soft", d: "Curves, gentle edges" },
    { k: "Sharp & angular", d: "Edges, precision" },
    { k: "Organic", d: "Hand-shaped, natural" },
    { k: "Geometric", d: "Grids, order" },
  ],
} as const;
const tastePalette = (t: Taste) => {
  const pal = (TASTE_OPTS.tcol.find((o) => t.colours.includes(o.k)) || TASTE_OPTS.tcol[0]).pal;
  return { dawn: pal[0], haze: pal[1], nova: pal[2], night: pal[3] };
};
// Every quiz pick re-seeds the recap sliders, so the sliders (and everything
// built from them) start where the founder's choices put them.
const seedSliders = (t: Taste): Taste["sliders"] => {
  const has = (k: string) => t.feeling.includes(k);
  return {
    ce: has("Bold & bright") || has("Playful") ? 72 : has("Calm & minimal") ? 22 : 35,
    wc: t.colours.includes("Citrus pop") ? 18 : t.colours.includes("Dawn to night") ? 30 : t.colours.includes("Forest & sand") ? 45 : 60,
    rs: t.shape === "Round & soft" ? 20 : t.shape === "Organic" ? 35 : t.shape === "Geometric" ? 62 : 82,
    ss: ["Elegant serif", "Modern serif", "Slab serif", "Script"].includes(t.type) ? 22 : t.type === "Technical mono" ? 70 : t.type === "Strong caps" ? 78 : 65,
    mb: has("Bold & bright") ? 72 : has("Calm & minimal") ? 24 : 40,
  };
};
const tasteFont = (t: Taste): LogoFont => {
  // The type pick decides; the serif↔sans slider can overrule at the extremes.
  const base: LogoFont = ["Elegant serif", "Modern serif", "Slab serif", "Script"].includes(t.type) ? "serif" : t.type === "Technical mono" ? "light" : "bold";
  if (t.sliders.ss <= 35) return "serif";
  if (t.sliders.ss >= 65 && base === "serif") return t.sliders.mb >= 55 ? "bold" : "light";
  return base;
};
const tasteShape = (t: Taste): LogoShape => {
  const base: LogoShape = t.shape === "Sharp & angular" ? "sharp" : t.shape === "Organic" ? "organic" : t.shape === "Geometric" ? "geometric" : "round";
  if (t.sliders.rs >= 88) return "sharp";
  if (t.sliders.rs <= 10) return "round";
  return base;
};
const tasteLine = (t: Taste) => {
  const feel: Record<string, string> = { "Soft & warm": "warm", "Bold & bright": "bold", "Calm & minimal": "calm", "Playful": "playful" };
  const shape: Record<string, string> = { "Round & soft": "rounded", "Sharp & angular": "sharp", "Organic": "organic", "Geometric": "geometric" };
  const type: Record<string, string> = { "Elegant serif": "an elegant serif", "Clean sans": "a clean sans", "Strong caps": "strong caps", "Technical mono": "a technical mono" };
  const feels = t.feeling.map((f) => feel[f]).filter(Boolean);
  const parts = [...feels, shape[t.shape]].filter(Boolean);
  const head = parts.length > 1 ? parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1] : parts[0] || "balanced";
  return head[0].toUpperCase() + head.slice(1) + ", with " + (type[t.type] || "a clean sans") + ".";
};

const SOCIALS = [
  { name: "Instagram", desc: "Photos, stories and reels", url: "https://www.instagram.com/accounts/emailsignup/" },
  { name: "X", desc: "Updates and conversation", url: "https://x.com/i/flow/signup" },
  { name: "TikTok", desc: "Short video", url: "https://www.tiktok.com/signup" },
  { name: "LinkedIn", desc: "Company page", url: "https://www.linkedin.com/signup" },
];

export function WrappedApp({ test, resume, go }: { test: boolean; resume?: string; go?: string }) {
  const [step, setStep] = useState<Step>(test ? "land" : "land");
  const [sentence, setSentence] = useState(test ? ACTIVE_BRIEF().sentence : "");
  const [chips, setChips] = useState<string[]>(test ? ACTIVE_BRIEF().chips : []);
  const [concept, setConcept] = useState<WConcept | null>(test ? ACTIVE().concept : null);
  const [feelOpts, setFeelOpts] = useState<string[]>(test ? [ACTIVE().concept.concept, ...(ACTIVE().concept.alts || [])] : []);
  // The refine page's founder preferences, folded into every later generation.
  const [prefs, setPrefs] = useState<{ tone: string[]; style: string[]; length: string; langs: string[]; avoid: string[]; terr: string[]; doms: string[]; who: string[]; brandsLiked: string[]; brandsDisliked: string[]; axes: TasteAxes | null }>({
    tone: [], style: [], length: "Any", langs: ["English"], avoid: [], terr: [], doms: [], who: [], brandsLiked: [], brandsDisliked: [], axes: null,
  });
  const [deck, setDeck] = useState<InspireBrand[]>(() => drawDeck()); // 8 cards drawn from the 30-brand pool
  const [styles, setStyles] = useState<WStyle[] | null>(test ? ACTIVE().styles : null);
  const [starred, setStarred] = useState<WWord[]>(test ? [ACTIVE().styles[0].words[0], ACTIVE().styles[0].words[1], ACTIVE().styles[1].words[0], ACTIVE().styles[1].words[2]] : []);
  const [names, setNames] = useState<WName[] | null>(test ? ACTIVE().names : null);
  const [namesBusy, setNamesBusy] = useState(false);
  const [namesProg, setNamesProg] = useState(0);      // names coined so far (drives the wait screen)
  const waitStart = useRef(0);
  const [moreBusy, setMoreBusy] = useState(false);
  const [picked, setPicked] = useState<WName | null>(test ? ACTIVE().names[0] : null);
  const [board, setBoard] = useState<DomainBoardData | null>(null);
  const [domSel, setDomSel] = useState<DomainCard | null>(null);
  const [logoSeed, setLogoSeed] = useState(0);
  const [taste, setTaste] = useState<Taste>(TASTE_DEFAULT);
  const [logoSel, setLogoSel] = useState<LogoConcept | null>(null);
  const [persDraft, setPersDraft] = useState<{ symbol: CustomSymbol; layout: "stacked" | "side" | "symbol"; accentHex: string; font: LogoFont; scale: number; family?: string; famWeight?: number; sseed?: number } | null>(null);
  const [persBusy, setPersBusy] = useState(false);
  const [persAsk, setPersAsk] = useState("");
  const [persFontsOpen, setPersFontsOpen] = useState(false);
  const [persFontQ, setPersFontQ] = useState("");
  const [poll, setPoll] = useState<null | "exit" | "idle">(null);
  const pollShown = useRef(false);
  // ── 05 Claim: the story fold, the endings sheet, the registrar sheet, 05·✓ ──
  const [claimStory, setClaimStory] = useState(false);
  const [claimSheet, setClaimSheet] = useState<null | "tld" | "go">(null);
  const [claimDone, setClaimDone] = useState(false); // 05·✓, after the buy-now jump
  const [domBought, setDomBought] = useState(false); // user-set only ("Mark as done")
  // ── V2 mobile (handoff words-names-v2): phones get the tap-5 cloud + compact names ──
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    const fn = () => setIsMobile(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  const [v2Sel, setV2Sel] = useState<string | null>(null);  // selected name (V2 names list)
  const v2Known = useRef<string[] | null>(null);            // names present before the last "6 more"
  const [book, setBook] = useState<WBook | null>(test ? sampleBook(ACTIVE().names[0].name) : null);
  const [steps, setSteps] = useState<SavedSearch["steps"]>({});
  const [user, setUser] = useState<WUser | null>(() => loadSession()?.user || null);
  const [bookOpen, setBookOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [briefGate, setBriefGate] = useState(false); // 00·s: sign up right after Name it
  const [shareMsg, setShareMsg] = useState("");
  // Which generations failed (engine unreachable / bad answer) → honest retry UI.
  const [fails, setFails] = useState<Record<string, boolean>>({});
  const [retryTick, setRetryTick] = useState(0);
  const startedAt = useRef(Date.now());
  const conceptReq = useRef("");
  const conceptFor = useRef("");   // the sentence the current concept was built from
  const wordsReq = useRef("");
  const bookPre = useRef(new Map<string, Promise<WBook | null>>());
  const namesPre = useRef<{ key: string; st: NameStream } | null>(null);
  const morePre = useRef<{ key: string; st: NameStream } | null>(null);
  const stepRef = useRef(step);
  stepRef.current = step;

  const fail = (k: string, v: boolean) => setFails((f) => ({ ...f, [k]: v }));
  const retry = (k: string) => { fail(k, false); if (k === "book" && picked) bookPre.current.delete(picked.name); setRetryTick((t) => t + 1); };
  // The brand book for a name, fetched once and shared between prefetch and use.
  // The taste payload carries the founder's palette hexes, so the book's
  // colours (and the logo drawn with them) match the logo pages exactly.
  const tasteForBook = (t: Taste) => {
    const lp = tastePalette(t);
    return { ...t, palette: [{ name: "Dawn", hex: lp.dawn }, { name: "Haze", hex: lp.haze }, { name: "Nova", hex: lp.nova }, { name: "Night", hex: lp.night }] };
  };
  const bookFetch = (n: WName, t?: Taste) => {
    if (!bookPre.current.has(n.name)) {
      bookPre.current.set(n.name, wrapApi.book(sentence.trim(), chips, concept?.concept || "", n.name, n.parts || [], tasteForBook(t || taste)));
    }
    return bookPre.current.get(n.name)!;
  };
  // Finishing the taste quiz regenerates the book WITH the taste, quietly,
  // while the founder is still browsing logos (two screens of cover).
  const refreshBookForTaste = (t: Taste) => {
    if (test || !picked) return;
    bookPre.current.delete(picked.name);
    const who = picked.name;
    bookFetch(picked, t).then((b) => {
      if (picked?.name !== who) return;
      if (b?.palette) { setBook(b); persist({ palette: b.palette }); }
    });
  };
  const starKey = (ws: WWord[]) => ws.map((w) => w.w).sort().join("|");
  const conceptReady = !!concept && (test || conceptFor.current === sentence.trim());

  useEffect(() => { setTestMode(test); }, [test]);

  /* ── resume: from the account page (?resume=id) or a same-browser refresh ── */
  useEffect(() => {
    if (test) { // sample data is all seeded, so any step URL works directly
      const t = SLUG_STEP[pathSlug()];
      if (t) { if (t === "logodone") setLogoSel(logoConcepts(0)[0]); setStep(t); }
      return;
    }
    (async () => {
      if (resume) {
        const me = await fetchMe();
        if (me.user) setUser(me.user);
        const s = me.searches.find((x) => x.id === resume);
        if (s) { hydrate(s); return; }
      }
      const snap = loadSnap();
      if (snap?.sentence && snap.step && snap.step !== "land") {
        setProcessId(snap.process);
        setSentence(snap.sentence);
        if (snap.concept) conceptFor.current = snap.sentence;
        setChips(snap.chips || []);
        setConcept(snap.concept || null);
        setStyles(snap.styles || null);
        setStarred(snap.starred || []);
        setNames(snap.names || null);
        setPicked(snap.picked || null);
        setSteps(snap.steps || {});
        setLogoSel(snap.logoSel || null);
        setLogoSeed(snap.logoSeed || 0);
        setBook(snap.book || null);
        if (snap.prefs) setPrefs(snap.prefs);
        if (snap.feelOpts) setFeelOpts(snap.feelOpts);
        if (snap.taste) setTaste(snap.taste);
        if (snap.bought) setDomBought(true);
        const slugStep = SLUG_STEP[pathSlug()];
        const okSlug = slugStep && (
          (["brief", "words"].includes(slugStep) && snap.sentence) ||
          (slugStep === "names" && (snap.names?.length || snap.starred?.length)) ||
          (!["land", "brief", "words", "names"].includes(slugStep) && snap.picked)
        );
        const target: Step = okSlug ? slugStep : liveStep(snap.step);
        setStep(target);
        pushUrl(target, true);
      } else {
        const slugStep = SLUG_STEP[pathSlug()];
        if (slugStep === "how") { setStep(slugStep); pushUrl(slugStep, true); }
        else if (slugStep) pushUrl("land", true); // a deep link with no run behind it
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function hydrate(s: SavedSearch) {
    setProcessId(s.id);
    startedAt.current = s.at;
    setSentence(s.sentence);
    setChips(s.chips || []);
    if (s.concept) conceptFor.current = s.sentence;
    setConcept(s.concept || null);
    setStarred(s.starred || []);
    setNames(s.names || null);
    setPicked(s.picked || null);
    setSteps(s.steps || {});
    setDomBought(!!s.bought);
    if (s.logo) setLogoSel({ key: s.logo.key, title: s.logo.title, accent: (s.logo as any).accent || "dawn", seed: s.logo.seed || 0, font: (s.logo as any).font });
    const target: Step =
      s.picked && go === "domain" ? "claim" :
      s.picked && go && ["book", "socials"].includes(go) ? (go as Step) :
      s.picked && go === "logo" ? (s.logo ? "logodone" : "logo") :
      s.picked ? (s.steps?.domain ? "reveal" : "claim") :
      s.names?.length ? "names" :
      s.concept ? "words" : "brief";
    setStep(target);
    pushUrl(target, true);
  }

  /* ── persistence (refresh-resume + account) ── */
  useEffect(() => {
    if (test || step === "land") return;
    saveSnap({ step, sentence, chips, concept, styles, starred, names, picked, steps, logoSel, logoSeed, book, prefs, feelOpts, taste, bought: domBought });
  }, [test, step, sentence, chips, concept, styles, starred, names, picked, steps, logoSel, logoSeed, book, prefs, feelOpts, taste, domBought]);

  function persist(over: Partial<SavedSearch> = {}) {
    if (test || !sentence.trim()) return;
    const status: SavedSearch["status"] = steps.domain === "done" || over.steps?.domain === "done" ? "claimed" : (names?.length ? "ready" : "exploring");
    putSearch({
      id: processId(), at: startedAt.current, updated: Date.now(),
      sentence: sentence.trim(), chips, concept, starred, names: names || undefined,
      picked, steps, status, bought: domBought,
      logo: logoSel ? { key: logoSel.key, title: logoSel.title, seed: logoSel.seed, accent: logoSel.accent, font: logoSel.font } : null,
      taste,
      ...over,
    } as SavedSearch);
  }

  /* ── generation chain (each step precharges the next) ── */
  useEffect(() => { // chips, as the founder pauses typing on the landing
    if (test || step !== "land") return;
    const s = sentence.trim();
    if (s.length < 12) return;
    const t = setTimeout(async () => {
      const r = await wrapApi.chips(s);
      setChips((prev) => (prev.length ? prev : (r.chips || []).slice(0, 4)));
    }, 600);
    return () => clearTimeout(t);
  }, [test, step, sentence]);

  useEffect(() => { // concept: starts while the founder is STILL TYPING the ask (debounced)
    if (test) return;
    const s = sentence.trim();
    if (s.length < 12) return;
    if (concept && conceptFor.current === s) return;
    const go = () => {
      const t0 = Date.now();
      const key = s + "|" + retryTick;
      if (conceptReq.current === key) return;
      conceptReq.current = key;
      wrapApi.concept(s, chips).then((c) => {
        if (conceptReq.current !== key) return; // superseded by an edit
        if (c?.concept) {
          // A concept for a rewritten brief invalidates everything built downstream.
          if (conceptFor.current && conceptFor.current !== s) {
            setStyles(null); wordsReq.current = "";
            setStarred([]); setNames(null); namesPre.current = null;
          }
          conceptFor.current = s;
          recordBriefEta(Date.now() - t0);
          setConcept(c);
          setFeelOpts([c.concept, ...(c.alts || [])].filter(Boolean).slice(0, 3));
          fail("concept", false);
        } else {
          conceptReq.current = "";
          if (stepRef.current !== "land") fail("concept", true); // silent while still typing
        }
      });
    };
    if (step === "land") { const t = setTimeout(go, 800); return () => clearTimeout(t); }
    if (step === "refine") { const t = setTimeout(go, 1000); return () => clearTimeout(t); } // typing in the refine brief box
    if (["brief", "words", "names"].includes(step)) go();
  }, [test, step, sentence, chips, concept, retryTick]);

  const wordsPlan = (): WTerritory[] => {
    const known = concept?.territories || [];
    const terrs = known.filter((t) => !prefs.terr.length || prefs.terr.includes(t.name));
    // Universes the founder typed themselves become columns of their own.
    const custom = prefs.terr.filter((n) => !known.some((t) => t.name === n)).map((n) => ({ name: n, desc: "" }));
    const extras = [
      { name: "Motion", desc: "movement, drive, pace" },
      { name: "Clarity", desc: "clear, pure, true" },
      { name: "Languages", desc: "the idea in other tongues" },
      { name: "Craft", desc: "made with care, by hand" },
      { name: "Texture", desc: "how it feels to the touch" },
    ];
    return [...terrs, ...custom, ...extras].slice(0, 6);
  };
  const wordsKey = () =>
    (concept?.concept || "") + "|" + JSON.stringify([prefs.terr, prefs.langs, prefs.tone, prefs.style, prefs.avoid]) + "|" + retryTick;
  const wordsBusyMore = useRef(false);
  const wordsBatches = useRef(0);

  useEffect(() => { // words: SIX one-style calls in parallel the instant the concept lands.
    // The page renders once, with every column at the same time — the calls fire
    // during the concept page, so by the time the founder arrives it's instant.
    if (test || !conceptReady || styles) return;
    const key = wordsKey();
    if (wordsReq.current === key) return;
    wordsReq.current = key;
    wordsBatches.current = 0;
    const slots: (WStyle | null)[] = new Array(6).fill(null);
    let settled = 0;
    let rescued = false;
    const t0 = Date.now();
    const s = sentence.trim();
    const plan = wordsPlan();
    const finish = () => {
      settled++;
      if (settled < 6 || wordsReq.current !== key) return;
      const got = slots.filter(Boolean) as WStyle[];
      // Never ship a thin page: under five columns, the missing ones get one
      // more full round before we render anything.
      if (got.length < 5 && got.length > 0 && !rescued) {
        rescued = true;
        const missing = plan.map((st, i) => [st, i] as const).filter(([, i]) => !slots[i]);
        settled = 6 - missing.length;
        missing.forEach(([st, i]) => run(i, st, 0));
        return;
      }
      // The six calls run blind to each other: drop any word a previous column already shows.
      const seen = new Set<string>();
      const deduped = got.map((st) => ({ ...st, words: st.words.filter((w) => { const k = w.w.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }) }));
      if (deduped.length) { recordWordsEta(Date.now() - t0); setStyles(deduped); fail("words", false); }
      else fail("words", true);
    };
    const run = (i: number, st: WTerritory, attempt: number) => {
      wrapApi.wordStyle(s, concept!.concept, concept!.territories, st, i, prefs).then((r) => {
        if (wordsReq.current !== key) return; // superseded
        if (r?.styles?.[0]?.words?.length) { slots[i] = r.styles[0]; finish(); }
        else if (attempt < 2) run(i, st, attempt + 1); // quiet retries so columns never just go missing
        else finish();
      });
    };
    plan.forEach((st, i) => run(i, st, 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, concept, conceptReady, styles, sentence, retryTick, prefs]);

  // Page 3 "Show more words": one more 16-per-column round (≈200 words total).
  // The batch lands atomically so every column keeps the same count.
  const [moreWordsBusy, setMoreWordsBusy] = useState(false);
  const wordsMaxed = wordsBatches.current >= 1;
  function loadMoreWords() {
    if (test || !styles || !concept || wordsBusyMore.current || wordsBatches.current >= 1) return;
    wordsBusyMore.current = true;
    setMoreWordsBusy(true);
    wordsBatches.current++;
    const key = wordsReq.current;
    const s = sentence.trim();
    const fresh: (WWord[] | null)[] = new Array(styles.length).fill(null);
    let pending = styles.length;
    styles.forEach((st, i) => {
      wrapApi.wordStyle(s, concept.concept, concept.territories, { name: st.name, desc: "" }, i, { ...prefs, exclude: st.words.map((w) => w.w) }).then((r) => {
        fresh[i] = r?.styles?.[0]?.words || null;
        pending--;
        if (pending > 0) return;
        wordsBusyMore.current = false;
        setMoreWordsBusy(false);
        if (wordsReq.current !== key) return;
        // Even columns: append the same number of words to each (the smallest batch wins).
        const per = Math.min(...fresh.map((f) => f?.length || 0));
        if (per < 1) return;
        setStyles((cur) => cur?.map((c, j) => {
          const seen = new Set(c.words.map((w) => w.w));
          const add = (fresh[j] || []).filter((w) => !seen.has(w.w)).slice(0, per);
          return { ...c, words: [...c.words, ...add] };
        }) || cur);
      });
    });
  }

  useEffect(() => { // 04·x / 04·i: one gentle ask at the words or names page, never twice
    if ((step !== "names" && step !== "words") || poll || pollShown.current) return;
    const show = (v: "exit" | "idle") => { if (!pollShown.current) { pollShown.current = true; setPoll(v); } };
    const q = new URLSearchParams(window.location.search);
    if (q.has("poll")) { show(q.get("poll") === "idle" ? "idle" : "exit"); return; } // design QA hook
    if (test) return;
    // 04·x fires when the founder actually leaves — the tab or app is closed or
    // backgrounded (visibilitychange covers both; there's no mouse exit-intent
    // on phones). The ask shows the moment they come back. 04·i is the
    // 30-second quiet version.
    let idle = window.setTimeout(() => show("idle"), 30000);
    const reset = () => { window.clearTimeout(idle); idle = window.setTimeout(() => show("idle"), 30000); };
    let away = false;
    const vis = () => {
      if (document.visibilityState === "hidden") { away = true; return; }
      if (away) show("exit");
    };
    window.addEventListener("pointermove", reset);
    window.addEventListener("keydown", reset);
    window.addEventListener("scroll", reset, true);
    document.addEventListener("visibilitychange", vis);
    return () => { window.clearTimeout(idle); window.removeEventListener("pointermove", reset); window.removeEventListener("keydown", reset); window.removeEventListener("scroll", reset, true); document.removeEventListener("visibilitychange", vis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, poll, test]);

  useEffect(() => { // names: pre-coined (streaming) while the founder is still starring
    if (test || step !== "words" || names?.length || starred.length < 2) return;
    const key = starKey(starred);
    if (namesPre.current?.key === key) return;
    const t = setTimeout(() => {
      namesPre.current?.st.abort(); // a stale set's stream is money down the drain
      namesPre.current = { key, st: coinNames(sentence.trim(), chips, concept?.concept || "", starred, [], prefs) };
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, step, starred, names, sentence, chips, concept]);

  useEffect(() => { // book + domain board: precharged the moment a name is picked
    if (!picked) return;
    void import("./Book"); // warm the lazy book chunk alongside its content
    fetchDomainBoard(picked.name, prefs.doms).then((b) => {
      setBoard(b);
      fail("board", !b.tlds.length);
    });
    if (test) { setBook(sampleBook(picked.name)); return; }
    setBook(null);
    const who = picked.name;
    bookFetch(picked).then((b) => {
      if (picked?.name !== who) return; // superseded by another pick
      if (b?.palette) { setBook(b); fail("book", false); persist({ palette: b.palette }); } else { bookPre.current.delete(who); fail("book", true); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, test, retryTick]);

  // The domain rows the founder sees: the exact name's extensions, topped up so
  // there are ALWAYS 1-2 cheap (<$100) registrable options, pulling in verified
  // variants (tryX.com, Xapp.com…) when the exact name is expensive or gone.
  const domRows = useMemo<DomainCard[]>(() => {
    if (!board) return [];
    const exact = board.tlds.filter((d) => d.status === "available" || d.status === "negotiable");
    const num = (d: DomainCard) => {
      const n = Number((d.price || d.offerPrice || "").replace(/[^0-9.]/g, ""));
      return Number.isFinite(n) && n > 0 ? n : NaN;
    };
    const isCheap = (d: DomainCard) => { const n = num(d); return Number.isFinite(n) && n < 100; };
    const missing = 2 - exact.filter(isCheap).length;
    if (missing <= 0 || !board.variants.length) return exact;
    const slug = (picked?.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const isApp = /\bapp\b/i.test(sentence) || chips.some((c) => /app/i.test(c));
    const PREF = isApp
      ? ["|app", "try|", "get|", "use|", "my|", "|hq", "join|", "hey|", "meet|"]
      : ["try|", "get|", "use|", "my|", "|app", "|hq", "join|", "hey|", "meet|"];
    const rank = (v: DomainCard) => {
      const i = PREF.indexOf(v.domain.replace(/\.[a-z.]+$/, "").replace(slug, "|"));
      return i < 0 ? 50 : i;
    };
    const freeVars = board.variants.filter((v) => v.status === "available").sort((a, b) => rank(a) - rank(b));
    let adds = freeVars.slice(0, missing);
    if (!adds.length) {
      // A truly crowded name: no registrable variant either. Surface the
      // cheapest for-sale variants rather than leaving only five-figure asks.
      adds = board.variants
        .filter((v) => v.status === "negotiable" && Number.isFinite(num(v)))
        .sort((a, b) => num(a) - num(b))
        .slice(0, 2);
    }
    const cut = Math.min(exact.length, exact.some(isCheap) ? 2 : 1);
    return [...exact.slice(0, cut), ...adds, ...exact.slice(cut)];
  }, [board, picked, sentence, chips]);

  // Best pick = first registrable row; with nothing registrable, the cheapest ask.
  const bestDomIdx = useMemo(() => {
    const av = domRows.findIndex((d) => d.status === "available");
    if (av >= 0) return av;
    let bi = 0, bn = Infinity;
    domRows.forEach((d, i) => {
      const n = Number((d.price || d.offerPrice || "").replace(/[^0-9.]/g, "")) || Infinity;
      if (n < bn) { bn = n; bi = i; }
    });
    return bi;
  }, [domRows]);


  useEffect(() => { // default selection follows the best pick
    if (!domRows.length) return;
    setDomSel((cur) => cur || domRows[bestDomIdx] || null);
  }, [domRows, bestDomIdx]);

  /* ── actions ── */
  // The Name Name landing submits the brief into the flow (02) — after the
  // one-tap sign-up (00·s) that keeps the brief, when signed out. There is no
  // separate ask page any more: the brief is typed on the landing itself.
  useEffect(() => { // arriving at Personalize without a draft (refresh, deep link)
    if (step === "pers" && !persDraft && picked) setPersDraft(draftFromSel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, picked]);

  // The gate moved AFTER the wow: everyone sees their brief wrapped (02)
  // first — it's pre-charged while they type, so it costs nothing — and the
  // one-tap sign-up only appears when they ask for the words.
  function startFromLanding() {
    enterFlow();
  }
  function enterFlow() {
    // The landing pre-charges the concept (and the words) under the page's
    // process id while the founder is still typing. Entering the flow KEEPS
    // that id, so the pre-charge, the gate's sign-up and the run itself land
    // as ONE row in the admin — not an anonymous twin plus a real flow.
    const s = sentence.trim();
    const precharged = conceptFor.current === s || conceptReq.current.startsWith(s + "|");
    if (!test && !precharged) newProcess();
    if (!test) startedAt.current = Date.now();
    track("search", { sentence: s, chips });
    setStep("brief");
    pushUrl("brief");
    if (user) persist(); // anonymous runs save to the account once they sign up
  }

  // The personalize draft starts as a faithful translation of the chosen logo.
  // (Initialized below; also hydrated on direct entry or refresh.)
  const draftFromSel = () => {
    // Each concept renders three structural variants per seed; the draft opens
    // as the closest translation of the EXACT tile the founder picked.
    const v = (((logoSel?.seed || 0) % 3) + 3) % 3;
    type D = { symbol: CustomSymbol; layout: "stacked" | "side" | "symbol"; scale?: number; font?: LogoFont };
    const M: Record<string, [D, D, D]> = { // [v0, v1, v2]
      sunrise: [{ symbol: "horizon", layout: "stacked" }, { symbol: "half", layout: "side" }, { symbol: "half", layout: "stacked", scale: 1.5 }],
      nightserif: [{ symbol: "none", layout: "side", font: "serif" }, { symbol: "none", layout: "side", font: "serif" }, { symbol: "none", layout: "side", font: "serif" }],
      dawnsun: [{ symbol: "half", layout: "stacked", scale: 1.5 }, { symbol: "half", layout: "stacked" }, { symbol: "half", layout: "side", scale: 1.4 }],
      appicon: [{ symbol: "monogram", layout: "symbol" }, { symbol: "monogram", layout: "symbol" }, { symbol: "monogram", layout: "symbol" }],
      sidebyside: [{ symbol: "half", layout: "side" }, { symbol: "full", layout: "side", scale: 0.8 }, { symbol: "half", layout: "side" }],
      hazeitalic: [{ symbol: "none", layout: "side", font: "serif" }, { symbol: "full", layout: "side", scale: 0.55, font: "serif" }, { symbol: "none", layout: "side", font: "serif" }],
      outlinesun: [{ symbol: "horizon", layout: "stacked" }, { symbol: "ring", layout: "stacked" }, { symbol: "arc", layout: "stacked" }],
      risingdot: [{ symbol: "full", layout: "side", scale: 0.55 }, { symbol: "full", layout: "side", scale: 0.55 }, { symbol: "full", layout: "stacked", scale: 0.55 }],
      monogram: [{ symbol: "monogram", layout: "symbol" }, { symbol: "monogram", layout: "symbol" }, { symbol: "monogram", layout: "symbol" }],
    };
    const d = logoSel?.custom
      ? { symbol: logoSel.custom.symbol, layout: logoSel.custom.layout, scale: logoSel.custom.scale }
      : (M[logoSel?.key || ""] || [{ symbol: "half", layout: "side" }, { symbol: "half", layout: "side" }, { symbol: "half", layout: "side" }])[v];
    return {
      symbol: d.symbol,
      layout: d.layout,
      accentHex: logoSel?.custom?.accentHex || lpal[logoSel?.accent || "dawn"] || lpal.dawn,
      // The tile's wordmark voice rotates with the round (bold → serif → light)
      // unless the founder picked a face; the draft mirrors that exactly.
      font: logoSel?.font || (d as D).font || (v === 1 ? "serif" : v === 2 ? "light" : "bold"),
      scale: logoSel?.custom?.scale || d.scale || 1,
      family: logoSel?.custom?.family,
      famWeight: logoSel?.custom?.famWeight,
      sseed: logoSel?.custom?.sseed,
    };
  };


  const dataRef = useRef({ sentence, starred, names, picked });
  dataRef.current = { sentence, starred, names, picked };
  const canEnter = (t: Step) => {
    const d = dataRef.current;
    if (t === "land" || t === "how") return true;
    if (t === "brief" || t === "refine" || t === "brands" || t === "brandsum" || t === "words") return !!d.sentence.trim();
    if (t === "names") return !!(d.names?.length || d.starred.length);
    return !!d.picked;
  };
  const urlFor = (t: Step) => {
    const base = (import.meta as any).env.BASE_URL || "/";
    if (test && TEST_PATH) return base + "test/" + STEP_SLUG[t];
    return base + STEP_SLUG[t] + (test ? "?test" : "");
  };
  const pushUrl = (t: Step, replace = false) => {
    try {
      const u = urlFor(t);
      if (window.location.pathname + window.location.search === u) return;
      if (replace) window.history.replaceState({ step: t }, "", u);
      else window.history.pushState({ step: t }, "", u);
    } catch { /* older browsers */ }
  };
  // Each page entry is tracked: generation now pre-charges ahead of the gate,
  // so only these events prove the founder actually SAW a step.
  const afterGate = useRef<Step | null>(null);
  function toStep(s: Step) {
    // The sign-up gate (00·s) sits between the wrapped brief and the words:
    // an anonymous founder asking for brands/words signs up first, then lands
    // exactly where they were heading. loadSession() is the synchronous truth
    // (the React user state lags one render behind the Google callback).
    if (!test && !loadSession()?.user && ["brands", "brandsum", "words", "names"].includes(s)) {
      afterGate.current = s;
      setBriefGate(true);
      return;
    }
    if (s !== step) track("page", { to: s });
    setStep(s); pushUrl(s); window.scrollTo(0, 0);
  }

  useEffect(() => { // browser back/forward walks the flow
    const onPop = (e: PopStateEvent) => {
      const t = liveStep((e.state?.step as string) || SLUG_STEP[pathSlug()] || "land");
      if (canEnter(t)) { setStep(t); window.scrollTo(0, 0); }
      else pushUrl(stepRef.current, true);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function starToggle(w: WWord) {
    setStarred((prev) => prev.some((x) => x.w === w.w) ? prev.filter((x) => x.w !== w.w) : [...prev, w]);
  }

  // Subscribe the page to a (possibly mid-flight) name stream: cards appear as
  // Opus coins them; on completion the batch is sorted strongest-first and the
  // next steps (book, domain boards) start warming.
  function attachStream(st: NameStream, base: WName[]) {
    const upd = () => {
      // The founder sees all six at once; meanwhile the coined count feeds the
      // real-time wait screen.
      if (!st.done) { if (!base.length) setNamesProg(st.names.length); return; }
      st.listeners.delete(upd);
      // Domain checks land AFTER the stream finishes: the lookups mutate the
      // name objects in place, so each late answer needs a repaint — without
      // this, rows said "checking…" forever (and "More" looked broken).
      st.listeners.add(() => setNames((cur) => (cur ? [...cur] : cur)));
      if (!base.length && waitStart.current) { recordEta(Date.now() - waitStart.current); waitStart.current = 0; }
      if (st.error || !st.names.length) {
        setNamesBusy(false); setMoreBusy(false);
        if (base.length) fail("more", true);
        else { setNames(null); fail("names", true); }
        return;
      }
      const batch = [...st.names].sort((x, y) => (y.score || 0) - (x.score || 0));
      const fin = [...base, ...batch];
      setNames(fin);
      setNamesBusy(false); setMoreBusy(false);
      persist({ names: fin });
      if (!test && !base.length && fin[0]) {
        bookFetch(fin[0]);
        fin.slice(0, 3).forEach((n, i) => setTimeout(() => fetchDomainBoard(n.name, prefs.doms), i * 350));
      }
      // "Generate six more" should feel instant: the next batch coins itself now.
      if (!test) {
        const exKey = fin.map((n) => n.name).join("|");
        morePre.current = { key: exKey, st: coinNames(sentence.trim(), chips, concept?.concept || "", starred, fin.map((n) => n.name), prefs) };
      }
    };
    st.listeners.add(upd);
    upd();
  }

  function makeNames(words: WWord[] = starred, method: "manual" | "pick-for-me" = "manual") {
    track("wordsdone", { count: words.length, method });
    toStep("names");
    if (names?.length || namesBusy) return;
    v2Known.current = null; setV2Sel(null);
    setNamesBusy(true);
    setNamesProg(0);
    waitStart.current = Date.now();
    fail("names", false);
    const key = starKey(words);
    let entry = namesPre.current;
    if (!entry || entry.key !== key) { // the stars changed since the prefetch
      entry?.st.abort();
      entry = { key, st: coinNames(sentence.trim(), chips, concept?.concept || "", words, [], prefs) };
      namesPre.current = entry;
    }
    attachStream(entry.st, []);
  }
  // V2 words: "Pick for me" stars the cloud's top words up to five, then continues.
  function continueWithWords(extra: WWord[], method: "manual" | "pick-for-me") {
    const all = [...starred, ...extra.filter((w) => !starred.some((s) => s.w === w.w))];
    if (extra.length) { setStarred(all); persist({ starred: all }); }
    makeNames(all, method);
  }

  function moreNames() {
    if (moreBusy || !names) return;
    v2Known.current = names.map((n) => n.name); // V2: new batch shows on top with a NEW tag
    track("morenames", { have: names.length });
    setMoreBusy(true);
    fail("more", false);
    const exKey = names.map((n) => n.name).join("|");
    // A pre-charged batch that silently failed in the background is no batch:
    // fall through to a fresh stream instead of consuming the error.
    const pre = morePre.current?.key === exKey && !morePre.current.st.error ? morePre.current.st : null;
    const st = pre || coinNames(sentence.trim(), chips, concept?.concept || "", starred, names.map((n) => n.name), prefs);
    morePre.current = null;
    attachStream(st, names);
  }

  function pickName(n: WName) {
    setPicked(n);
    setBoard(null); setDomSel(null); setLogoSel(null); setLogoSeed(0);
    setClaimStory(false); setClaimSheet(null); setClaimDone(false); setDomBought(false);
    track("pick", { name: n.name, score: n.score, rank: (names || []).findIndex((x) => x.name === n.name) + 1 });
    toStep("claim");
    persist({ picked: n });
  }

  // The names list shows the latest batch on top (orange NEW tags): the same
  // display order feeds the mobile rows, the desktop grid and the ↑↓ keys.
  const displayNames = (): WName[] => {
    const all = names || [];
    const known = v2Known.current;
    if (!known) return all;
    return [...all.filter((n) => !known.includes(n.name)), ...all.filter((n) => known.includes(n.name))];
  };
  const selName = v2Sel ?? names?.[0]?.name ?? null;
  const continueWithSel = () => { const n = (names || []).find((x) => x.name === selName); if (n) pickName(n); };

  function markStep(k: keyof SavedSearch["steps"], v: "done" | "skipped", next: Step) {
    const ns = { ...steps, [k]: v };
    setSteps(ns);
    toStep(next);
    persist({ steps: ns });
  }

  // 05 Claim: the domain on the card — the board's selection once it loads,
  // else the verified-free domain the names list already showed.
  const claimDom: DomainCard | null =
    domSel ||
    (picked?.dom?.free ? { domain: picked.dom.domain, status: "available" as const, price: picked.dom.price } :
     picked?.alt ? { domain: picked.alt.domain, status: "available" as const, price: picked.alt.price } : null);

  // "Keep {Name}" claims the name + domain in the studio (no purchase): the
  // choice is saved, the funnel logs it, and the brand chapter opens.
  function keepName(to: Step = "reveal") {
    const d = claimDom;
    if (d) track("domain", { domain: d.domain, price: d.price || d.offerPrice || "" });
    const ns = { ...steps, domain: "done" as const };
    setSteps(ns);
    persist({ steps: ns, domain: d?.domain, domPrice: d?.price || d?.offerPrice || "" });
    setClaimSheet(null);
    toStep(to);
  }

  // 05·r → the registrar: just a link out, in a new tab. No cart, no verification.
  // This tab switches to 05·✓ so the founder lands back on "it's yours".
  function openRegistrar() {
    const d = claimDom;
    if (!d) return;
    window.open(d.offerUrl || registrarUrl(d.domain), "_blank", "noopener");
    track("godaddy", { domain: d.domain, price: d.price || d.offerPrice || "" });
    const ns = { ...steps, domain: "done" as const };
    setSteps(ns);
    persist({ steps: ns, domain: d.domain, domPrice: d.price || d.offerPrice || "" });
    setClaimSheet(null);
    setClaimDone(true);
  }

  async function downloadLogoPack() {
    if (!picked || !logoSel) return;
    const lp = tastePalette(taste);
    const pack = await buildLogoPack(picked.name, logoSel.key, logoSel.accent, logoSel.seed,
      [{ name: "Dawn", hex: lp.dawn }, { name: "Haze", hex: lp.haze }, { name: "Nova", hex: lp.nova }, { name: "Night", hex: lp.night }],
      logoSel.font, tasteShape(taste), logoSel.custom);
    download(pack.blob, pack.filename);
    track("logopack", { name: picked.name, concept: logoSel.title });
  }

  function share() {
    const nm = picked?.name || "My new name";
    const base = "https://namename.ai/";
    const text = `${nm}, found with Name Name`;
    let url = base;
    if (picked && !test) {
      // A public page for invitees: /s/<id> (best effort; falls back to the site).
      const id = `${picked.name.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Math.random().toString(36).slice(2, 6)}`;
      url = `${base}s/${id}`;
      const lp = tastePalette(taste);
      void sharePut(id, {
        name: picked.name,
        owner: user?.name?.split(" ")[0] || undefined,
        meaning: picked.parts?.length ? `${picked.parts[0].part[0].toUpperCase() + picked.parts[0].part.slice(1)}, ${picked.parts[0].note}${picked.parts[1] ? `, fused with ${picked.parts[1].part}, ${picked.parts[1].note}.` : "."} ${picked.tagline || ""}` : picked.tagline,
        plain: book?.saying?.plain,
        domain: steps.domain === "done" ? (domSel?.domain || picked.dom?.domain) : picked.dom?.free !== false ? picked.dom?.domain : undefined,
        domainFree: picked.dom?.free !== false,
        chips,
        palette: book?.palette || [{ name: "Dawn", hex: lp.dawn }, { name: "Haze", hex: lp.haze }, { name: "Nova", hex: lp.nova }, { name: "Night", hex: lp.night }],
        logo: logoSel ? { key: logoSel.key, accent: logoSel.accent, seed: logoSel.seed, font: logoSel.font, shape: tasteShape(taste), custom: logoSel.custom } : undefined,
      });
    }
    if (navigator.share) { navigator.share({ title: nm, text, url }).catch(() => {}); return; }
    navigator.clipboard?.writeText(`${text} · ${url}`).then(() => setShareMsg("Link copied, send it anywhere"));
  }

  function restart() {
    clearSnap();
    window.location.assign((import.meta as any).env.BASE_URL || "/");
  }

  const gotoAccount = () => window.location.assign(((import.meta as any).env.BASE_URL || "/") + "account");

  /* ── keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (bookOpen) return;
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && step === "names" && !typing && names?.length) {
        e.preventDefault();
        const list = displayNames();
        const cur = Math.max(0, list.findIndex((n) => n.name === selName));
        const next = Math.min(list.length - 1, Math.max(0, cur + (e.key === "ArrowDown" ? 1 : -1)));
        setV2Sel(list[next].name);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey && !typing) {
        if (step === "brief" && concept) { e.preventDefault(); toStep("brands"); }
        else if (step === "words" && starred.length) { e.preventDefault(); makeNames(); }
        else if (step === "names" && names?.length) { e.preventDefault(); continueWithSel(); }
        else if (step === "claim" && !claimSheet && !claimDone) { e.preventDefault(); keepName(); }
        else if (step === "reveal") { e.preventDefault(); toStep("brand"); }
        else if (step === "logodone") { e.preventDefault(); markStep("logo", "done", "book"); }
        else if (step === "book") { e.preventDefault(); markStep("book", "done", "socials"); }
        else if (step === "socials") { e.preventDefault(); markStep("socials", "done", "done"); track("done", { name: picked?.name }); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ── shared chrome ── */
  const chapter = CHAPTERS[step];

  const backTarget: Partial<Record<Step, Step>> = {
    brief: "land", refine: "brief", brands: "brief", brandsum: "brands", words: "brandsum", names: "words", claim: "names", reveal: "claim",
    brand: "reveal", feel: "brand", tcol: "feel", ttype: "tcol", tshape: "ttype", taste: "tshape",
    logo: "taste", logodone: "logo", pers: "logodone", book: "logodone", socials: "book",
  };
  // Forward mirrors back, but only where the run's data already allows the step.
  const fwdTarget = (): Step | null => {
    const t: Step | null =
      step === "brief" ? (conceptReady ? "brands" : null) :
      step === "refine" ? "brands" :
      step === "brands" ? "brandsum" :
      step === "brandsum" ? (conceptReady ? "words" : null) :
      step === "words" ? (names?.length ? "names" : null) :
      step === "names" ? (picked ? "claim" : null) :
      step === "claim" ? (steps.domain ? "reveal" : null) :
      step === "reveal" ? "brand" :
      step === "brand" ? "feel" :
      step === "feel" ? "tcol" :
      step === "tcol" ? "ttype" :
      step === "ttype" ? "tshape" :
      step === "tshape" ? "taste" :
      step === "taste" ? "logo" :
      step === "logo" ? (logoSel ? "logodone" : "book") :
      step === "pers" ? "book" :
      step === "logodone" ? "book" :
      step === "book" ? "socials" :
      step === "socials" ? "done" : null;
    return t;
  };

  const pal = book?.palette ? toPalette(book.palette) : tastePalette(taste);
  // Logos always wear the quiz picks directly (never a stale pre-taste book palette).
  const lpal = tastePalette(taste);
  const lshape = tasteShape(taste);
  const bookCtx: BookCtx | null = picked && book ? {
    name: picked.name,
    domain: domSel?.domain || picked.dom?.domain || `${picked.name.toLowerCase()}.com`,
    book, logoKey: logoSel?.key || "sunrise", logoAccent: logoSel?.accent || "dawn", logoSeed: logoSel?.seed ?? 0, logoFont: logoSel?.font, logoShape: lshape, logoCustom: logoSel?.custom,
  } : null;

  return (
    <div className="wr">
      {(step === "brief" || step === "reveal" || step === "done") && <div className="wr-glow" />}

      {/* shared header: logo left, chapter label centred, round ‹ › right */}
      {step !== "land" && <div className="wr-top">
        <button className="wr-brand" onClick={() => restart()}>
          <span className="bt">NAME NAME</span>
        </button>
        {chapter && <span className="wr-chapter">{chapter.label}</span>}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {step === "how" && <span className="wr-tab on" style={{ cursor: "default" }}>How it works</span>}
          {step === "done" && <span className="wr-count">done</span>}
          {chapter && <>
            <button className="wr-arr" onClick={() => backTarget[step] && toStep(backTarget[step]!)} aria-label="Back">‹</button>
            {fwdTarget()
              ? <button className="wr-arr" onClick={() => toStep(fwdTarget()!)} aria-label="Forward">›</button>
              : <span className="wr-arr dim">›</span>}
          </>}
        </span>
      </div>}

      {chapter && chapter.segs > 0 && step !== "brand" && (
        <div className="wr-prog">{Array.from({ length: chapter.segs }, (_, i) => <span key={i} className={i <= chapter.idx ? "on" : ""} />)}</div>
      )}

      {/* ═══ 00 landing ═══ */}
      {step === "land" && (
        <LandingKA
          sentence={sentence} setSentence={setSentence}
          onSubmit={startFromLanding}
          onHow={() => toStep("how")}
          onLogin={() => (user ? gotoAccount() : setSignupOpen(true))}
          loggedIn={!!user}
        />
      )}

      {/* ═══ 00b how it works ═══ */}
      {step === "how" && (
        <div className="wr-stage" style={{ paddingTop: 26 }}>
          <div className="wr-hiw">
            <h1 className="wr-h" style={{ textAlign: "center", margin: "10px 0 8px" }}>From one sentence to a name you own.</h1>
            <p className="wr-lead" style={{ textAlign: "center", color: "var(--text3)", marginBottom: 34 }}>Name → Domain → Brand · about five minutes.</p>
            <div className="row">
              <div className="hcard">
                <div className="hart">
                  <div className="minput">A calm coffee brand<i className="caret" /></div>
                  <div className="mchips"><span>Consumer</span><span>EU</span></div>
                </div>
                <p className="hn">01</p><h3>Describe it</h3><p className="hd">One sentence about what you're building.</p>
              </div>
              <span className="arr">→</span>
              <div className="hcard">
                <div className="hart" style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                  <p className="mfeel">It should feel like</p>
                  <span className="mpill">a slow morning</span>
                </div>
                <p className="hn">02</p><h3>We find the idea</h3><p className="hd">Your brief becomes one clear concept.</p>
              </div>
              <span className="arr">→</span>
              <div className="hcard">
                <div className="hart">
                  <div className="mwords">
                    <span className="on">★ dawn</span><span>brew</span>
                    <span className="on">★ hush</span><span>ember</span>
                    <span className="on">★ alba</span><span>drift</span>
                  </div>
                </div>
                <p className="hn">03</p><h3>Star words</h3><p className="hd">Keep the words that inspire you.</p>
              </div>
              <span className="arr">→</span>
              <div className="hcard">
                <div className="hart" style={{ justifyContent: "center" }}>
                  <div className="mname top"><b>Albora</b><span>96<small>/100</small></span></div>
                  <div className="mname"><b style={{ fontFamily: "var(--serif)", fontWeight: 500 }}>Hushly</b><span>88/100</span></div>
                </div>
                <p className="hn">04</p><h3>Pick a name</h3><p className="hd">Names scored against your brief.</p>
              </div>
              <span className="arr">→</span>
              <div className="hcard">
                <div className="hart">
                  <div className="mdom"><i /> albora.com</div>
                  <div className="mtiles">
                    <span className="t1"><svg width="13" height="13" viewBox="0 0 12 12"><path d="M 2 8.5 A 4 4 0 0 1 10 8.5 Z" fill="#000" /></svg></span>
                    <span className="t2">Aa</span>
                    <span className="t3">@</span>
                  </div>
                  <p className="mcap">Domain · logo · brand book · socials</p>
                </div>
                <p className="hn">05</p><h3>Own it</h3><p className="hd">Domain, logo, brand book, socials.</p>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", margin: "36px 0 30px" }}>
              <button className="wr-btn" style={{ maxWidth: 240, height: 54, borderRadius: 980 }} onClick={() => toStep("land")}>Start naming →</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 02 brief wrapped (01·l while it loads) ═══ */}
      {step === "brief" && (
        <>
          <div className="wr-stage center">
            <div className="inner-nar">
              {!conceptReady ? (
                fails.concept
                  ? <GenFail note="We couldn't read your brief just now." onRetry={() => retry("concept")} />
                  : <BriefLoader sentence={sentence.trim()} chips={chips} />
              ) : (
                <>
                  {/* 02, simplified: the concept in gradient italics, an orange
                      rule, and a two-line summary. Nothing else on the page. */}
                  <p className="wr-kicker rise" style={{ marginBottom: 14 }}>The idea we heard</p>
                  <h1 className="wr-h rise" style={{ marginBottom: 0 }}>
                    Your name should feel like <i className="wr-cgrad">{concept!.concept}</i>.
                  </h1>
                  <span className="wr-brule rise" />
                  <p className="wr-lead rise">{concept!.para}</p>
                </>
              )}
            </div>
          </div>
          <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
            <button className="wr-btn" style={{ maxWidth: 340 }} disabled={!conceptReady} onClick={() => toStep("brands")}>Show me the words →</button>
            <button className="wr-link" onClick={() => toStep("refine")}>Not quite? Rewrite the brief</button>
          </div>
        </>
      )}

      {/* ═══ 02·r check your brief (required) ═══ */}
      {step === "refine" && (
        <div className="wr-stage" style={{ paddingTop: 8 }}>
          <div className="wr-refine">
            {/* 02·r: the live headline updates as anything below changes */}
            <h1 className="wr-h" style={{ fontSize: 30, margin: "0 0 16px" }}>
              Your name should feel like <i className="wr-cgrad">{concept?.concept || "…"}</i>.
            </h1>
            <Grow value={sentence} onChange={setSentence} onEnter={() => conceptReady && toStep("brands")} placeholder="What are you building?" boxed />
            <div className="prows">
              <div className="prow">
                <span className="plbl">Feels like</span>
                <div className="opts">
                  {feelOpts.map((k) => (
                    <button key={k} className={"wr-opt" + (concept?.concept === k ? " on" : "")}
                      onClick={() => setConcept((c) => (c ? { ...c, concept: k } : c))}>{concept?.concept === k ? "✓ " : ""}{k}</button>
                  ))}
                  <AvoidAdd label="＋ add" onAdd={(w) => { setFeelOpts((f) => [...f.filter((x) => x !== w), w]); setConcept((c) => (c ? { ...c, concept: w } : c)); }} />
                </div>
              </div>
              <div className="prow">
                <span className="plbl">Tone</span>
                <div className="opts">
                  {["Friendly", "Balanced", "Serious", "Playful"].map((t) => {
                    const on = t === "Balanced" ? !prefs.tone.length : prefs.tone[0] === t;
                    return <button key={t} className={"wr-opt" + (on ? " on" : "")}
                      onClick={() => setPrefs({ ...prefs, tone: t === "Balanced" ? [] : [t] })}>{on ? "✓ " : ""}{t}</button>;
                  })}
                </div>
              </div>
              <div className="prow">
                <span className="plbl">Name style</span>
                <div className="opts">
                  {["Invented", "Real word", "Compound", "Any"].map((t) => {
                    const on = t === "Any" ? !prefs.style.length : prefs.style[0] === t;
                    return <button key={t} className={"wr-opt" + (on ? " on" : "")}
                      onClick={() => setPrefs({ ...prefs, style: t === "Any" ? [] : [t] })}>{on ? "✓ " : ""}{t}</button>;
                  })}
                </div>
              </div>
              <div className="prow">
                <span className="plbl">Length</span>
                <div className="opts">
                  {["Short · 1–2 syllables", "Medium", "Any"].map((t) => (
                    <button key={t} className={"wr-opt" + (prefs.length === t ? " on" : "")} onClick={() => setPrefs({ ...prefs, length: t })}>{prefs.length === t ? "✓ " : ""}{t}</button>
                  ))}
                </div>
              </div>
              <div className="prow">
                <span className="plbl">Must work in</span>
                <div className="opts">
                  <button className={"wr-opt" + (!prefs.langs.length ? " on" : "")}
                    onClick={() => setPrefs({ ...prefs, langs: [] })}>{!prefs.langs.length ? "✓ " : ""}Global</button>
                  {["French", "English", "Spanish", ...prefs.langs.filter((x) => !["French", "English", "Spanish"].includes(x))].map((t) => {
                    const on = prefs.langs.includes(t);
                    return <button key={t} className={"wr-opt" + (on ? " on" : "")}
                      onClick={() => setPrefs({ ...prefs, langs: on ? prefs.langs.filter((x) => x !== t) : [t] })}>{on ? "✓ " : ""}{t === "French" ? "FR" : t === "English" ? "EN" : t === "Spanish" ? "ES" : t}</button>;
                  })}
                  <AvoidAdd label="＋ add" onAdd={(w) => { if (!prefs.langs.includes(w)) setPrefs({ ...prefs, langs: [w] }); }} />
                </div>
              </div>
              <div className="prow">
                <span className="plbl">Domain</span>
                <div className="opts">
                  {["com", "ai", "io", "app"].map((d) => {
                    const on = prefs.doms[0] === d;
                    return (
                      <button key={d} className={"wr-opt" + (on ? " on" : "")}
                        onClick={() => { setPrefs({ ...prefs, doms: on ? [] : [d] }); setNames(null); namesPre.current = null; morePre.current = null; }}>
                        {on ? "✓ " : ""}.{d}
                      </button>
                    );
                  })}
                  <button className={"wr-opt" + (!prefs.doms.length ? " on" : "")}
                    onClick={() => { if (prefs.doms.length) { setPrefs({ ...prefs, doms: [] }); setNames(null); namesPre.current = null; morePre.current = null; } }}>
                    {!prefs.doms.length ? "✓ " : ""}Doesn't matter
                  </button>
                </div>
              </div>
              <div className="prow">
                <span className="plbl">Avoid</span>
                <div className="opts">
                  {prefs.avoid.map((w) => (
                    <button key={w} className="wr-opt on" onClick={() => setPrefs({ ...prefs, avoid: prefs.avoid.filter((x) => x !== w) })}>{w} ✕</button>
                  ))}
                  <AvoidAdd label="＋ add" onAdd={(w) => { if (!prefs.avoid.includes(w)) setPrefs({ ...prefs, avoid: [...prefs.avoid, w] }); }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {step === "refine" && (
        <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
          <button className="wr-btn" style={{ maxWidth: 320 }} disabled={!conceptReady}
            onClick={() => { if (wordsReq.current !== wordsKey()) { setStyles(null); setNames(null); namesPre.current = null; morePre.current = null; } toStep("brands"); }}>
            Show me the words →
          </button>
          <button className="wr-link" onClick={() => toStep("brief")}>← Back</button>
        </div>
      )}

      {/* ═══ 02·b brands you like (swipe) ═══ */}
      {step === "brands" && (
        <BrandSwipe
          deck={deck}
          onSkip={() => toStep("words")}
          liked={prefs.brandsLiked} disliked={prefs.brandsDisliked}
          onJudge={(name, like) => setPrefs((p) => ({
            ...p,
            brandsLiked: like ? [...p.brandsLiked.filter((x) => x !== name), name] : p.brandsLiked.filter((x) => x !== name),
            brandsDisliked: !like ? [...p.brandsDisliked.filter((x) => x !== name), name] : p.brandsDisliked.filter((x) => x !== name),
          }))}
          onNext={() => toStep(prefs.brandsLiked.length + prefs.brandsDisliked.length ? "brandsum" : "words")}
        />
      )}

      {/* ═══ 02·b·s your taste, summed up (after the last swipe) ═══ */}
      {step === "brandsum" && (
        <BrandTasteSummary
          liked={prefs.brandsLiked}
          disliked={prefs.brandsDisliked}
          axes={prefs.axes}
          onAxes={(a) => setPrefs((p) => ({ ...p, axes: a }))}
          onRemoveLiked={(name) => setPrefs((p) => ({ ...p, brandsLiked: p.brandsLiked.filter((x) => x !== name) }))}
          onRemoveDisliked={(name) => setPrefs((p) => ({ ...p, brandsDisliked: p.brandsDisliked.filter((x) => x !== name) }))}
          onAdd={(name) => setPrefs((p) => ({
            ...p,
            brandsLiked: [...p.brandsLiked.filter((x) => x.toLowerCase() !== name.toLowerCase()), name],
            brandsDisliked: p.brandsDisliked.filter((x) => x.toLowerCase() !== name.toLowerCase()),
          }))}
          onWords={() => { track("brandsum", { liked: prefs.brandsLiked.length, disliked: prefs.brandsDisliked.length, axes: prefs.axes || undefined }); toStep("words"); }}
          onAgain={() => { setDeck(drawDeck()); toStep("brands"); }}
        />
      )}


      {/* ═══ 02b refine the brief ═══ */}
      {/* ═══ 03 the words ═══ */}
      {step === "words" && isMobile && (
        <div className="wr-stage wr-v2stage" style={{ paddingTop: 16 }}>
          {!styles ? (
            fails.words || fails.concept
              ? <div style={{ margin: "40px 0" }}><GenFail note="We couldn't gather your words just now." onRetry={() => { retry("concept"); retry("words"); }} /></div>
              : <WordsLoader concept={concept?.concept || "your brief"} />
          ) : (
            <WordsCloudV2
              styles={styles}
              starred={starred}
              onToggle={starToggle}
              onContinue={continueWithWords}
            />
          )}
        </div>
      )}
      {step === "words" && !isMobile && (
        <>
          <div className="wr-stage" style={{ paddingTop: 16 }}>
            {styles && <>
              <h1 className="wr-h" style={{ marginBottom: 6 }}>Star the words that inspire you.</h1>
              <p className="wr-hint" style={{ marginBottom: 14 }}>
                {`${styles.reduce((a, s) => a + s.words.length, 0)} words · scroll`}
              </p>
            </>}
            {!styles ? (
              fails.words || fails.concept
                ? <div style={{ margin: "40px 0" }}><GenFail note="We couldn't gather your words just now." onRetry={() => { retry("concept"); retry("words"); }} /></div>
                : <WordsLoader concept={concept?.concept || "your brief"} />
            ) : (
              <>
                {/* 6 columns at every size (horizontal scroll when narrow) */}
                <div className="wr-wcols">
                  {styles.map((s) => (
                    <div className="col" key={s.name}>
                      <h4>{s.name}</h4>
                      {s.words.map((w) => <WordRow key={w.w} w={w} on={starred.some((x) => x.w === w.w)} onClick={() => starToggle(w)} />)}
                    </div>
                  ))}
                </div>
                <div className="wr-wmore">
                  {!test && !wordsMaxed && (
                    <button className="wr-btn2" disabled={moreWordsBusy} onClick={loadMoreWords}>
                      {moreWordsBusy ? "Mining more words…" : "↻ Show more words"}
                    </button>
                  )}
                  <button className="wr-link" onClick={() => toStep("refine")}>Not finding it? Redefine the brief</button>
                </div>
              </>
            )}
          </div>
          <div className="wr-foot col" style={{ gap: 10 }}>
            <div className="wr-starred">
              {starred.map((w) => <button key={w.w} className="wr-starpill" style={{ cursor: "pointer", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.28)" }} onClick={() => starToggle(w)}>{w.w}</button>)}
              {!starred.length && <span className="wr-hint">Tap a word to star it</span>}
            </div>
            <button className="wr-btn" disabled={!starred.length} onClick={() => makeNames()}>
              ✦ Turn my {starred.length || ""} word{starred.length === 1 ? "" : "s"} into names
            </button>
          </div>
        </>
      )}

      {/* ═══ 04 / 04b the names (V2 mobile: six compact rows, domain on each) ═══ */}
      {step === "names" && isMobile && (
        <>
          <div className="wr-stage wr-v2stage" style={{ paddingTop: 18 }}>
            {fails.names && !names?.length ? (
              <div style={{ margin: "34px 0" }}><GenFail note="The studio couldn't coin your names just now." onRetry={() => makeNames()} /></div>
            ) : namesBusy && !names?.length ? (
              <NamingWait coined={namesProg} starred={starred} />
            ) : (
              <NamesListV2
                names={names || []}
                known={v2Known.current}
                sel={v2Sel ?? names?.[0]?.name ?? null}
                onSel={setV2Sel}
              />
            )}
          </div>
          {!!names?.length && !namesBusy && (
            <div className="wr-foot wr-v2nbar">
              <button className="more" disabled={moreBusy} onClick={moreNames}>
                {moreBusy ? "↻ …" : fails.more ? "↻ Try again" : v2Known.current ? "↻ More" : "↻ 6 more"}
              </button>
              <button className="go" onClick={continueWithSel}>
                Continue with {selName || "…"} →
              </button>
            </div>
          )}
        </>
      )}
      {step === "names" && !isMobile && (
        <>
          <div className="wr-stage" style={{ paddingTop: 18, paddingBottom: 8 }}>
            <div className="wr-nameswrap">
              {fails.names && !names?.length ? (
                <div style={{ margin: "34px 0" }}><GenFail note="The studio couldn't coin your names just now." onRetry={makeNames} /></div>
              ) : namesBusy && !names?.length ? (
                <NamingWait coined={namesProg} starred={starred} />
              ) : (
                <NamesGridV2
                  names={names || []}
                  known={v2Known.current}
                  sel={selName}
                  onSel={setV2Sel}
                />
              )}
            </div>
          </div>
          {!!names?.length && !namesBusy && (
            <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
              <span style={{ display: "inline-flex", gap: 10 }}>
                <button className="wr-btn2" disabled={moreBusy} onClick={moreNames}>{moreBusy ? "↻ …" : fails.more ? "↻ Try again" : "↻ More"}</button>
                <button className="wr-btn" style={{ maxWidth: 340 }} onClick={continueWithSel}>Continue with {selName || "…"} <i className="kbd">⏎</i></button>
              </span>
              <span className="wr-hint">↑ ↓ to browse · Continue opens the claim</span>
            </div>
          )}
        </>
      )}

      {/* ═══ 05 Claim — keep the name, buy the domain at the end (ex reveal + domain) ═══ */}
      {step === "claim" && picked && claimDone && (
        <>
          <div className="wr-stage center wr-claimdone" style={{ textAlign: "center", alignItems: "center" }}>
            <span className="okball pop">✓</span>
            <h1 className="wr-h pop" style={{ fontSize: 42, marginBottom: 8 }}>{picked.name} is yours.</h1>
            <p className="mono" style={{ color: "var(--text3)", letterSpacing: "0.04em" }}>{claimDom?.domain}</p>
            <p className="wr-lead rise" style={{ maxWidth: 330, margin: "14px auto 0" }}>You can finish your purchase whenever you're ready.</p>
          </div>
          <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
            <button className="wr-btn" style={{ maxWidth: 320 }} onClick={() => toStep("reveal")}>Now, your brand →</button>
            <p className="wr-hint">Logo · colours · type · brand book</p>
          </div>
        </>
      )}
      {step === "claim" && picked && !claimDone && (
        <>
          <div className="wr-stage wr-claimstage">
            <div className="wr-claim">
              <div className="cl rise">
                <p className="wr-kicker" style={{ marginBottom: 10 }}>Your name</p>
                <h1 className="cname pop">{picked.name}</h1>
                <p className="pron mono">
                  {book?.saying?.syllables?.length ? book.saying.syllables.map((s) => (s.stress ? s.s.toUpperCase() : s.s.toLowerCase())).join(" · ") + "  ·  " : ""}
                  {picked.score}% fit with your brief
                </p>
                <p className="story">
                  {picked.parts?.[0] && <>{picked.parts[0].part[0].toUpperCase() + picked.parts[0].part.slice(1)}, {picked.parts[0].note}{picked.parts[1] ? <>, fused with <i>{picked.parts[1].part}</i>, {picked.parts[1].note}.</> : "."}</>}
                  {" "}{picked.tagline}
                </p>
                {!claimStory ? (
                  <button className="wr-link fold" onClick={() => setClaimStory(true)}>Read the story ↓</button>
                ) : (
                  <>
                    <div className="sgrid rise">
                      <div>
                        <i className="mono">Roots</i>
                        <p>{(picked.parts || []).map((p, i) => <Fragment key={p.part}>{i > 0 && " "}<b>{p.part[0].toUpperCase() + p.part.slice(1)}</b>{`: ${p.note}.`}</Fragment>)}</p>
                      </div>
                      <div>
                        <i className="mono">Why it fits</i>
                        <p>Your brief is about {concept?.concept || "what you're building"}. {picked.name} says it in {book?.saying?.syllables?.length || picked.name.split(/[^a-z]/i).length || "a few"} soft syllables.</p>
                      </div>
                      {!!book?.saying?.world?.length && (
                        <div>
                          <i className="mono">Travels well</i>
                          <p>Easy to say in {book.saying.world.slice(0, 4).map((w) => w.language).join(", ")}. No unwanted meanings found.</p>
                        </div>
                      )}
                    </div>
                    <button className="wr-link fold" onClick={() => setClaimStory(false)}>Show less ↑</button>
                  </>
                )}
              </div>
              <div className="cr rise">
                <div className="dcard">
                  <p className="k mono">Its domain</p>
                  <div className="drow">
                    <i className="dot" />
                    <span className="d mono">{claimDom?.domain || "checking…"}</span>
                    {(claimDom?.price || claimDom?.offerPrice) && <span className="pr mono">{claimDom.price || claimDom.offerPrice}<em>/yr</em></span>}
                  </div>
                  <div className="drow2">
                    <span className="was">Was free when we searched</span>
                    {(() => {
                      const others = domRows.filter((d) => d.domain !== claimDom?.domain).map((d) => d.tld || "." + d.domain.split(".").pop());
                      const uniq = Array.from(new Set(others)).slice(0, 3);
                      return uniq.length ? (
                        <button className={"tldpill mono" + (claimSheet === "tld" ? " prs" : "")} onClick={() => setClaimSheet(claimSheet === "tld" ? null : "tld")}>
                          Or {uniq.join(" ")} ›
                        </button>
                      ) : null;
                    })()}
                  </div>
                  {claimSheet === "tld" && (
                    <DomEndingsSheet
                      name={picked.name}
                      rows={domRows.slice(0, 5)}
                      current={claimDom?.domain || ""}
                      bestIdx={bestDomIdx}
                      onUse={(d) => { setDomSel(d); setClaimSheet(null); }}
                      onClose={() => setClaimSheet(null)}
                    />
                  )}
                </div>
                <button className="wr-btnor" onClick={() => keepName()}>Keep {picked.name}, build the brand →</button>
                <button className="wr-link golink" onClick={() => setClaimSheet("go")}>Buy {claimDom?.domain || "it"} now ↗</button>
              </div>
            </div>
          </div>
          {/* no footer links here: the top bar's ‹ goes back, the space is the
              claim's (desktop keeps the ⏎ hint) */}
          <div className="wr-foot col claimfoot" style={{ gap: 4, alignItems: "center" }}>
            <span className="wr-hint khint"><i className="kbd">⏎</i> to keep {picked.name}</span>
          </div>
          {claimSheet === "go" && claimDom && (
            <RegistrarSheet
              domain={claimDom.domain}
              price={claimDom.price || claimDom.offerPrice || ""}
              onOpen={openRegistrar}
              onLater={() => keepName()}
              onClose={() => setClaimSheet(null)}
            />
          )}
        </>
      )}

      {/* ═══ 05·v the reveal — name and domain claimed, brand next ═══ */}
      {step === "reveal" && picked && (
        <>
          <div className="wr-stage center">
            <div className="wr-revcols">
              <div className="left rise">
                <p className="wr-kicker" style={{ marginBottom: 14 }}>Your name</p>
                <h1 className="wr-bigname pop" style={{ textAlign: "left" }}>{picked.name}</h1>
                <p className="meaning">
                  {picked.parts?.[0] && <>{picked.parts[0].part[0].toUpperCase() + picked.parts[0].part.slice(1)}, {picked.parts[0].note}{picked.parts[1] ? <>, fused with <i>{picked.parts[1].part}</i>, {picked.parts[1].note}.</> : "."}</>}
                </p>
              </div>
              <div className="right rise">
                <p className="tri">Name and domain, done. <i>Now the brand.</i></p>
                <div className="rrow one">
                  <span className="i ok">✓</span>
                  <span className="mid"><span className="hl"><b>Name</b><small>You've got it. Congrats!</small></span></span>
                  <span className="nm2">{picked.name}</span>
                </div>
                <div className="rrow one">
                  <span className="i ok">✓</span>
                  <span className="mid"><span className="hl"><b>Domain</b><small>Claimed. It's yours.</small></span></span>
                  <span className="nm2 mono">{domSel?.domain || picked.dom?.domain}</span>
                </div>
                <button className="rrow lead" onClick={() => toStep("brand")}>
                  <span className="i">3</span>
                  <span className="mid">
                    <span className="hl"><b>Brand</b><small className="right">Built from your taste</small></span>
                    <span className="minis">
                      <span className="mini"><i className="mv" dangerouslySetInnerHTML={{ __html: logoSvg("sunrise", picked.name, pal, { variant: "tile", accent: "dawn", height: 20 }) }} /><em>Logo</em></span>
                      <span className="mini"><i className="mv aa">Aa</i><em>Font</em></span>
                      <span className="mini"><i className="mv sws"><b style={{ background: pal.dawn }} /><b style={{ background: pal.haze }} /><b style={{ background: pal.nova }} /></i><em>Colours</em></span>
                      <span className="mini"><i className="mv pg" /><em>Brand book</em></span>
                      <span className="mini"><i className="mv at">@</i><em>Socials</em></span>
                    </span>
                  </span>
                  <span className="ar">→</span>
                </button>
              </div>
            </div>
          </div>
          <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
            <button className="wr-btn" style={{ maxWidth: 340 }} onClick={() => toStep("brand")}>Build my brand →</button>
            <button className="wr-link" onClick={() => toStep("names")}>← Back to the names</button>
          </div>
        </>
      )}

      {/* ═══ Chapter 3 · Brand — opener ═══ */}
      {step === "brand" && picked && (
        <>
          <div className="wr-stage center" style={{ textAlign: "center", alignItems: "center" }}>
            <h1 className="wr-h pop" style={{ fontSize: 58, marginBottom: 14 }}>Now, your brand.</h1>
            <p className="wr-lead rise" style={{ marginBottom: 30 }}>A minute of swiping, and we build the rest.</p>
            <button className="wr-btn rise" style={{ maxWidth: 200 }} onClick={() => toStep("feel")}>Start →</button>
            <button className="wr-link rise" style={{ marginTop: 10 }} onClick={() => { track("brandlater", { name: picked.name }); toStep("done"); }}>Do it later</button>
          </div>
        </>
      )}

      {/* ═══ Brand · taste pickers (Feeling / Colours / Type / Shape) ═══ */}
      {(step === "feel" || step === "tcol" || step === "ttype" || step === "tshape") && picked && (
        <TastePicker
          step={step} name={picked.name} taste={taste}
          onChange={(t) => setTaste(t)}
          onBack={() => toStep(backTarget[step]!)}
          onNext={() => toStep(fwdTarget() || "taste")}
        />
      )}

      {/* ═══ Brand · your taste (recap + sliders) ═══ */}
      {step === "taste" && picked && (
        <>
          <div className="wr-stage center">
            <div className="inner-nar wr-owncols">
              <div>
                <p className="wr-kicker" style={{ marginBottom: 10 }}>Your taste</p>
                <h1 className="wr-h" style={{ fontSize: 36, marginBottom: 18 }}>{tasteLine(taste)}</h1>
                <div className="wr-tasteband">
                  {[tastePalette(taste).dawn, tastePalette(taste).haze, tastePalette(taste).nova, tastePalette(taste).night].map((c) => <i key={c} style={{ background: c }} />)}
                  <span className="aa" style={{ fontFamily: tasteFont(taste) === "serif" ? "var(--bookserif)" : "var(--sans)" }}>Aa</span>
                </div>
                <button className="wr-link" style={{ marginTop: 16, paddingLeft: 0 }} onClick={() => toStep("feel")}>↻ Swipe again</button>

              </div>
              <div>
                <p className="wr-kicker" style={{ marginBottom: 14 }}>Your profile</p>
                {([["Calm", "Energetic", "ce"], ["Warm", "Cool", "wc"], ["Round", "Sharp", "rs"], ["Serif", "Sans", "ss"], ["Minimal", "Bold", "mb"]] as const).map(([l, r, k]) => (
                  <div className="wr-slider ro" key={k}>
                    <span>{l}</span>
                    <span className="bar"><i style={{ width: `${Math.max(6, taste.sliders[k])}%` }} /></span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
            <button className="wr-btn" style={{ maxWidth: 260 }} onClick={() => { track("taste", { name: picked.name, ...taste }); refreshBookForTaste(taste); toStep("logo"); }}>Show me my logos →</button>
            <button className="wr-link" onClick={() => toStep("tshape")}>← Back</button>
          </div>
        </>
      )}

      {/* ═══ Brand · logos (nine, made from the taste) ═══ */}
      {step === "logo" && picked && (
        <>
          <div className="wr-stage" style={{ paddingTop: 20 }}>
            <div className="wr-lwrap">
              <div className="lhead">
                <div>
                  <p className="wr-kicker" style={{ marginBottom: 8 }}>Made from your taste</p>
                  <h1 className="wr-h" style={{ fontSize: 34, margin: 0 }}>Nine logos, made for {picked.name}.</h1>
                </div>
                <button className="wr-link" style={{ whiteSpace: "nowrap" }} onClick={() => setLogoSeed((x) => x + 1)}>↻ Show nine more</button>
              </div>
              <div className="wr-lgrid">
                {BRAND_TILES.map((t, i) => ({ key: t.key, title: t.title, accent: (["dawn", "haze", "nova"] as const)[(i + logoSeed) % 3], seed: logoSeed, font: tasteFont(taste), shape: lshape }))
                  .map((c) => {
                    const on = logoSel?.key === c.key && logoSel?.seed === c.seed && logoSel?.accent === c.accent;
                    return (
                      <button key={c.key + c.seed + c.accent} className={"wr-ltile" + (on ? " sel" : "")} onClick={() => setLogoSel(on ? null : c)}>
                        {on && <span className="ck">✓</span>}
                        <span className="lt" dangerouslySetInnerHTML={{ __html: logoSvg(c.key, picked.name, lpal, { variant: c.key === "appicon" ? "icon" : "tile", accent: c.accent, seed: c.seed, font: c.font, shape: lshape, height: 96 }) }} />
                        <span className="ln">{c.title}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
          <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
            <button className="wr-btn" style={{ maxWidth: 260 }} disabled={!logoSel} onClick={() => { track("logo", { name: picked.name, concept: logoSel?.title }); toStep("logodone"); }}>
              Use {logoSel?.title?.replace(/ \d+$/, "") || "this"} →
            </button>
            <span className="urow">
              <button className="wr-link" onClick={() => toStep("taste")}>← My taste</button>
              <button className="wr-link" onClick={() => markStep("logo", "skipped", "book")}>Skip the logo</button>
            </span>
          </div>
        </>
      )}

      {/* ═══ 06c your logo ═══ */}
      {step === "logodone" && picked && logoSel && (
        <>
          <div className="wr-stage" style={{ paddingTop: 18, paddingBottom: 10 }}>
            <div className="wr-lwrap wr-ldet">
              <div className="ldl">
                <p className="wr-kicker" style={{ marginBottom: 12 }}>{logoSel.title} · primary</p>
                <div className="wr-lhero" dangerouslySetInnerHTML={{ __html: logoSvg(logoSel.key, picked.name, lpal, { variant: logoSel.key === "appicon" ? "icon" : "light", accent: logoSel.accent, seed: logoSel.seed, font: logoSel.font, shape: lshape, custom: logoSel.custom, height: 120 }) }} />
                <button className="wr-btn2" style={{ margin: "14px 0 0", width: "100%" }} onClick={() => { setPersDraft(draftFromSel()); toStep("pers"); }}>✎ Personalize this logo</button>
                <p className="wr-lead" style={{ margin: "18px 0 0" }}>
                  {logoSel.key === "custom"
                    ? <><b style={{ color: "#fff" }}>Yours, exactly.</b> Tuned by hand on the personalize page: your symbol, your colour, your face.</>
                    : <><b style={{ color: "#fff" }}>Why it works.</b> {whyItWorks(logoSel.key, picked.name, concept?.concept || "")}</>}
                </p>
              </div>
              <div className="ldr">
                <div className="ldhead">
                  <p className="wr-kicker" style={{ margin: 0 }}>Every version</p>
                  <button className="wr-btn2" onClick={downloadLogoPack}>↓ Download logo pack · SVG · PNG</button>
                </div>
                <div className="wr-lvers">
                  {([["light", "Primary · on light", "#fff"], ["night", "Reversed · on night", lpal.night], ["dawn", "On the Dawn gradient", "transparent"], ["mono", "Horizontal · one colour", "#f1efe9"]] as const).map(([v, label, bg]) => (
                    <div key={v} className="wr-lver">
                      <div className="vv" style={{ background: bg === "transparent" ? "var(--surface3)" : bg }}
                        dangerouslySetInnerHTML={{ __html: logoSvg(logoSel.key, picked.name, lpal, { variant: v, accent: logoSel.accent, seed: logoSel.seed, font: logoSel.font, shape: lshape, custom: logoSel.custom, height: 46 }) }} />
                      <div className="vl">{label}</div>
                    </div>
                  ))}
                  <div className="wr-lver">
                    <div className="vv" style={{ background: "var(--surface3)" }}
                      dangerouslySetInnerHTML={{ __html: logoSvg("appicon", picked.name, lpal, { variant: "icon", accent: logoSel.accent, seed: logoSel.seed, shape: lshape, height: 56 }) }} />
                    <div className="vl">App icon</div>
                  </div>
                  <div className="wr-lver">
                    <div className="vv" style={{ background: "var(--surface3)", gap: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span dangerouslySetInnerHTML={{ __html: logoSvg("appicon", picked.name, lpal, { variant: "icon", accent: logoSel.accent, seed: logoSel.seed, shape: lshape, height: 32 }) }} />
                      <span dangerouslySetInnerHTML={{ __html: logoSvg("appicon", picked.name, lpal, { variant: "icon", accent: logoSel.accent, seed: logoSel.seed, shape: lshape, height: 16 }) }} />
                    </div>
                    <div className="vl">Favicon · 32 & 16 px</div>
                  </div>
                </div>
                <div className="wr-specs" style={{ marginTop: 18 }}>
                  <div className="wr-spec"><b>Colours</b>
                    <span className="wr-swatches">
                      {[{ name: "Dawn", hex: lpal.dawn }, { name: "Haze", hex: lpal.haze }, { name: "Nova", hex: lpal.nova }, { name: "Night", hex: lpal.night }].map((c) => (
                        <span key={c.name} className="wr-swatch"><i style={{ background: c.hex }} />{c.name}</span>
                      ))}
                    </span>
                  </div>
                  <div className="wr-spec"><b>Minimum size</b><span>24 px high on screen · 8 mm in print</span></div>
                  <div className="wr-spec"><b>Don't</b><span>Stretch it, recolour the sun, or add effects</span></div>
                </div>
              </div>
            </div>
          </div>
          <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
            <button className="wr-btn" style={{ maxWidth: 300 }} onClick={() => markStep("logo", "done", "book")}>Next: Brand book →</button>
            <button className="wr-link" onClick={() => toStep("logo")}>← Back to logos</button>
          </div>
        </>
      )}

      {/* ═══ 06f·b personalize the logo ═══ */}
      {step === "pers" && picked && persDraft && (
        <>
          <div className="wr-stage" style={{ paddingTop: 18 }}>
            <div className="wr-lwrap wr-pers">
              <div className="pl">
                <div className="phead">
                  <p className="wr-kicker" style={{ margin: 0 }}>Live preview</p>
                  {(() => {
                    const base = draftFromSel();
                    const n = (["symbol", "layout", "accentHex", "font", "scale", "family", "sseed"] as const).filter((k) => ((persDraft as any)[k] || undefined) !== ((base as any)[k] || undefined)).length;
                    return n ? <span className="edits">Edited · {n} change{n > 1 ? "s" : ""}</span> : null;
                  })()}
                </div>
                <div className="hero" dangerouslySetInnerHTML={{ __html: logoSvg("custom", picked.name, lpal, { variant: "light", font: persDraft.font, custom: persDraft, height: 150 }) }} />
                <div className="minis">
                  <span className="m night" dangerouslySetInnerHTML={{ __html: logoSvg("custom", picked.name, lpal, { variant: "night", font: persDraft.font, custom: persDraft, height: 36 }) }} />
                  <span className="m dawn" dangerouslySetInnerHTML={{ __html: logoSvg("custom", picked.name, lpal, { variant: "dawn", font: persDraft.font, custom: persDraft, height: 36 }) }} />
                  <span className="m night" dangerouslySetInnerHTML={{ __html: logoSvg("custom", picked.name, lpal, { variant: "night", font: persDraft.font, custom: { ...persDraft, layout: "symbol" }, height: 44 }) }} />
                </div>
                <p className="wr-hint" style={{ marginTop: 10 }}>Every version updates with your changes.</p>
              </div>
              <div className="pr">
                <div className="plabrow">
                  <p className="plab">Symbol</p>
                  {persDraft.symbol !== "none" && (
                    <button className="pmini" onClick={() => setPersDraft({ ...persDraft, sseed: (persDraft.sseed || 0) + 1 })}>↻ More</button>
                  )}
                </div>
                <div className="symgrid">
                  {PERS_SYMBOLS.map(({ k, l }) => (
                    <button key={k} className={persDraft.symbol === k ? "on" : ""} onClick={() => setPersDraft({ ...persDraft, symbol: k })}>
                      <SymIcon k={k} /><em>{l}</em>
                    </button>
                  ))}
                </div>
                <p className="plab">Colour</p>
                <div className="sw">
                  {([["Dawn", lpal.dawn], ["Haze", lpal.haze], ["Nova", lpal.nova], ["Mint", "#3ddc84"], ["White", "#ffffff"]] as const).map(([l, hex]) => (
                    <button key={l} className={persDraft.accentHex === hex ? "on" : ""} onClick={() => setPersDraft({ ...persDraft, accentHex: hex })}>
                      <i style={{ background: hex }} /><em>{l}</em>
                    </button>
                  ))}
                  {(() => {
                    const preset = [lpal.dawn, lpal.haze, lpal.nova, "#3ddc84", "#ffffff"];
                    const customOn = !preset.includes(persDraft.accentHex);
                    return (
                      <label className={"swcustom" + (customOn ? " on" : "")}>
                        <i style={customOn ? { background: persDraft.accentHex } : undefined}>{customOn ? "" : "+"}</i><em>Custom</em>
                        <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(persDraft.accentHex) ? persDraft.accentHex : "#ff4f1a"} onChange={(e) => setPersDraft({ ...persDraft, accentHex: e.target.value })} />
                      </label>
                    );
                  })()}
                </div>
                <p className="plab">Typeface</p>
                <div className="seg">
                  {([["bold", "Bold"], ["serif", "Serif"], ["light", "Light"]] as const).map(([v, l]) => (
                    <button key={v} className={persDraft.font === v && !persDraft.family ? "on" : ""} onClick={() => { setPersFontsOpen(false); setPersDraft({ ...persDraft, font: v, family: undefined, famWeight: undefined }); }}>
                      <span style={{ fontFamily: v === "serif" ? "var(--bookserif)" : v === "light" ? "var(--mono)" : "var(--sans)", fontWeight: v === "bold" ? 800 : 500 }}>Aa</span> {l}
                    </button>
                  ))}
                  <button className={persDraft.family ? "on" : ""} onClick={() => { const nx = !persFontsOpen; setPersFontsOpen(nx); if (nx) ensureFonts(PERS_FONTS.map(({ f, w }) => ({ family: f, weight: w }))); }}>
                    {persDraft.family || "More fonts"} <span style={{ opacity: 0.6 }}>{persFontsOpen ? "▴" : "▾"}</span>
                  </button>
                </div>
                {persFontsOpen && (() => {
                  const dd = (
                  <div className="fontdd">
                    <input autoFocus value={persFontQ} onChange={(e) => setPersFontQ(e.target.value)} placeholder="⌕  Search fonts" />
                    <div className="list">
                      {PERS_FONTS.filter(({ f, cat }) => !persFontQ.trim() || (f + " " + cat).toLowerCase().includes(persFontQ.trim().toLowerCase())).map(({ f, w, cat }) => (
                        <button key={f} className={persDraft.family === f ? "on" : ""} onClick={() => {
                          ensureFonts([{ family: f, weight: w }]);
                          setPersDraft({ ...persDraft, family: f, famWeight: w, font: persFontCat(cat) });
                          setPersFontsOpen(false); setPersFontQ("");
                        }}>
                          <span style={{ fontFamily: `'${f}', var(--sans)`, fontWeight: w }}>{f}</span>
                          {persDraft.family === f ? <b>✓</b> : <em>{cat}</em>}
                        </button>
                      ))}
                    </div>
                    <button className="ddclose" onClick={() => setPersFontsOpen(false)}>Done</button>
                  </div>
                  );
                  // On phones the catalogue is a bottom sheet over everything:
                  // portaled to <body>, because the stage's fade animation makes
                  // a stacking context that trapped the sheet UNDER the footer.
                  return isMobile
                    ? createPortal(
                        <div className="wr-pers" style={{ display: "contents" }}>
                          <div className="fontddim" onClick={() => setPersFontsOpen(false)} />
                          {dd}
                        </div>,
                        document.body)
                    : dd;
                })()}
                <p className="plab">Layout</p>
                <div className="seg">
                  {([["stacked", "Stacked"], ["side", "Side by side"], ["symbol", "Symbol only"]] as const).map(([v, l]) => (
                    <button key={v} className={persDraft.layout === v ? "on" : ""} onClick={() => setPersDraft({ ...persDraft, layout: v })}>{l}</button>
                  ))}
                </div>
                <p className="plab">Or just ask</p>
                <form className="ask" onSubmit={async (e) => {
                  e.preventDefault();
                  if (!persAsk.trim() || persBusy) return;
                  setPersBusy(true);
                  const r = await logoTweak(persDraft, persAsk.trim());
                  setPersBusy(false);
                  if (r && typeof r === "object") {
                    setPersDraft({
                      ...persDraft,
                      symbol: (["half", "full", "ring", "horizon", "rays", "arc", "monogram", "none"].includes(String(r.symbol)) ? r.symbol : persDraft.symbol) as any,
                      layout: (["stacked", "side", "symbol"].includes(String(r.layout)) ? r.layout : persDraft.layout) as any,
                      accentHex: /^#[0-9a-fA-F]{3,8}$/.test(String(r.accentHex)) ? String(r.accentHex) : persDraft.accentHex,
                      font: (["bold", "serif", "light"].includes(String(r.font)) ? r.font : persDraft.font) as any,
                      scale: Math.max(0.5, Math.min(1.6, Number(r.scale) || persDraft.scale)),
                    });
                    setPersAsk("");
                  }
                }}>
                  <input value={persAsk} onChange={(e) => setPersAsk(e.target.value)} placeholder="Make the circle a little smaller" />
                  <button type="submit" disabled={persBusy}>{persBusy ? "…" : "↑"}</button>
                </form>
              </div>
            </div>
          </div>
          <div className="wr-foot col persfoot" style={{ gap: 8, alignItems: "center" }}>
            <button className="wr-btn" style={{ maxWidth: 280 }} onClick={() => {
              setLogoSel({ key: "custom", title: "Custom", accent: "dawn", seed: 0, font: persDraft.font, custom: { symbol: persDraft.symbol, layout: persDraft.layout, accentHex: persDraft.accentHex, scale: persDraft.scale, family: persDraft.family, famWeight: persDraft.famWeight, sseed: persDraft.sseed } });
              track("logopers", { name: picked.name, ...persDraft });
              toStep("logodone");
            }}>Save as my logo ✓</button>
            <span className="urow">
              <button className="wr-link" onClick={() => toStep("logodone")}>← Back</button>
              <button className="wr-link" onClick={() => setPersDraft(draftFromSel())}>↻ Reset to original</button>
            </span>
          </div>
        </>
      )}

      {/* ═══ 07 brand book ═══ */}
      {step === "book" && picked && (
        <>
          <div className="wr-stage center">
            <div className="inner-nar wr-owncols">
              <div>
                <p className="wr-kicker" style={{ marginBottom: 8 }}>Brand book {book ? "· ready" : ""}</p>
                <h1 className="wr-h" style={{ marginBottom: 10 }}>{picked.name}, ready for you.</h1>
                <p className="wr-lead" style={{ marginBottom: 20, maxWidth: 440 }}>
                  The story and meaning of the name, your {logoSel?.title || "chosen"} logo in every version, the colours, type and voice.
                  Hand it to a designer and they can start the same day.
                </p>
                {!book ? (
                  fails.book
                    ? <GenFail note={`We couldn't write ${picked.name}'s brand book just now.`} onRetry={() => retry("book")} />
                    : <div className="wr-load"><span className="wr-spin" /> Writing {picked.name}'s brand book…</div>
                ) : (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="wr-btn" style={{ maxWidth: 200 }} onClick={() => { void import("./Book").then((m) => m.printBook(`${picked.name} - Brand book`)); track("book", { name: picked.name }); }}>↓ PDF</button>
                    <button className="wr-btn2" onClick={() => { if (bookCtx) void import("./Book").then((m) => m.exportBookWord(bookCtx)); track("book", { name: picked.name, format: "word" }); }}>↓ Word</button>
                    <button className="wr-btn2" onClick={() => { setBookOpen(true); track("bookpreview", { name: picked.name }); }}>Preview</button>
                  </div>
                )}
              </div>
              {bookCtx && (
                <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 18 }}>
                  <div onClick={() => setBookOpen(true)} style={{ cursor: "pointer" }}><Suspense fallback={null}><ScaledPage i={0} ctx={bookCtx} width={150} /></Suspense></div>
                  <div onClick={() => setBookOpen(true)} style={{ cursor: "pointer", transform: "translateY(16px)" }}><Suspense fallback={null}><ScaledPage i={6} ctx={bookCtx} width={150} /></Suspense></div>
                </div>
              )}
            </div>
          </div>
          <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
            <button className="wr-btn" style={{ maxWidth: 320 }} onClick={() => markStep("book", "done", "socials")}>Next: Social accounts →</button>
            <button className="wr-link" onClick={() => toStep(logoSel ? "logodone" : "logo")}>← Logo</button>
          </div>
        </>
      )}

      {/* ═══ 08 socials ═══ */}
      {step === "socials" && picked && (
        <>
          <div className="wr-stage center">
            <div className="inner-nar">
              <p className="wr-kicker" style={{ marginBottom: 8 }}>One name everywhere</p>
              <h1 className="wr-h" style={{ marginBottom: 8 }}>Set up {picked.name}'s socials.</h1>
              <p className="wr-lead" style={{ marginBottom: 14 }}>
                Each link opens the sign-up page in a new tab. Try <b style={{ color: "#fff" }}>@{picked.name.toLowerCase()}</b> first.
              </p>
              <div className="wr-socials">
                {SOCIALS.map((s) => (
                  <div key={s.name} className="wr-soc">
                    <span className="ic"><SocialIcon name={s.name} /></span>
                    <span><span className="tt" style={{ display: "block" }}>{s.name}</span><span className="ss">{s.desc}</span></span>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" onClick={() => track("social", { network: s.name, name: picked.name })}>Create ↗</a>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
            <button className="wr-btn" style={{ maxWidth: 300 }} onClick={() => { track("done", { name: picked.name }); markStep("socials", "done", "done"); }}>Finish →</button>
            <button className="wr-link" onClick={() => { track("done", { name: picked.name }); markStep("socials", "skipped", "done"); }}>Skip for now</button>
          </div>
        </>
      )}

      {/* ═══ 09 all set ═══ */}
      {step === "done" && picked && (
        <>
          <div className="wr-stage center" style={{ textAlign: "center" }}>
            <div style={{ position: "relative", zIndex: 2 }}>
              <p className="wr-kicker rise" style={{ marginBottom: 16 }}>It's yours</p>
              <h1 className="wr-bigname pop" style={{ marginBottom: 26 }}>{picked.name}</h1>
              {(() => {
                const dm = domSel?.domain || picked.dom?.domain || "";
                const namePill = <span className="pill" key="n"><i className="ok">✓</i> Name <b>{picked.name}</b></span>;
                const brandPill = <span className="pill" key="b"><i className={logoSel || steps.book === "done" || steps.socials === "done" ? "ok" : "no"}>{logoSel || steps.book === "done" || steps.socials === "done" ? "✓" : "·"}</i> Brand <b>logo · book · socials</b></span>;
                // The domain is the one OPEN step until the founder buys it on
                // the registrar (and tells us so — we never verify).
                const domPill = domBought || !dm ? (
                  <span className="pill" key="d"><i className={steps.domain === "done" ? "ok" : "no"}>{steps.domain === "done" ? "✓" : "·"}</i> Domain <b>{dm || "later"}</b></span>
                ) : (
                  <span className="pill last" key="d">
                    <i className="ring" /> Domain · last step <b className="mono">{dm} · not bought yet</b>
                    <button className="gd" onClick={() => { window.open(registrarUrl(dm), "_blank", "noopener"); track("godaddy", { domain: dm, from: "done" }); }}>Buy ↗</button>
                  </span>
                );
                const order = isMobile ? [namePill, domPill, brandPill] : [namePill, brandPill, domPill];
                return (
                  <div className="wr-trip rise">
                    {order.map((p, i) => <Fragment key={i}>{i > 0 && <span className="joins">{isMobile ? "↓" : "→"}</span>}{p}</Fragment>)}
                  </div>
                );
              })()}
              {shareMsg && <p className="wr-hint rise" style={{ marginTop: 12 }}>{shareMsg}</p>}
            </div>
          </div>
          <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
            <button className="wr-btn" style={{ maxWidth: 340 }} onClick={share}>Share the news</button>
            <button className="wr-btn2" onClick={restart}>Name something else</button>
            <button className="wr-link" onClick={gotoAccount}>Everything is saved to your account</button>
          </div>
        </>
      )}

      {/* overlays */}
      {poll && (
        <NamePoll
          variant={poll}
          page={step === "words" ? "words" : "names"}
          onClose={() => setPoll(null)}
          onSend={(reasons, note) => { track("feedback", { variant: poll, reasons, note, step }); setPoll(null); }}
        />
      )}
      {briefGate && (
        <BriefGateModal
          brief={sentence.trim()}
          onClose={() => setBriefGate(false)}
          onUser={(u) => {
            setUser(u);
            setBriefGate(false);
            track("signup", {}); // same process as the run: one row per user in the admin
            persist();
            const t = afterGate.current || "brands";
            afterGate.current = null;
            toStep(t);
          }}
        />
      )}
      {signupOpen && <SignupModal onClose={() => setSignupOpen(false)} onUser={(u) => { setUser(u); setSignupOpen(false); gotoAccount(); }} />}
      {bookOpen && bookCtx && <Suspense fallback={null}><BookPreview ctx={bookCtx} onClose={() => setBookOpen(false)} onShare={share} /></Suspense>}
      {bookCtx && <Suspense fallback={null}><BookPrint ctx={bookCtx} /></Suspense>}

      {/* test jump bar */}
      {test && (
        <div className="wr-testbar">
          {STEPS_ALL.map((s, i) => (
            <button
              key={s} className={s === step ? "on" : ""} title={s}
              onClick={() => { if (s === "logodone" && !logoSel) setLogoSel(logoConcepts(0)[0]); toStep(s); }}
            >{i}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── the wait for the six (only when they aren't ready): naming trivia +
   a real-time bar fed by elapsed time vs the learned estimate and by the
   actual count of names already coined ── */
const NAMING_STORIES = [
  { h: <>Amazon almost launched as <i>Cadabra</i>.</>, p: "In 1994 Jeff Bezos's lawyer heard it on the phone as “cadaver”. He switched to the name of the world's largest river, which also sat near the top of alphabetical lists." },
  { h: <>Google began as <i>BackRub</i>.</>, p: "The rename came from googol, the number 1 followed by 100 zeros, accidentally misspelled when the domain was registered. The typo stuck." },
  { h: <>Nike spent 7 years as <i>Blue Ribbon Sports</i>.</>, p: "The name of the Greek goddess of victory came to employee Jeff Johnson in a dream, the night before the deadline. Phil Knight: “I guess we'll go with that for now.”" },
  { h: <>Twitter launched as <i>twttr</i>.</>, p: "Vowel-less like Flickr, because twitter.com belonged to a bird-sounds hobbyist. They bought the vowels six months later." },
] as const;

function NamingWait({ coined, starred }: { coined: number; starred: WWord[] }) {
  const [elapsed, setElapsed] = useState(0);
  const [storyIdx, setStoryIdx] = useState(() => Math.floor(Math.random() * NAMING_STORIES.length));
  const eta = useRef(loadEta());
  const t0 = useRef(Date.now());
  useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - t0.current), 150);
    const rot = setInterval(() => setStoryIdx((i) => (i + 1) % NAMING_STORIES.length), 8000);
    return () => { clearInterval(t); clearInterval(rot); };
  }, []);
  // Real progress: whichever is further along, the clock or the coined count.
  const pct = Math.round(Math.min(97, Math.max((elapsed / eta.current) * 88, (coined / 6) * 92, 2)));
  const stage = coined >= 6 ? 2 : coined >= 1 ? 1 : 0;
  const stages = ["Blending your words", "Scoring against the brief", "Checking domains"];
  const mix = starred.slice(0, 4).map((w) => w.w);
  const mixLabel = mix.length > 1 ? mix.slice(0, -1).join(", ") + " and " + mix[mix.length - 1] : mix[0] || "your words";
  const story = NAMING_STORIES[storyIdx];
  return (
    <div className="wr-wait">
      <div className="story rise" key={storyIdx}>
        <h2>{story.h}</h2>
        <p>{story.p}</p>
      </div>
      <div className="prog">
        <div className="row"><b>Mixing {mixLabel}…</b><span>{pct}%</span></div>
        <div className="bar"><i style={{ width: pct + "%" }} /></div>
        <div className="steps">
          {stages.map((label, i) => (
            <span key={label} className={i < stage ? "done" : i === stage ? "now" : ""}>
              {i < stage ? <i className="ck">✓</i> : i === stage ? <i className="wr-spin sm" /> : <i className="ring" />}
              {label}
            </span>
          ))}
        </div>
      </div>
      <p className="eta">About {Math.max(5, Math.round(eta.current / 5000) * 5)} seconds · six names on the way</p>
    </div>
  );
}

/* ── honest failure state: never sample data, always a retry ── */
function GenFail({ note, onRetry }: { note: string; onRetry: () => void }) {
  return (
    <div className="wr-fail">
      <p>{note} Nothing was lost, your brief and words are safe.</p>
      <button className="wr-btn2" onClick={onRetry}>↻ Try again</button>
    </div>
  );
}

/* ── sign-up pop-up over the landing (the only sign-up in the flow) ── */
/* 00·s — after "Name it": one tap with Google, the brief is kept */
const LANG_FULL: Record<string, string> = { EN: "English", LA: "Latin", IT: "Italian", FR: "French", ES: "Spanish", GR: "Greek", JP: "Japanese", AR: "Arabic", DE: "German", PT: "Portuguese", SV: "Swedish", NL: "Dutch" };
/* ── V2·03 / 03·5 (mobile): the word cloud — tap a few, shuffle, hold for meaning ── */
function WordsCloudV2({ styles, starred, onToggle, onContinue }: {
  styles: WStyle[]; starred: WWord[]; onToggle: (w: WWord) => void;
  onContinue: (extra: WWord[], method: "manual" | "pick-for-me") => void;
}) {
  const pool = useMemo(() => { // every word, interleaved across the six angles
    const cols = styles.map((s) => s.words);
    const out: WWord[] = []; const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      let any = false;
      for (const c of cols) {
        const w = c[i];
        if (!w) continue;
        any = true;
        const k = w.w.toLowerCase();
        if (!seen.has(k)) { seen.add(k); out.push(w); }
      }
      if (!any) break;
    }
    return out;
  }, [styles]);
  const [cloud, setCloud] = useState<WWord[]>(() => pool.slice(0, 54));
  const [sheet, setSheet] = useState<{ w: WWord; x: number; y: number; demo?: boolean } | null>(null);
  const pressTimer = useRef<number>(0);
  const longFired = useRef(false);
  const need = Math.max(0, 3 - starred.length); // "a few": the button unlocks at three

  // First visit only: the meaning bubble opens by itself on one word, until the
  // first tap — so "hold to see" explains itself (user.seenHoldHint).
  const HOLD_KEY = "ns.holdhint";
  const seenHold = () => { try { localStorage.setItem(HOLD_KEY, "1"); } catch { /* ignore */ } };
  useEffect(() => {
    if (!cloud.length) return;
    try { if (localStorage.getItem(HOLD_KEY)) return; } catch { return; }
    const t = setTimeout(() => {
      const w = cloud.slice(4, 10).find((x) => x.m) || cloud.find((x) => x.m);
      if (!w) return;
      const el = document.querySelector(`.wr-v2w .cloud .chip[data-w="${CSS.escape(w.w)}"]`) as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const width = Math.min(315, window.innerWidth - 24);
      setSheet({ w, x: Math.max(12, Math.min(r.left, window.innerWidth - width - 12)), y: r.bottom + 10, demo: true });
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloud]);

  const shuffle = () => { // keep the picks, swap everything else for fresh words
    const keep = cloud.filter((w) => starred.some((s) => s.w === w.w));
    const inCloud = new Set(cloud.map((w) => w.w));
    const fresh = pool.filter((w) => !inCloud.has(w.w));
    const refill = fresh.length ? fresh : pool.filter((w) => !starred.some((s) => s.w === w.w));
    const next = [...keep];
    for (const w of [...refill].sort(() => Math.random() - 0.5)) {
      if (next.length >= 54) break;
      if (!next.some((x) => x.w === w.w)) next.push(w);
    }
    setCloud(next.sort(() => Math.random() - 0.5));
    track("wordshuffle", {});
  };
  const down = (w: WWord, e: React.PointerEvent) => {
    seenHold(); // the demo bubble has done its job after the first touch
    setSheet(null);
    longFired.current = false;
    window.clearTimeout(pressTimer.current);
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    pressTimer.current = window.setTimeout(() => {
      longFired.current = true;
      const width = Math.min(315, window.innerWidth - 24);
      setSheet({ w, x: Math.max(12, Math.min(r.left, window.innerWidth - width - 12)), y: r.bottom + 10 });
    }, 450);
  };
  const up = () => {
    window.clearTimeout(pressTimer.current);
    if (longFired.current) setSheet(null); // release to close (04/03 spec)
  };
  useEffect(() => { // the demo bubble closes on the first touch or scroll — it must NEVER block them
    if (!sheet?.demo) return;
    const close = () => { seenHold(); setSheet(null); };
    document.addEventListener("pointerdown", close, true);
    document.addEventListener("scroll", close, true);
    return () => { document.removeEventListener("pointerdown", close, true); document.removeEventListener("scroll", close, true); };
  }, [sheet]);

  return (
    <div className="wr-v2w">
      <h1 className="wr-h ttl">Tap the words that feel like you.</h1>
      <p className="holdhint"><i /> Hold a word to see what it means</p>
      <div className="cloud">
        {cloud.map((w) => {
          const on = starred.some((s) => s.w === w.w);
          return (
            <button
              key={w.w}
              data-w={w.w}
              className={"chip" + (on ? " on" : "")}
              onPointerDown={(e) => down(w, e)}
              onPointerUp={up}
              onPointerLeave={up}
              onContextMenu={(e) => e.preventDefault()}
              onClick={() => { if (longFired.current) { longFired.current = false; return; } onToggle(w); }}
            >
              {w.w}<i className="lg">{(w.lang || "EN").toUpperCase()}</i>
            </button>
          );
        })}
      </div>
      <div className="dock">
        <div className="fade"><span>↓ Scroll for more</span></div>
        <button className="cta" disabled={need > 0} onClick={() => onContinue([], "manual")}>
          {need > 0 ? "Pick a few words" : "See my 6 names →"}
        </button>
        <div className="links">
          <button onClick={shuffle}>↻ Shuffle words</button>
          <button onClick={() => {
            // The lazy path is the mobile path: top up to five with the cloud's
            // strongest words (pool order interleaves the six angles) and go.
            const picks = cloud.filter((w) => !starred.some((s) => s.w === w.w)).slice(0, Math.max(0, 5 - starred.length));
            onContinue(picks, "pick-for-me");
          }}>Not sure? Pick for me</button>
        </div>
      </div>
      {sheet && (
        <div className="wr-v2tipwrap">
          <div className="wr-v2tip" style={{ left: sheet.x, top: sheet.y }}>
            <b>{sheet.w.w}</b> <i className="lg">{LANG_FULL[(sheet.w.lang || "EN").toUpperCase()] || (sheet.w.lang || "EN").toUpperCase()}</i>
            <p>{sheet.w.m || "A word from your brief's world."}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── V2·04 / 04b (mobile): six names, one screen, domain on each ── */
const V2_SPELL: Record<number, string> = { 6: "Six", 9: "Nine", 12: "Twelve", 15: "Fifteen", 18: "Eighteen", 24: "Twenty-four" };
function NamesListV2({ names, known, sel, onSel }: {
  names: WName[]; known: string[] | null; sel: string | null; onSel: (n: string) => void;
}) {
  const fresh = known ? names.filter((n) => !known.includes(n.name)) : [];
  const olds = known ? names.filter((n) => known.includes(n.name)) : names;
  const display = [...fresh, ...olds];
  const freshSet = new Set(fresh.map((n) => n.name));
  return (
    <div className="wr-v2n">
      <h1 className="wr-h ttl">{known ? `${V2_SPELL[names.length] || names.length} names, and counting.` : "Six names for your brief."}</h1>
      {known && <p className="sub">New ones on top · your pick is kept</p>}
      <div className="rows">
        {display.map((n) => {
          const d = n.dom?.free ? n.dom : n.alt || null;
          const on = n.name === sel;
          return (
            <button key={n.name} className={"row" + (on ? " on" : "")} onClick={() => onSel(n.name)}>
              <span className="l1">
                <b className="nm">{n.name}</b>
                {freshSet.has(n.name) && <i className="new">NEW</i>}
                {d ? <span className="dm"><i className="dot" />{d.domain}</span>
                  : !(n as any).domd ? <span className="dm dim">checking…</span> : null}
                <span className="fit">{n.score}%</span>
              </span>
              <span className="why">{n.tagline || n.roots}</span>
              <span className={"ring" + (on ? " ck" : "")}>{on ? "✓" : ""}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── 04 desktop: six cards in two columns, one pick, ⏎ continues ── */
function NamesGridV2({ names, known, sel, onSel }: {
  names: WName[]; known: string[] | null; sel: string | null; onSel: (n: string) => void;
}) {
  const fresh = known ? names.filter((n) => !known.includes(n.name)) : [];
  const olds = known ? names.filter((n) => known.includes(n.name)) : names;
  const display = [...fresh, ...olds];
  const freshSet = new Set(fresh.map((n) => n.name));
  return (
    <div className="wr-ngrid">
      <h1 className="wr-h ttl">
        {known ? `${V2_SPELL[fresh.length] || fresh.length} more for your brief.` : "Six names for your brief."}
        <span className="tsub">{known ? "New ones on top · your pick is kept" : "Pick the one · every domain is free"}</span>
      </h1>
      <div className="grid">
        {display.map((n) => {
          const d = n.dom?.free ? n.dom : n.alt || null;
          const on = n.name === sel;
          return (
            <button key={n.name} className={"card" + (on ? " on" : "")} onClick={() => onSel(n.name)}>
              <span className="main">
                <span className="hd">
                  <b className="nm">{n.name}</b>
                  {freshSet.has(n.name) && <i className="new">NEW</i>}
                  <span className="rt mono">{n.roots}</span>
                </span>
                <span className="why">{n.tagline || n.roots}</span>
                {(d || !(n as any).domd) && <span className="dm mono">{d ? <><i className="dot" />{d.domain} free</> : "checking…"}</span>}
              </span>
              <span className="sc">
                <span className="n">{n.score}<small>%</small></span>
                <span className="l mono">Brief fit</span>
                <span className="bar"><i style={{ width: `${Math.min(100, Math.max(4, n.score))}%` }} /></span>
              </span>
              <span className={"ring" + (on ? " ck" : "")}>{on ? "✓" : ""}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── 05·d: the other endings — a bottom sheet on phones, a popover on desktop ── */
function DomEndingsSheet({ name, rows, current, bestIdx, onUse, onClose }: {
  name: string; rows: DomainCard[]; current: string; bestIdx: number;
  onUse: (d: DomainCard) => void; onClose: () => void;
}) {
  const [pend, setPend] = useState<DomainCard | null>(rows.find((r) => r.domain === current) || rows[0] || null);
  return (
    <div className="wr-dsheetwrap" onClick={onClose}>
      <div className="wr-dsheet" onClick={(e) => e.stopPropagation()}>
        <span className="grab" />
        <p className="hd">Other endings for {name}</p>
        <p className="sub">All checked a second ago. Tap one to switch.</p>
        <div className="rows">
          {rows.map((d, i) => {
            const on = pend?.domain === d.domain;
            return (
              <button key={d.domain} className={"row" + (on ? " on" : "")} onClick={() => setPend(d)}>
                <i className={"dot" + (d.status === "negotiable" ? " sale" : "")} />
                <span className="d mono">{d.domain}</span>
                <span className="st">{i === bestIdx ? "Best pick" : d.status === "negotiable" ? "For sale" : "Available"}</span>
                <span className="pr mono">{d.price || d.offerPrice || ""}</span>
                {on && <i className="ck">✓</i>}
              </button>
            );
          })}
        </div>
        <button className="use" disabled={!pend} onClick={() => pend && onUse(pend)}>Use {pend?.domain || "…"}</button>
      </div>
    </div>
  );
}

/* ── 05·r: the registrar hand-off — three honest steps, then just a link out ── */
function RegistrarSheet({ domain, price, onOpen, onLater, onClose }: {
  domain: string; price: string; onOpen: () => void; onLater: () => void; onClose: () => void;
}) {
  const steps: [string, string][] = [
    [`The checkout opens, searching ${domain}`, "Check it's still free, then add it to your cart."],
    ["Pay there", "It takes about a minute."],
    ["Come back to this tab", "Your brand is waiting right where you left it."],
  ];
  return (
    <div className="wr-dsheetwrap" onClick={onClose}>
      <div className="wr-dsheet go" onClick={(e) => e.stopPropagation()}>
        <span className="grab" />
        <p className="k mono">{domain.toUpperCase()}{price ? ` · ${price.toUpperCase()}/YR` : ""}</p>
        <h3>Buy <span className="mono" style={{ fontSize: "0.85em" }}>{domain}</span> in one minute.</h3>
        <p className="sub">The checkout opens in a new tab. Three steps:</p>
        <div className="gsteps">
          {steps.map(([h, s], i) => (
            <div key={h} className="gstep"><i>{i + 1}</i><span><b>{h}</b><em>{s}</em></span></div>
          ))}
        </div>
        <button className="wr-btnor" onClick={onOpen}>Buy {domain} ↗</button>
        <button className="wr-btn2 later" onClick={onLater}>Later — keep building my brand</button>
        <p className="fn">We'll remind you at the end, and it stays in your account.</p>
      </div>
    </div>
  );
}

/* 04·x / 04·i: the feedback ask — on coming back after leaving, or 30 s of quiet. */
const POLL_OPTS = [
  "Names don't fit my brief", "Taking too long",
  "Just exploring", "Domains are taken",
  "Something's confusing", "I'll come back later",
];
const POLL_OPTS_WORDS = [
  "Words don't inspire me", "Taking too long",
  "Just exploring", "I don't get what to do",
  "Something's confusing", "I'll come back later",
];
function NamePoll({ variant, page = "names", onClose, onSend }: { variant: "exit" | "idle"; page?: "words" | "names"; onClose: () => void; onSend: (reasons: string[], note: string) => void }) {
  const [sel, setSel] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const exit = variant === "exit";
  return (
    <div className="wr-sumodal poll" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <span className="grab" />
        <button className="x" onClick={onClose} aria-label="Close">✕</button>
        <p className="kick mono">{exit ? "Before you go" : "Still with us?"}</p>
        <h3>{exit ? "What got in the way?" : "Stuck on something?"}</h3>
        <p className="sub">{exit
          ? "Tick anything that fits. Five seconds, and it really helps."
          : "You've been quiet for a moment. If something's in the way, tell us — or pick up right where you left off."}</p>
        <div className="popts">
          {(page === "words" ? POLL_OPTS_WORDS : POLL_OPTS).map((o) => {
            const on = sel.includes(o);
            return (
              <button key={o} className={on ? "on" : ""} onClick={() => setSel(on ? sel.filter((x) => x !== o) : [...sel, o])}>
                <i>{on ? "✓" : ""}</i>{o}
              </button>
            );
          })}
        </div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything else? Tell us in your own words (optional)" rows={3} />
        <div className="pacts">
          <button className="pbtn dark" onClick={onClose}>{page === "words" ? "Keep going →" : "Keep naming →"}</button>
          <button className="pbtn aslink" disabled={!sel.length && !note.trim()} onClick={() => onSend(sel, note.trim())}>
            Send & leave · {page === "words" ? "progress" : "names"} saved
          </button>
        </div>
      </div>
    </div>
  );
}

function BriefGateModal({ brief, onClose, onUser }: { brief: string; onClose: () => void; onUser: (u: WUser) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const init = () => {
      const w = window as any;
      if (!w.google?.accounts?.id || !host.current) return;
      w.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (resp: any) => {
          const r = await authGoogle(resp.credential);
          if (r) onUser(r.user);
          else setErr("Sign-in didn't stick, try again.");
        },
      });
      w.google.accounts.id.renderButton(host.current, { type: "standard", theme: "filled_black", size: "large", text: "continue_with", shape: "pill", width: 300 });
    };
    return loadGsi(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="wr-sumodal gate" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <span className="bt" style={{ fontFamily: "'Archivo', var(--sans)", fontWeight: 900, letterSpacing: "-0.045em", fontSize: 16, display: "block", marginBottom: 16 }}>NAME NAME</span>
        <h3>Save your brief.<br />Then we name it.</h3>
        {brief && (
          <p className="briefrow"><em>Brief</em><span>{brief}</span></p>
        )}
        <div className="gbtn" ref={host} />
        {err && <p className="small" style={{ color: "#ff7a6e" }}>{err}</p>}
        <p className="small dim">Free. No card. We only use it to save your names.</p>
        <button className="wr-link" style={{ marginTop: 6 }} onClick={onClose}>← Edit my brief</button>
      </div>
    </div>
  );
}

function SignupModal({ onClose, onUser, note }: { onClose: () => void; onUser: (u: WUser) => void; note?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const init = () => {
      const w = window as any;
      if (!w.google?.accounts?.id || !host.current) return;
      w.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (resp: any) => {
          const r = await authGoogle(resp.credential);
          if (r) onUser(r.user);
          else setErr("Sign-in didn't stick, try again.");
        },
      });
      w.google.accounts.id.renderButton(host.current, { type: "standard", theme: "filled_black", size: "large", text: "continue_with", shape: "pill", width: 300 });
    };
    return loadGsi(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="wr-sumodal" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <button className="x" onClick={onClose} aria-label="Close">✕</button>
        <span className="tile"><svg width="15" height="15" viewBox="0 0 12 12"><path d="M 2 8.5 A 4 4 0 0 1 10 8.5 Z" fill="#000" /></svg></span>
        <h3>{note ? "Keep it. It's yours." : "Start naming, free."}</h3>
        <p>{note || "Save your names and pick up where you left off."}</p>
        <div className="gbtn" ref={host} />
        {err && <p className="small" style={{ color: "#ff7a6e" }}>{err}</p>}
        <p className="small">Have an account? Same button, we'll recognise you.</p>
        <p className="small dim">By continuing you agree to our Terms and Privacy Policy.</p>
      </div>
    </div>
  );
}

/* ── word row ── */
function WordRow({ w, on, onClick }: { w: WWord; on: boolean; onClick: () => void }) {
  return (
    <button className={"wr-word" + (on ? " on" : "")} onClick={onClick}>
      <span className="st">{on ? "★" : "☆"}</span>
      <span className="w">{w.w}</span>
      {w.lang && <span className="lg">{w.lang}</span>}
      <span className="m">{w.m}</span>
    </button>
  );
}

/* ── auto-growing serif textarea (the ask) ── */
function Grow({ value, onChange, onEnter, placeholder, boxed }: { value: string; onChange: (v: string) => void; onEnter: () => void; placeholder: string; boxed?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(46, el.scrollHeight) + "px";
  }, [value]);
  return (
    <textarea
      ref={ref} className={boxed ? "wr-refbrief" : "wr-ask"} rows={1} autoFocus={!boxed}
      value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); onEnter(); } }}
    />
  );
}

/* ── 01·l between brief and summary (design: Reading your brief). Shows only
   when the concept genuinely needs time; a precharged arrival never sees it. ── */
function BriefLoader({ sentence, chips }: { sentence: string; chips: string[] }) {
  const [elapsed, setElapsed] = useState(0);
  const eta = useRef(loadBriefEta());
  useEffect(() => {
    const t0 = Date.now();
    const t = setInterval(() => setElapsed(Date.now() - t0), 120);
    return () => clearInterval(t);
  }, []);
  if (elapsed < 700) return <div style={{ margin: "40px 0" }} />; // fast reads skip the ceremony
  const p = Math.min(0.96, elapsed / eta.current);
  const stage = p < 0.35 ? 0 : p < 0.85 ? 1 : 2;
  const stages = ["Reading every word", "Finding the concept", "Writing your brief"];
  const barLabel = stage === 0 ? "Reading every word…" : stage === 1 ? "Finding the idea behind it…" : "Writing your brief…";
  // While "reading", a highlight sweeps through the sentence a couple of words at a time.
  const words = sentence.split(/\s+/);
  const hiAt = Math.floor(elapsed / 420) % Math.max(1, words.length - 1);
  return (
    <div className="wr-bload">
      <p className="wr-kicker" style={{ marginBottom: 16 }}>Reading your brief</p>
      <h1 className="quote">
        “{words.map((w, i) => {
          const hot = stage === 0 && (i === hiAt || i === hiAt + 1);
          return <span key={i} className={hot ? "hot" : ""}>{w}{i < words.length - 1 ? " " : ""}</span>;
        })}”
      </h1>
      {!!chips.length && <div className="chips">{chips.map((c) => <span key={c}>{c}</span>)}</div>}
      <div className="barrow"><b>{barLabel}</b><span>{Math.round(p * 100)}%</span></div>
      <div className="bar"><i style={{ width: `${Math.max(2, p * 100)}%` }} /></div>
      <div className="stages">
        {stages.map((st, i) => (
          <span key={st} className={"st" + (i < stage ? " done" : i === stage ? " now" : "")}>
            {i < stage ? <i className="tick">✓</i> : i === stage ? <span className="wr-spin" /> : <i className="tick idle" />}
            {st}
          </span>
        ))}
      </div>
      <p className="eta">About {Math.max(2, Math.round(eta.current / 1000))} seconds</p>
    </div>
  );
}

/* ── the words page's wait screen (design: One moment / Finding words for…).
   Appears only when the hunt takes over a second; the bar runs on a learned ETA. ── */
function WordsLoader({ concept }: { concept: string }) {
  const [elapsed, setElapsed] = useState(0);
  const eta = useRef(loadWordsEta());
  useEffect(() => {
    const t0 = Date.now();
    const t = setInterval(() => setElapsed(Date.now() - t0), 120);
    return () => clearInterval(t);
  }, []);
  if (elapsed < 1000) return <div style={{ margin: "40px 0" }} />; // under a second: no ceremony
  const p = Math.min(0.96, elapsed / eta.current);
  const stage = p < 0.18 ? 0 : p < 0.8 ? 1 : 2;
  const stages = ["Reading your brief", "Exploring universes", "Adding meaning & language"];
  const barLabel = stage === 0 ? "Reading your brief…" : stage === 1 ? "Exploring your six universes…" : "Adding meaning & language…";
  return (
    <div className="wr-wload">
      <p className="wr-kicker" style={{ marginBottom: 10 }}>One moment</p>
      <h1 className="wr-h" style={{ fontSize: 44, margin: "0 0 34px" }}>Finding words for <i>{concept}</i>…</h1>
      <div className="barrow">
        <b>{barLabel}</b>
        <span>{Math.round(p * 100)}%</span>
      </div>
      <div className="bar"><i style={{ width: `${Math.max(2, p * 100)}%` }} /></div>
      <div className="stages">
        {stages.map((st, i) => (
          <span key={st} className={"st" + (i < stage ? " done" : i === stage ? " now" : "")}>
            {i < stage ? <i className="tick">✓</i> : i === stage ? <span className="wr-spin" /> : <i className="tick idle" />}
            {st}
          </span>
        ))}
      </div>
      <p className="eta">About {Math.max(2, Math.round(eta.current / 1000))} seconds · 96 words on the way</p>
    </div>
  );
}

/* ── The Name Name landing (handoff 4b "The Wordmark"): white page, giant
   edge-to-edge wordmark, ink blobs in difference blend, brief input up top ── */
function LandingKA({ sentence, setSentence, onSubmit, onHow, onLogin, loggedIn }: {
  sentence: string; setSentence: (s: string) => void;
  onSubmit: () => void; onHow: () => void; onLogin: () => void; loggedIn: boolean;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const wmRef = useRef<HTMLSpanElement>(null);
  const followRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { // the wordmark spans exactly edge to edge, at every width
    const fit = () => {
      const wm = wmRef.current, f = frameRef.current;
      if (!wm || !f) return;
      const mobile = f.clientWidth <= 760;
      // Phones break the wordmark onto two lines and size it to "NAME".
      wm.style.whiteSpace = "nowrap";
      wm.style.fontSize = "200px";
      if (mobile) wm.textContent = "NAME";
      const w = wm.offsetWidth;
      if (mobile) wm.textContent = "NAME NAME";
      wm.style.whiteSpace = mobile ? "normal" : "nowrap";
      const gut = mobile ? 40 : 64;
      if (w) wm.style.fontSize = ((200 * (f.clientWidth - gut)) / w).toFixed(2) + "px";
    };
    fit();
    const t1 = setTimeout(fit, 250), t2 = setTimeout(fit, 1200);
    (document as any).fonts?.ready?.then(() => setTimeout(fit, 50));
    window.addEventListener("resize", fit);
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener("resize", fit); };
  }, []);

  useEffect(() => { // the fourth blob eases toward the cursor
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    const onMove = (e: MouseEvent) => {
      const f = frameRef.current, b = followRef.current;
      if (!f || !b) return;
      const r = f.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      b.style.left = `${e.clientX - r.left - 170}px`;
      b.style.top = `${e.clientY - r.top - 170}px`;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sentence.trim().length < 4) { inputRef.current?.focus(); return; }
    onSubmit();
  };

  // Message match: the headline mirrors the ad group that brought them here
  // (utm_content, kept by first-touch attribution).
  const TAGS: Record<string, [string, string]> = {
    "business-name": ["Name your business in minutes.", "With a domain you can actually own."],
    "brand-startup": ["A startup name that sticks.", "Real naming craft, not mashups."],
    "name-domain": ["Every name comes with its domain.", "Checked live, before you fall in love."],
  };
  const tag = TAGS[attrib().content] || ["Not a generator, a perspective.", "The name you'll be known as."];

  return (
    <div className="ka-land" ref={frameRef}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <filter id="ka-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="22" result="b" />
            <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 30 -12" />
          </filter>
        </defs>
      </svg>
      <div className="katop">
        <span className="lang">EN</span>
      </div>
      <div className="hero">
        <p className="tag">{tag[0]}<br />{tag[1]}</p>
      </div>
      <div className="wmrow"><span className="wm" ref={wmRef}>NAME NAME</span></div>
      <form className="brief" onSubmit={submit}>
        <input ref={inputRef} type="text" placeholder="Describe what you're building…"
          value={sentence} onChange={(e) => setSentence(e.target.value)} />
        <button type="submit">Name it <span className="arr">→</span></button>
      </form>
      <div className="bbar">
        <span className="line">Name, domain &amp; brand in minutes</span>
        <span className="links">
          <button onClick={onHow}>How it works</button>
          <i>/</i>
          <button onClick={onLogin}>{loggedIn ? "My account" : "Log in"}</button>
          <span className="lang">EN</span>
        </span>
      </div>
      <div className="ink" aria-hidden="true">
        <div className="goo">
          <span className="b a" />
          <span className="b bb" />
          <span className="b c" />
          <span className="b follow" ref={followRef} />
        </div>
      </div>
    </div>
  );
}

/* ── 02·b Brands you like: a 12-card swipe deck that teaches the studio
   the founder's naming taste (design handoff 02r-02b) ── */
function BrandSwipe({ deck, liked, disliked, onJudge, onSkip, onNext }: {
  deck: InspireBrand[]; liked: string[]; disliked: string[];
  onJudge: (name: string, like: boolean) => void; onSkip: () => void; onNext: () => void;
}) {
  // Already-judged cards (a resumed run, or a re-drawn hand) don't come back.
  const cards = useMemo(() => deck.filter((b) => !liked.includes(b.name) && !disliked.includes(b.name)), [deck]); // eslint-disable-line react-hooks/exhaustive-deps
  const [idx, setIdx] = useState(0);
  const [dx, setDx] = useState(0);
  const [fly, setFly] = useState<0 | 1 | -1>(0);
  const drag = useRef<{ x0: number; on: boolean }>({ x0: 0, on: false });
  const done = idx >= cards.length;
  const card = cards[idx];

  const judge = (like: boolean) => {
    if (done || fly) return;
    setFly(like ? 1 : -1);
    const name = card.name;
    setTimeout(() => {
      onJudge(name, like); setIdx((i) => i + 1); setFly(0); setDx(0);
      if (idx + 1 >= cards.length) setTimeout(onNext, 300); // last swipe opens the taste summary
    }, 240);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { e.preventDefault(); judge(true); }
      if (e.key === "ArrowLeft") { e.preventDefault(); judge(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, fly]);

  const px = fly ? fly * 640 : dx;
  const rot = -3 + px / 22;
  return (
    <>
      <div className="wr-stage center">
        <div className="wr-swipe">
          <div className="left">
            <h1 className="wr-h" style={{ fontSize: 34, marginBottom: 8 }}>Which names would you be proud of?</h1>
            <p className="wr-lead" style={{ marginBottom: 18 }}>Swipe right on names you love, left on the rest.</p>
          </div>
          <div className="right">
            {done ? (
              <div className="alldone">
                <p className="wr-kicker" style={{ marginBottom: 10 }}>That's the deck</p>
                <p className="wr-lead">Your taste is in. On to the words.</p>
              </div>
            ) : (
              <>
                <div className="stack">
                  {cards[idx + 2] && <div className="card back2" />}
                  {cards[idx + 1] && <div className="card back1" />}
                  <div
                    className="card top"
                    style={{ transform: `translateX(${px}px) rotate(${rot}deg)`, transition: fly || !drag.current.on ? "transform 0.24s ease" : "none" }}
                    onPointerDown={(e) => { drag.current = { x0: e.clientX, on: true }; e.currentTarget.setPointerCapture(e.pointerId); }}
                    onPointerMove={(e) => { if (drag.current.on) setDx(e.clientX - drag.current.x0); }}
                    onPointerUp={() => {
                      const d = dx; drag.current.on = false;
                      if (d > 80) judge(true); else if (d < -80) judge(false); else setDx(0);
                    }}
                    // The browser can reclaim the gesture mid-drag (scroll,
                    // back-swipe): without this reset the card froze tilted.
                    onPointerCancel={() => { drag.current.on = false; setDx(0); }}
                    onLostPointerCapture={() => { if (drag.current.on) { drag.current.on = false; setDx(0); } }}
                  >
                    <span className="prog">{Math.min(idx + 1, cards.length)} OF {cards.length}</span>
                    {(px > 36) && <span className="stamp like">LIKE</span>}
                    {(px < -36) && <span className="stamp nope">NOPE</span>}
                    {card.domain && (
                      <img
                        className="blogo" alt="" draggable={false}
                        src={brandLogo(card.domain)}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                    <span className="bn">{card.name}</span>
                    <span className="bd">{styleArticle(card.style)}{card.vibe ? ` · ${card.vibe}` : ""}</span>
                    <span className="tags"><i>{card.style[0].toUpperCase() + card.style.slice(1)}</i><i>{card.sector}</i></span>
                  </div>
                </div>
                <div className="acts">
                  <button className="act no" onClick={() => judge(false)} aria-label="Not for you">✕</button>
                  <button className="act yes" onClick={() => judge(true)} aria-label="Like">♥</button>
                </div>
                {!!liked.length && (
                  <div className="youlike">
                    <span className="yl mono">You like · {liked.length}</span>
                    {liked.slice(-3).map((n) => <span key={n} className="ylp">{n}</span>)}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
        <button className="wr-btn" style={{ maxWidth: 320 }} onClick={onNext}>Show me the words →</button>
        <button className="wr-link" onClick={onSkip}>Skip this step</button>
      </div>
    </>
  );
}

/* ── 02·b·s: your taste, summed up — after the last swipe ── */
export type TasteAxes = { short: number; evoc: number; warm: number; real: number };
const AXES_META: { k: keyof TasteAxes; label: string; opp: string; word: string }[] = [
  { k: "short", label: "Short", opp: "Long", word: "short" },
  { k: "warm", label: "Warm", opp: "Cool", word: "warm" },
  { k: "evoc", label: "Evocative", opp: "Descriptive", word: "evocative" },
  { k: "real", label: "Real word", opp: "Invented", word: "made of real words" },
];
function BrandTasteSummary({ liked, disliked, axes, onAxes, onRemoveLiked, onRemoveDisliked, onAdd, onWords, onAgain }: {
  liked: string[]; disliked: string[];
  axes: TasteAxes | null; onAxes: (a: TasteAxes) => void;
  onRemoveLiked: (name: string) => void; onRemoveDisliked: (name: string) => void; onAdd: (name: string) => void;
  onWords: () => void; onAgain: () => void;
}) {
  const [adding, setAdding] = useState(false);
  // The dials start where the swipes put them; a drag overrides and sticks.
  const derived = Object.fromEntries(AXES_META.map(({ k }) => [k,
    liked.length ? liked.reduce((a, n) => a + (BRAND_AXES[n]?.[k] ?? 0.5), 0) / liked.length : 0.6,
  ])) as TasteAxes;
  const cur: TasteAxes = axes || derived;
  // The headline reads the dials: a trait near the middle drops out ("any
  // length"), the strongest leanings lead, either pole can speak.
  const T = 0.12;
  const SIDES: Record<keyof TasteAxes, [string, string]> = {
    short: ["short", "longer"], warm: ["warm", "cool"], evoc: ["evocative", "descriptive"], real: ["made of real words", "invented"],
  };
  const leanings = AXES_META
    .map((m) => ({ k: m.k, v: cur[m.k], str: Math.abs(cur[m.k] - 0.5) }))
    .sort((a, b) => b.str - a.str)
    .filter((l) => l.str > T)
    .slice(0, 3)
    .map((l) => SIDES[l.k][l.v > 0.5 ? 0 : 1]);
  const anyLen = Math.abs(cur.short - 0.5) <= T && leanings.length > 0;
  const joined = leanings.length > 1
    ? leanings.slice(0, -1).map((w, i) => <Fragment key={w}>{i > 0 && ", "}<i>{w}</i></Fragment>)
    : null;
  return (
    <>
      <div className="wr-stage">
        <div className="wr-bsum">
          <h1 className="wr-h ttl">
            {leanings.length === 0
              ? <>Your taste is <i>wide open</i> — anything can win.</>
              : <>You like names that are {joined}{leanings.length > 1 && " and "}<i>{leanings[leanings.length - 1]}</i>{anyLen && <>, <i>any length</i></>}.</>}
          </h1>
          <p className="tsub">Updates as you change things</p>
          <div className="axes">
            <div className="hdr"><span className="k mono">Your taste</span><span className="d mono">drag to adjust</span></div>
            {AXES_META.map((r) => {
              const pos = Math.round((1 - cur[r.k]) * 100); // knob left = the first pole
              const leanL = cur[r.k] > 0.5 + T, leanR = cur[r.k] < 0.5 - T;
              return (
                <div className="ax" key={r.k}>
                  <div className="t"><b className={leanR ? "dim" : ""}>{r.label}</b><span className={leanR ? "lean" : leanL ? "dim" : ""}>{r.opp}</span></div>
                  <div className="sl" style={{ ["--p" as any]: pos + "%" }}>
                    <i className="tick" />
                    <input
                      type="range" min={0} max={100} value={pos}
                      aria-label={`${r.label} to ${r.opp}`}
                      onChange={(e) => onAxes({ ...cur, [r.k]: 1 - Number(e.target.value) / 100 })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {(!!liked.length || true) && <>
            <p className="grp">Loved · {liked.length}</p>
            <div className="pills">
              {liked.map((n) => {
                const dom = SWIPE_POOL.find((b) => b.name === n)?.domain;
                return (
                  <button key={n} className="pill on" onClick={() => onRemoveLiked(n)}>
                    {dom && <img className="pf" alt="" src={brandLogo(dom, 64)} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                    {n} <i>✕</i>
                  </button>
                );
              })}
              {adding ? (
                <span className="pill add"><input
                  autoFocus placeholder="a brand you love"
                  onBlur={(e) => { const v = e.target.value.trim(); if (v) onAdd(v); setAdding(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } if (e.key === "Escape") setAdding(false); }}
                /></span>
              ) : (
                <button className="pill add" onClick={() => setAdding(true)}>＋ Add a brand</button>
              )}
            </div>
          </>}
          {!!disliked.length && <>
            <p className="grp">Not for you · {disliked.length}</p>
            <div className="pills">
              {disliked.map((n) => <button key={n} className="pill off" onClick={() => onRemoveDisliked(n)}>{n}</button>)}
            </div>
          </>}
        </div>
      </div>
      <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
        <button className="wr-btn" style={{ maxWidth: 460 }} onClick={onWords}>Show me the words →</button>
        <button className="wr-link" onClick={onAgain}>↻ Swipe again</button>
      </div>
    </>
  );
}

/* ── the four taste pickers of the Brand chapter ── */
function TastePicker({ step, name, taste, onChange, onBack, onNext }: {
  step: "feel" | "tcol" | "ttype" | "tshape"; name: string; taste: Taste;
  onChange: (t: Taste) => void; onBack: () => void; onNext: () => void;
}) {
  const q = step === "feel" ? `How should ${name} feel?` : step === "tcol" ? "Which colours feel right?" : step === "ttype" ? `How should ${name} be written?` : "Round or sharp?";
  const opts = TASTE_OPTS[step];
  const cur: string[] = step === "feel" ? taste.feeling : step === "tcol" ? taste.colours : step === "ttype" ? [taste.type] : [taste.shape];
  const pickIt = (k: string) => { // one pick per question, everywhere
    const next: Taste =
      step === "feel" ? { ...taste, feeling: [k] } :
      step === "tcol" ? { ...taste, colours: [k] } :
      step === "ttype" ? { ...taste, type: k } : { ...taste, shape: k };
    onChange({ ...next, sliders: seedSliders(next) });
  };
  const viz = (k: string) => {
    if (step === "tcol") {
      const palette = (TASTE_OPTS.tcol.find((o) => o.k === k) || TASTE_OPTS.tcol[0]).pal;
      return <span className="v cols">{palette.map((c) => <i key={c} style={{ background: c }} />)}</span>;
    }
    if (step === "ttype") {
      const faces: Record<string, React.CSSProperties> = {
        "Elegant serif": { fontFamily: "var(--bookserif)", fontWeight: 500 },
        "Modern serif": { fontFamily: "Didot, 'Bodoni MT', 'Playfair Display', serif", fontWeight: 500, letterSpacing: "0.01em" },
        "Slab serif": { fontFamily: "Rockwell, 'Roboto Slab', 'Courier New', serif", fontWeight: 700 },
        "Clean sans": { fontWeight: 600 },
        "Geometric sans": { fontFamily: "Futura, 'Century Gothic', sans-serif", fontWeight: 500, letterSpacing: "0.02em" },
        "Grotesque": { fontFamily: "'Helvetica Neue', Arial, sans-serif", fontWeight: 700, letterSpacing: "-0.03em" },
        "Strong caps": { fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 26 },
        "Rounded": { fontFamily: "'Arial Rounded MT Bold', 'Varela Round', sans-serif", fontWeight: 600 },
        "Technical mono": { fontFamily: "var(--mono)", fontWeight: 500, textTransform: "lowercase" },
        "Script": { fontFamily: "'Snell Roundhand', 'Savoye LET', 'Brush Script MT', cursive", fontWeight: 500, fontSize: 32 },
      };
      return <span className="v type" style={faces[k] || { fontWeight: 600 }}>{k === "Technical mono" ? name.toLowerCase() : name}</span>;
    }
    if (step === "tshape") {
      const night = { background: "#141127" };
      if (k === "Round & soft") return (
        <span className="v shape" style={{ ...night, gap: 16 }}>
          <i style={{ width: 74, height: 37, borderRadius: "74px 74px 0 0", background: "var(--dawn)" }} />
          <i style={{ width: 56, height: 56, borderRadius: "50%", background: "#fff" }} />
        </span>
      );
      if (k === "Sharp & angular") return (
        <span className="v shape" style={{ ...night, gap: 16 }}>
          <i style={{ width: 62, height: 56, clipPath: "polygon(50% 0, 100% 100%, 0 100%)", background: "var(--nova)", borderRadius: 0 }} />
          <i style={{ width: 48, height: 48, background: "#fff", borderRadius: 4, transform: "rotate(45deg)" }} />
        </span>
      );
      if (k === "Organic") return (
        <span className="v shape" style={night}>
          <i style={{ width: 92, height: 74, borderRadius: "58% 42% 55% 45% / 52% 58% 42% 48%", background: "var(--haze)" }} />
        </span>
      );
      return (
        <span className="v shape" style={{ ...night, flexDirection: "column", gap: 9 }}>
          <span style={{ display: "flex", gap: 9 }}>
            {[0, 1, 2].map((i) => <i key={i} style={{ width: 22, height: 22, background: "#fff", borderRadius: 3, display: "inline-block" }} />)}
          </span>
          <span style={{ display: "flex", gap: 9 }}>
            {[0, 1, 2].map((i) => <i key={i} style={{ width: 22, height: 22, background: "var(--dawn)", borderRadius: "50%", display: "inline-block" }} />)}
          </span>
        </span>
      );
    }
    // Full-bleed moodcards, matching the design frames.
    if (k === "Playful") {
      return (
        <span className="v feel" style={{ background: "linear-gradient(135deg, #8f97f8, #b9a7f5)", gap: 10 }}>
          <i style={{ width: 34, height: 34, borderRadius: "50%", background: "#f6d34c", display: "inline-block" }} />
          <i style={{ width: 34, height: 34, borderRadius: 12, background: "#f07a4e", display: "inline-block", transform: "rotate(8deg)" }} />
          <i style={{ width: 34, height: 34, borderRadius: "50%", background: "#ffffff", display: "inline-block" }} />
        </span>
      );
    }
    const st = k === "Soft & warm" ? { fontFamily: "var(--bookserif)", fontStyle: "italic" as const, background: "linear-gradient(160deg, #fbe3d4, #f0b49a)", color: "#3c241a" }
      : k === "Bold & bright" ? { fontWeight: 800, textTransform: "uppercase" as const, background: "linear-gradient(160deg, #e8445a, #f5a03c)", color: "#fff" }
      : { fontWeight: 400, letterSpacing: "0.22em", background: "#f4f2ee", color: "#17151a", fontFamily: "var(--mono)" };
    return <span className="v feel" style={st}>{k === "Bold & bright" ? "BOLD" : k === "Calm & minimal" ? "calm" : "Soft"}</span>;
  };
  return (
    <>
      <div className="wr-stage center">
        <div className="wr-tpick">
          <div className="qrow">
            <h1 className="wr-h" style={{ fontSize: 38, margin: 0 }}>{q}</h1>
            <span className="wr-hint">Pick one</span>
          </div>
          <div className="cards">
            {opts.map((o) => {
              const on = cur.includes(o.k);
              return (
                <button key={o.k} className={"tcard" + (on ? " sel" : "")} onClick={() => pickIt(o.k)}>
                  {on && <span className="ck">✓</span>}
                  {viz(o.k)}
                  <span className="tx">
                    <b>{o.k}</b>
                    <small>{o.d}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="wr-foot col wr-tfoot" style={{ gap: 8, alignItems: "center" }}>
        <button className="wr-btn" style={{ maxWidth: 220 }} onClick={onNext}>Next →</button>
        <span className="urow">
          <button className="wr-link" onClick={onBack}>← Back</button>
          <button className="wr-link" onClick={onNext}>Skip</button>
        </span>
      </div>
    </>
  );
}

/* small input for the refine page's Avoid list */
function AvoidAdd({ onAdd, label }: { onAdd: (w: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button className="wr-opt add" onClick={() => setOpen(true)}>{label || "＋ word to avoid"}</button>;
  return (
    <span className="wr-opt chip">
      <input autoFocus placeholder="word"
        onBlur={(e) => { const v = e.target.value.trim(); if (v) onAdd(v); setOpen(false); }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); (e.target as HTMLInputElement).blur(); } }} />
    </span>
  );
}

/* small input for the refine page's custom domain extension */
/* ── social icons (inline, official-ish glyph shapes) ── */
function SocialIcon({ name }: { name: string }) {
  const p: Record<string, string> = {
    Instagram: "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5.5A5.5 5.5 0 1 0 17.5 13 5.5 5.5 0 0 0 12 7.5zm0 2A3.5 3.5 0 1 1 8.5 13 3.5 3.5 0 0 1 12 9.5zM17.8 5a1.2 1.2 0 1 0 1.2 1.2A1.2 1.2 0 0 0 17.8 5z",
    X: "M3 3h4.6l5 6.7L18.4 3H21l-7.2 8.3L21.5 21h-4.6l-5.4-7.2L5.4 21H3l7.8-9L3 3z",
    TikTok: "M15 3c.4 2.7 2 4.3 4.8 4.5v3.1c-1.7 0-3.2-.5-4.8-1.5v6.6a6.1 6.1 0 1 1-6.1-6.1c.3 0 .7 0 1 .1v3.2a3 3 0 1 0 2.1 2.8V3H15z",
    LinkedIn: "M4.5 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM3 9h3v12H3zM9 9h2.9v1.6A3.4 3.4 0 0 1 15 9c3 0 4 1.9 4 4.7V21h-3v-6.6c0-1.6-.5-2.7-2-2.7s-2 1.1-2 2.7V21H9z",
  };
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d={p[name] || p.X} /></svg>;
}
