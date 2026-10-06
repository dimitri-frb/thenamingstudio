// The Naming Studio — the "Wrapped" flow. One black stage:
// 00 landing → 01 the ask → 02 brief wrapped → 03 the words → 04 the names
// (gated when signed out) → 05 the reveal → then the own-it hub:
// 06 domain → 06b/c logo → 07 brand book → 08 socials → 09 all set.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./wrapped.css";
import {
  ACTIVE, ACTIVE_BRIEF, GOOGLE_CLIENT_ID, authGoogle, clearSnap, coinNames, fetchDomainBoard, fetchMe,
  loadGsi, loadSession, loadSnap, newProcess, processId, putSearch, registrarUrl, sampleBook,
  loadEta, loadWordsEta, recordEta, recordWordsEta, saveSnap, setProcessId, setTestMode, track, wrapApi, type NameStream,
  type DomainBoardData, type DomainCard, type SavedSearch, type WBook, type WConcept,
  type WName, type WStyle, type WTerritory, type WUser, type WWord,
} from "./api";
import { BRAND_TILES, buildLogoPack, logoConcepts, logoSvg, toPalette, whyItWorks, type LogoConcept, type LogoFont, type LogoShape } from "./logos";
import { SWIPE_DECK } from "./inspire";
import { download } from "./zip";
import { BookPreview, BookPrint, printBook, ScaledPage, type BookCtx } from "./Book";

type Step =
  | "land" | "how" | "ask" | "brief" | "refine" | "brands" | "words" | "names" | "reveal"
  | "domain"
  | "brand" | "feel" | "tcol" | "ttype" | "tshape" | "taste" | "logo" | "logodone" | "book" | "socials"
  | "done";
// The product is a triptych: Name → Domain → Brand.
const CHAPTERS: Partial<Record<Step, { label: string; segs: number; idx: number }>> = {
  ask:    { label: "Chapter 1 · Name", segs: 5, idx: 0 },
  brief:  { label: "Chapter 1 · Name", segs: 5, idx: 1 },
  refine: { label: "Chapter 1 · Name", segs: 5, idx: 1 }, brands: { label: "Chapter 1 · Name", segs: 5, idx: 1 },
  words:  { label: "Chapter 1 · Name", segs: 5, idx: 2 },
  names:  { label: "Chapter 1 · Name", segs: 5, idx: 3 },
  reveal: { label: "Chapter 1 · Name", segs: 5, idx: 4 },
  domain: { label: "Chapter 2 · Domain", segs: 0, idx: 0 },
  brand:  { label: "Chapter 3 · Brand", segs: 0, idx: 0 },
  feel:   { label: "Chapter 3 · Brand · Feeling", segs: 9, idx: 0 },
  tcol:   { label: "Chapter 3 · Brand · Colours", segs: 9, idx: 1 },
  ttype:  { label: "Chapter 3 · Brand · Type", segs: 9, idx: 2 },
  tshape: { label: "Chapter 3 · Brand · Shape", segs: 9, idx: 3 },
  taste:  { label: "Chapter 3 · Brand · Your taste", segs: 9, idx: 4 },
  logo:   { label: "Chapter 3 · Brand · Logos", segs: 9, idx: 5 },
  logodone: { label: "Chapter 3 · Brand · Your logo", segs: 9, idx: 6 },
  book:   { label: "Chapter 3 · Brand · Brand book", segs: 9, idx: 7 },
  socials: { label: "Chapter 3 · Brand · Socials", segs: 9, idx: 8 },
};
const STEPS_ALL: Step[] = ["land", "ask", "brief", "refine", "brands", "words", "names", "reveal", "domain", "brand", "feel", "tcol", "ttype", "tshape", "taste", "logo", "logodone", "book", "socials", "done"];

// The URL mirrors the step (/2-concept, /4-names…), so the nav shows where you
// are and the browser's back/forward walk the flow.
const STEP_SLUG: Record<Step, string> = {
  land: "", how: "how-it-works", ask: "1-brief", brief: "2-concept", refine: "2-refine", brands: "2-brands", words: "3-words", names: "4-names", reveal: "5-reveal",
  domain: "6-domain",
  brand: "7-brand", feel: "7-feeling", tcol: "7-colours", ttype: "7-type", tshape: "7-shape", taste: "7-taste",
  logo: "8-logos", logodone: "8-logo", book: "9-brand-book", socials: "10-socials", done: "11-done",
};
const SLUG_STEP: Record<string, Step> = Object.fromEntries(
  (Object.entries(STEP_SLUG) as [Step, string][]).filter(([, v]) => v).map(([k, v]) => [v, k]),
) as Record<string, Step>;
const pathSlug = () => {
  const base = ((import.meta as any).env.BASE_URL || "/").replace(/\/$/, "");
  return window.location.pathname.replace(base, "").replace(/^\/+|\/+$/g, "").replace(/^test\/?/, "");
};
// Entered through /test/<step>? Then every URL we push keeps the prefix.
const TEST_PATH = /(?:^|\/)test(?:\/|$)/.test(window.location.pathname);

// The Brand chapter's taste quiz: four picks, then sliders.
export interface Taste { feeling: string[]; colours: string[]; type: string; shape: string; sliders: { ce: number; wc: number; rs: number; ss: number; mb: number } }
const TASTE_DEFAULT: Taste = { feeling: ["Soft & warm"], colours: ["Dawn to night"], type: "Elegant serif", shape: "Round & soft", sliders: { ce: 35, wc: 28, rs: 30, ss: 28, mb: 35 } };
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
    { k: "Clean sans", d: "Modern, simple" },
    { k: "Strong caps", d: "Bold, architectural" },
    { k: "Technical mono", d: "Precise, digital" },
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
    ss: t.type === "Elegant serif" ? 20 : t.type === "Technical mono" ? 70 : t.type === "Strong caps" ? 78 : 65,
    mb: has("Bold & bright") ? 72 : has("Calm & minimal") ? 24 : 40,
  };
};
const tasteFont = (t: Taste): LogoFont => {
  // The type pick decides; the serif↔sans slider can overrule at the extremes.
  const base: LogoFont = t.type === "Elegant serif" ? "serif" : t.type === "Technical mono" ? "light" : "bold";
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
  { name: "LinkedIn", desc: "Company page", url: "https://www.linkedin.com/company/setup/new/" },
];

export function WrappedApp({ test, resume, go }: { test: boolean; resume?: string; go?: string }) {
  const [step, setStep] = useState<Step>(test ? "land" : "land");
  const [sentence, setSentence] = useState(test ? ACTIVE_BRIEF().sentence : "");
  const [chips, setChips] = useState<string[]>(test ? ACTIVE_BRIEF().chips : []);
  const [chipsBusy, setChipsBusy] = useState(false);
  const [addingChip, setAddingChip] = useState(false);
  const [concept, setConcept] = useState<WConcept | null>(test ? ACTIVE().concept : null);
  const [feelOpts, setFeelOpts] = useState<string[]>(test ? [ACTIVE().concept.concept, ...(ACTIVE().concept.alts || [])] : []);
  // The refine page's founder preferences, folded into every later generation.
  const [prefs, setPrefs] = useState<{ tone: string[]; style: string[]; length: string; langs: string[]; avoid: string[]; terr: string[]; doms: string[]; who: string[]; brandsLiked: string[]; brandsDisliked: string[] }>({
    tone: [], style: [], length: "Any", langs: ["English"], avoid: [], terr: [], doms: [], who: [], brandsLiked: [], brandsDisliked: [],
  });
  const [styles, setStyles] = useState<WStyle[] | null>(test ? ACTIVE().styles : null);
  const [wtab, setWtab] = useState(0);
  const [starred, setStarred] = useState<WWord[]>(test ? [ACTIVE().styles[0].words[0], ACTIVE().styles[0].words[1], ACTIVE().styles[1].words[0], ACTIVE().styles[1].words[2]] : []);
  const [names, setNames] = useState<WName[] | null>(test ? ACTIVE().names : null);
  const [nameIdx, setNameIdx] = useState(0);
  const [namesBusy, setNamesBusy] = useState(false);
  const [namesProg, setNamesProg] = useState(0);      // names coined so far (drives the wait screen)
  const waitStart = useRef(0);
  const [moreBusy, setMoreBusy] = useState(false);
  const [picked, setPicked] = useState<WName | null>(test ? ACTIVE().names[0] : null);
  const [board, setBoard] = useState<DomainBoardData | null>(null);
  const [domSel, setDomSel] = useState<DomainCard | null>(null);
  const [domShow, setDomShow] = useState(4);
  const [logoSeed, setLogoSeed] = useState(0);
  const [taste, setTaste] = useState<Taste>(TASTE_DEFAULT);
  const [logoSel, setLogoSel] = useState<LogoConcept | null>(null);
  const [book, setBook] = useState<WBook | null>(test ? sampleBook(ACTIVE().names[0].name) : null);
  const [steps, setSteps] = useState<SavedSearch["steps"]>({});
  const [user, setUser] = useState<WUser | null>(() => loadSession()?.user || null);
  const [bookOpen, setBookOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
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
        const slugStep = SLUG_STEP[pathSlug()];
        const okSlug = slugStep && (
          slugStep === "ask" ||
          (["brief", "words"].includes(slugStep) && snap.sentence) ||
          (slugStep === "names" && (snap.names?.length || snap.starred?.length)) ||
          (!["ask", "brief", "words", "names"].includes(slugStep) && snap.picked)
        );
        const target: Step = okSlug ? slugStep : snap.step;
        setStep(target);
        pushUrl(target, true);
      } else {
        const slugStep = SLUG_STEP[pathSlug()];
        if (slugStep === "ask" || slugStep === "how") { setStep(slugStep); pushUrl(slugStep, true); }
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
    if (s.logo) setLogoSel({ key: s.logo.key, title: s.logo.title, accent: (s.logo as any).accent || "dawn", seed: s.logo.seed || 0, font: (s.logo as any).font });
    const target: Step =
      s.picked && go && ["domain", "book", "socials"].includes(go) ? (go as Step) :
      s.picked && go === "logo" ? (s.logo ? "logodone" : "logo") :
      s.picked ? "reveal" :
      s.names?.length ? "names" :
      s.concept ? "words" : "brief";
    setStep(target);
    pushUrl(target, true);
  }

  /* ── persistence (refresh-resume + account) ── */
  useEffect(() => {
    if (test || step === "land") return;
    saveSnap({ step, sentence, chips, concept, styles, starred, names, picked, steps, logoSel, logoSeed, book, prefs, feelOpts, taste });
  }, [test, step, sentence, chips, concept, styles, starred, names, picked, steps, logoSel, logoSeed, book, prefs, feelOpts, taste]);

  function persist(over: Partial<SavedSearch> = {}) {
    if (test || !sentence.trim()) return;
    const status: SavedSearch["status"] = steps.domain === "done" || over.steps?.domain === "done" ? "claimed" : (names?.length ? "ready" : "exploring");
    putSearch({
      id: processId(), at: startedAt.current, updated: Date.now(),
      sentence: sentence.trim(), chips, concept, starred, names: names || undefined,
      picked, steps, status,
      logo: logoSel ? { key: logoSel.key, title: logoSel.title, seed: logoSel.seed, accent: logoSel.accent, font: logoSel.font } : null,
      taste,
      ...over,
    } as SavedSearch);
  }

  /* ── generation chain (each step precharges the next) ── */
  useEffect(() => { // 01 → chips, as the founder pauses typing
    if (test || step !== "ask") return;
    const s = sentence.trim();
    if (s.length < 12) return;
    const t = setTimeout(async () => {
      setChipsBusy(true);
      const r = await wrapApi.chips(s);
      setChipsBusy(false);
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
          setConcept(c);
          setFeelOpts([c.concept, ...(c.alts || [])].filter(Boolean).slice(0, 3));
          fail("concept", false);
        } else {
          conceptReq.current = "";
          if (stepRef.current !== "ask") fail("concept", true); // silent while still typing
        }
      });
    };
    if (step === "ask" || step === "land") { const t = setTimeout(go, 800); return () => clearTimeout(t); }
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
    const t0 = Date.now();
    const s = sentence.trim();
    const finish = () => {
      settled++;
      if (settled < 6 || wordsReq.current !== key) return;
      const got = slots.filter(Boolean) as WStyle[];
      if (got.length) { recordWordsEta(Date.now() - t0); setStyles(got); fail("words", false); }
      else fail("words", true);
    };
    const run = (i: number, st: WTerritory, attempt: number) => {
      wrapApi.wordStyle(s, concept!.concept, concept!.territories, st, i, prefs).then((r) => {
        if (wordsReq.current !== key) return; // superseded
        if (r?.styles?.[0]?.words?.length) { slots[i] = r.styles[0]; finish(); }
        else if (attempt < 1) run(i, st, attempt + 1); // one quiet retry so columns never just go missing
        else finish();
      });
    };
    wordsPlan().forEach((st, i) => run(i, st, 0));
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
  function startFlow(from: string) {
    if (!test) { newProcess(); startedAt.current = Date.now(); }
    conceptReq.current = ""; wordsReq.current = "";
    if (from.trim()) setSentence(from);
    setStep("ask");
    pushUrl("ask");
  }

  // The Known As landing submits the brief straight into the flow (02).
  function startFromLanding() {
    if (!test) { newProcess(); startedAt.current = Date.now(); }
    track("search", { sentence: sentence.trim(), chips });
    setStep("brief");
    pushUrl("brief");
    persist();
  }

  function submitAsk() {
    if (sentence.trim().length < 4) return;
    track("search", { sentence: sentence.trim(), chips });
    setStep("brief");
    pushUrl("brief");
    persist();
  }

  const dataRef = useRef({ sentence, starred, names, picked });
  dataRef.current = { sentence, starred, names, picked };
  const canEnter = (t: Step) => {
    const d = dataRef.current;
    if (t === "land" || t === "how" || t === "ask") return true;
    if (t === "brief" || t === "refine" || t === "brands" || t === "words") return !!d.sentence.trim();
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
  function toStep(s: Step) { setStep(s); pushUrl(s); window.scrollTo(0, 0); }

  useEffect(() => { // browser back/forward walks the flow
    const onPop = (e: PopStateEvent) => {
      const t = ((e.state?.step as Step) || SLUG_STEP[pathSlug()] || "land");
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

  function makeNames() {
    toStep("names");
    if (names?.length || namesBusy) return;
    setNamesBusy(true);
    setNamesProg(0);
    waitStart.current = Date.now();
    fail("names", false);
    const key = starKey(starred);
    let entry = namesPre.current;
    if (!entry || entry.key !== key) { // the stars changed since the prefetch
      entry?.st.abort();
      entry = { key, st: coinNames(sentence.trim(), chips, concept?.concept || "", starred, [], prefs) };
      namesPre.current = entry;
    }
    attachStream(entry.st, []);
  }

  function moreNames() {
    if (moreBusy || !names) return;
    setMoreBusy(true);
    fail("more", false);
    const exKey = names.map((n) => n.name).join("|");
    const st = morePre.current?.key === exKey
      ? morePre.current.st
      : coinNames(sentence.trim(), chips, concept?.concept || "", starred, names.map((n) => n.name), prefs);
    morePre.current = null;
    attachStream(st, names);
  }

  function pickName(n: WName) {
    setPicked(n);
    setBoard(null); setDomSel(null); setDomShow(4); setLogoSel(null); setLogoSeed(0);
    track("pick", { name: n.name, score: n.score });
    toStep("reveal");
    persist({ picked: n });
  }

  function markStep(k: keyof SavedSearch["steps"], v: "done" | "skipped", next: Step) {
    const ns = { ...steps, [k]: v };
    setSteps(ns);
    toStep(next);
    persist({ steps: ns });
  }

  function registerDomain() {
    if (!domSel) return;
    // A for-sale domain opens its actual marketplace listing when we have it.
    // The registrar opens in a NEW tab and the flow stays right here on the
    // domain step; "Next: Logo" appears for when the founder is ready.
    window.open(domSel.offerUrl || registrarUrl(domSel.domain), "_blank", "noopener");
    track("domain", { domain: domSel.domain, price: domSel.price || domSel.offerPrice || "" });
    const ns = { ...steps, domain: "done" as const };
    setSteps(ns);
    persist({ steps: ns, domain: domSel.domain });
  }

  async function downloadLogoPack() {
    if (!picked || !logoSel) return;
    const lp = tastePalette(taste);
    const pack = await buildLogoPack(picked.name, logoSel.key, logoSel.accent, logoSel.seed,
      [{ name: "Dawn", hex: lp.dawn }, { name: "Haze", hex: lp.haze }, { name: "Nova", hex: lp.nova }, { name: "Night", hex: lp.night }],
      logoSel.font, tasteShape(taste));
    download(pack.blob, pack.filename);
    track("logopack", { name: picked.name, concept: logoSel.title });
  }

  function share() {
    const text = `${picked?.name || "My new name"}, found with The Naming Studio`;
    const url = "https://dimitri-frb.github.io/thenamingstudio/";
    if (navigator.share) { navigator.share({ title: picked?.name, text, url }).catch(() => {}); return; }
    navigator.clipboard?.writeText(`${text} · ${url}`).then(() => setShareMsg("Copied to clipboard"));
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
        setNameIdx((i) => Math.min(names.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1))));
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        if (step === "ask") { e.preventDefault(); submitAsk(); }
        else if (!typing) {
          if (step === "brief" && concept) { e.preventDefault(); toStep("refine"); }
          else if (step === "words" && starred.length) { e.preventDefault(); makeNames(); }
          else if (step === "names" && names?.length) { e.preventDefault(); pickName(names[Math.min(nameIdx, names.length - 1)]); }
          else if (step === "reveal") { e.preventDefault(); toStep("domain"); }
          else if (step === "domain" && domSel) { e.preventDefault(); registerDomain(); }
          else if (step === "logodone") { e.preventDefault(); markStep("logo", "done", "book"); }
          else if (step === "book") { e.preventDefault(); markStep("book", "done", "socials"); }
          else if (step === "socials") { e.preventDefault(); markStep("socials", "done", "done"); track("done", { name: picked?.name }); }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ── shared chrome ── */
  const chapter = CHAPTERS[step];

  const backTarget: Partial<Record<Step, Step>> = {
    ask: "land", brief: "ask", refine: "brief", brands: "refine", words: "brands", names: "words", reveal: "names",
    domain: "reveal",
    brand: "domain", feel: "brand", tcol: "feel", ttype: "tcol", tshape: "ttype", taste: "tshape",
    logo: "taste", logodone: "logo", book: "logodone", socials: "book",
  };
  // Forward mirrors back, but only where the run's data already allows the step.
  const fwdTarget = (): Step | null => {
    const t: Step | null =
      step === "ask" ? (sentence.trim().length >= 4 ? "brief" : null) :
      step === "brief" ? (conceptReady ? "refine" : null) :
      step === "refine" ? "brands" :
      step === "brands" ? (conceptReady ? "words" : null) :
      step === "words" ? (names?.length ? "names" : null) :
      step === "names" ? (picked ? "reveal" : null) :
      step === "reveal" ? "domain" :
      step === "domain" ? "brand" :
      step === "brand" ? "feel" :
      step === "feel" ? "tcol" :
      step === "tcol" ? "ttype" :
      step === "ttype" ? "tshape" :
      step === "tshape" ? "taste" :
      step === "taste" ? "logo" :
      step === "logo" ? (logoSel ? "logodone" : "book") :
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
    book, logoKey: logoSel?.key || "sunrise", logoAccent: logoSel?.accent || "dawn", logoSeed: logoSel?.seed ?? 0, logoFont: logoSel?.font, logoShape: lshape,
  } : null;

  return (
    <div className="wr">
      {(step === "reveal" || step === "done") && <div className="wr-glow" />}

      {/* shared header: logo left, chapter label centred, round ‹ › right */}
      {step !== "land" && <div className="wr-top">
        <button className="wr-brand" onClick={() => restart()}>
          <span className="bt">KNOWN AS</span>
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
              <button className="wr-btn" style={{ maxWidth: 240, height: 54, borderRadius: 980 }} onClick={() => startFlow("")}>Start naming →</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 01 the ask ═══ */}
      {step === "ask" && (
        <>
          <div className="wr-stage center">
            <div className="inner-nar">
              <p className="wr-kicker" style={{ marginBottom: 14 }}>Start here</p>
              <h1 className="wr-h" style={{ marginBottom: 26 }}>What are you building?</h1>
              <Grow value={sentence} onChange={setSentence} onEnter={submitAsk} placeholder="One sentence is enough" />
              <div style={{ marginTop: 22 }}>
                <p className="wr-kicker" style={{ fontSize: 11, marginBottom: 10 }}>
                  What we're hearing {chipsBusy && <span className="wr-spin" style={{ display: "inline-block", verticalAlign: "-3px", marginLeft: 6 }} />}
                </p>
                <div className="wr-chips">
                  {chips.map((c) => (
                    <span key={c} className="wr-chip">{c}
                      <button className="x" onClick={() => setChips(chips.filter((x) => x !== c))}>✕</button>
                    </span>
                  ))}
                  {addingChip
                    ? <span className="wr-chip"><input autoFocus placeholder="add a tag"
                        onBlur={(e) => { const v = e.target.value.trim(); if (v) setChips([...chips, v]); setAddingChip(false); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); (e.target as HTMLInputElement).blur(); } }} /></span>
                    : <button className="wr-chipadd" onClick={() => setAddingChip(true)}>＋ add</button>}
                </div>
              </div>
            </div>
          </div>
          <div className="wr-foot" style={{ justifyContent: "flex-end" }}>
            <button className="wr-btn" style={{ maxWidth: 420 }} disabled={sentence.trim().length < 4} onClick={submitAsk}>Continue</button>
          </div>
        </>
      )}

      {/* ═══ 02 brief wrapped ═══ */}
      {step === "brief" && (
        <>
          <div className="wr-stage center">
            <div className="inner-nar">
              {!conceptReady ? (
                fails.concept
                  ? <GenFail note="We couldn't read your brief just now." onRetry={() => retry("concept")} />
                  : <div className="wr-load"><span className="wr-spin" /> Reading your brief…</div>
              ) : (
                <>
                  <p className="wr-kicker rise" style={{ marginBottom: 14 }}>Here's what we heard</p>
                  <h1 className="wr-h rise" style={{ marginBottom: 18 }}>
                    Your name should feel like <span className="wr-cpill">{concept!.concept}</span>
                  </h1>
                  <p className="wr-lead rise" style={{ marginBottom: 30 }}>{concept!.para}</p>
                  <p className="wr-kicker rise" style={{ marginBottom: 14 }}>Our inspirations</p>
                  <div className="wr-terr">
                    {concept!.territories.map((t, i) => (
                      <div key={t.name} className="t" style={{ animationDelay: `${i * 0.08}s` }}>
                        <b>{t.name}</b><span>{t.desc}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="wr-foot">
            <button className="wr-btn mla" style={{ maxWidth: 300 }} disabled={!conceptReady} onClick={() => toStep("refine")}>Check my brief →</button>
          </div>
        </>
      )}

      {/* ═══ 02·r check your brief (required) ═══ */}
      {step === "refine" && (
        <div className="wr-stage" style={{ paddingTop: 8 }}>
          <div className="wr-refine">
            <p className="wr-kicker" style={{ marginBottom: 10 }}>Check your brief</p>
            <h1 className="wr-h" style={{ fontSize: 34, margin: "0 0 16px" }}>Is this right? Change anything, then go.</h1>
            <Grow value={sentence} onChange={setSentence} onEnter={() => conceptReady && toStep("brands")} placeholder="What are you building?" boxed />
            <div className="prows">
              <div className="prow">
                <span className="plbl">Who it's for</span>
                <div className="opts">
                  {["Everyone", "Founders", "Small businesses", "Big companies"].map((t) => {
                    const on = t === "Everyone" ? !prefs.who.length : prefs.who.includes(t);
                    return <button key={t} className={"wr-opt" + (on ? " on" : "")}
                      onClick={() => setPrefs({ ...prefs, who: t === "Everyone" ? [] : on ? prefs.who.filter((x) => x !== t) : [...prefs.who, t] })}>{on ? "✓ " : ""}{t}</button>;
                  })}
                  <AvoidAdd label="＋ add" onAdd={(w) => { if (!prefs.who.includes(w)) setPrefs({ ...prefs, who: [...prefs.who, w] }); }} />
                </div>
              </div>
              <div className="prow">
                <span className="plbl">Name style</span>
                <div className="opts">
                  {["Any", "Invented", "Real word", "Compound", ...prefs.style.filter((x) => !["Invented", "Real word", "Compound"].includes(x))].map((t) => {
                    const on = t === "Any" ? !prefs.style.length : prefs.style.includes(t);
                    return <button key={t} className={"wr-opt" + (on ? " on" : "")}
                      onClick={() => setPrefs({ ...prefs, style: t === "Any" ? [] : on ? prefs.style.filter((x) => x !== t) : [...prefs.style, t] })}>{on ? "✓ " : ""}{t}</button>;
                  })}
                  <AvoidAdd label="＋ add" onAdd={(w) => { if (!prefs.style.includes(w)) setPrefs({ ...prefs, style: [...prefs.style, w] }); }} />
                </div>
              </div>
              <div className="prow">
                <span className="plbl">Works in</span>
                <div className="opts">
                  <button className={"wr-opt" + (!prefs.langs.length ? " on" : "")}
                    onClick={() => setPrefs({ ...prefs, langs: [] })}>{!prefs.langs.length ? "✓ " : ""}Global</button>
                  {["English", "French", "Spanish", "German", ...prefs.langs.filter((x) => !["English", "French", "Spanish", "German"].includes(x))].map((t) => {
                    const on = prefs.langs.includes(t);
                    return <button key={t} className={"wr-opt" + (on ? " on" : "")}
                      onClick={() => setPrefs({ ...prefs, langs: on ? prefs.langs.filter((x) => x !== t) : [...prefs.langs, t] })}>{on ? "✓ " : ""}{t}</button>;
                  })}
                  <AvoidAdd label="＋ add" onAdd={(w) => { if (!prefs.langs.includes(w)) setPrefs({ ...prefs, langs: [...prefs.langs, w] }); }} />
                </div>
              </div>
              <div className="prow">
                <span className="plbl">Domain</span>
                <div className="opts">
                  <button className={"wr-opt" + (!prefs.doms.length ? " on" : "")}
                    onClick={() => { if (prefs.doms.length) { setPrefs({ ...prefs, doms: [] }); setNames(null); namesPre.current = null; morePre.current = null; } }}>
                    {!prefs.doms.length ? "✓ " : ""}Any
                  </button>
                  {["com", "ai", "io", ...prefs.doms.filter((d) => !["com", "ai", "io"].includes(d))].map((d) => {
                    const on = prefs.doms.includes(d);
                    return (
                      <button key={d} className={"wr-opt" + (on ? " on" : "")}
                        onClick={() => { setPrefs({ ...prefs, doms: on ? prefs.doms.filter((x) => x !== d) : [...prefs.doms, d] }); setNames(null); namesPre.current = null; morePre.current = null; }}>
                        {on ? "✓ " : ""}.{d}
                      </button>
                    );
                  })}
                  <DomAdd onAdd={(d) => { if (!prefs.doms.includes(d)) { setPrefs({ ...prefs, doms: [...prefs.doms, d] }); setNames(null); namesPre.current = null; morePre.current = null; } }} />
                </div>
              </div>
            </div>
            <div className="pmore">
              <span>More details</span>
              <em>Optional, sharpens the names</em>
            </div>
            <div className="prows">
              <div className="prow">
                <span className="plbl">Universes</span>
                <div className="opts">
                  {[...(concept?.territories || []).map((t) => t.name), ...prefs.terr.filter((x) => !(concept?.territories || []).some((t) => t.name === x))].map((name) => {
                    const active = !prefs.terr.length || prefs.terr.includes(name);
                    return (
                      <button key={name} className={"wr-opt" + (active ? " on" : "")}
                        onClick={() => {
                          const all = (concept?.territories || []).map((x) => x.name);
                          const cur = prefs.terr.length ? prefs.terr : all;
                          const next = active ? cur.filter((x) => x !== name) : [...cur, name];
                          if (!next.length) return; // keep at least one
                          setPrefs({ ...prefs, terr: next.length === all.length && next.every((x) => all.includes(x)) ? [] : next });
                          setStyles(null); setNames(null); namesPre.current = null; morePre.current = null;
                        }}>{active ? "✓ " : ""}{name}</button>
                    );
                  })}
                  <AvoidAdd label="＋ add" onAdd={(w) => {
                    const all = (concept?.territories || []).map((x) => x.name);
                    const cur = prefs.terr.length ? prefs.terr : all;
                    if (!cur.includes(w)) { setPrefs({ ...prefs, terr: [...cur, w] }); setStyles(null); setNames(null); namesPre.current = null; morePre.current = null; }
                  }} />
                </div>
              </div>
              <div className="prow">
                <span className="plbl">Tone</span>
                <div className="opts">
                  {["Balanced", "Friendly", "Serious", "Playful", ...prefs.tone.filter((x) => !["Friendly", "Serious", "Playful"].includes(x))].map((t) => {
                    const on = t === "Balanced" ? !prefs.tone.length : prefs.tone.includes(t);
                    return <button key={t} className={"wr-opt" + (on ? " on" : "")}
                      onClick={() => setPrefs({ ...prefs, tone: t === "Balanced" ? [] : on ? prefs.tone.filter((x) => x !== t) : [...prefs.tone, t] })}>{on ? "✓ " : ""}{t}</button>;
                  })}
                  <AvoidAdd label="＋ add" onAdd={(w) => { if (!prefs.tone.includes(w)) setPrefs({ ...prefs, tone: [...prefs.tone, w] }); }} />
                </div>
              </div>
              <div className="prow">
                <span className="plbl">Length</span>
                <div className="opts">
                  {["Short · 1–2 syllables", "Medium", "Any", ...(["Short · 1–2 syllables", "Medium", "Any"].includes(prefs.length) ? [] : [prefs.length])].map((t) => (
                    <button key={t} className={"wr-opt" + (prefs.length === t ? " on" : "")} onClick={() => setPrefs({ ...prefs, length: t })}>{prefs.length === t ? "✓ " : ""}{t}</button>
                  ))}
                  <AvoidAdd label="＋ add" onAdd={(w) => setPrefs({ ...prefs, length: w })} />
                </div>
              </div>
              <div className="prow">
                <span className="plbl">Space</span>
                <div className="opts">
                  {chips.map((c) => (
                    <span key={c} className="wr-opt chip">{c}<button className="x" onClick={() => setChips(chips.filter((x) => x !== c))}>✕</button></span>
                  ))}
                  {addingChip
                    ? <span className="wr-opt chip"><input autoFocus placeholder="add"
                        onBlur={(e) => { const v = e.target.value.trim(); if (v) setChips([...chips, v]); setAddingChip(false); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); (e.target as HTMLInputElement).blur(); } }} /></span>
                    : <button className="wr-opt add" onClick={() => setAddingChip(true)}>＋ add</button>}
                </div>
              </div>
              <div className="prow">
                <span className="plbl">Avoid</span>
                <div className="opts">
                  {prefs.avoid.map((w) => (
                    <span key={w} className="wr-opt chip">“{w}”<button className="x" onClick={() => setPrefs({ ...prefs, avoid: prefs.avoid.filter((x) => x !== w) })}>✕</button></span>
                  ))}
                  <AvoidAdd onAdd={(w) => setPrefs({ ...prefs, avoid: [...prefs.avoid, w] })} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {step === "refine" && (
        <div className="wr-foot">
          <button className="wr-link" onClick={() => toStep("brief")}>← Back</button>
          <button className="wr-btn" style={{ maxWidth: 300 }} disabled={!conceptReady}
            onClick={() => { if (wordsReq.current !== wordsKey()) { setStyles(null); setNames(null); namesPre.current = null; morePre.current = null; } toStep("brands"); }}>
            Looks good, next →
          </button>
        </div>
      )}

      {/* ═══ 02·b brands you like (swipe) ═══ */}
      {step === "brands" && (
        <BrandSwipe
          liked={prefs.brandsLiked} disliked={prefs.brandsDisliked}
          onJudge={(name, like) => setPrefs((p) => ({
            ...p,
            brandsLiked: like ? [...p.brandsLiked.filter((x) => x !== name), name] : p.brandsLiked.filter((x) => x !== name),
            brandsDisliked: !like ? [...p.brandsDisliked.filter((x) => x !== name), name] : p.brandsDisliked.filter((x) => x !== name),
          }))}
          onBack={() => toStep("refine")}
          onNext={() => toStep("words")}
        />
      )}


      {/* ═══ 02b refine the brief ═══ */}
      {/* ═══ 03 the words ═══ */}
      {step === "words" && (
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
                {/* mobile: style tabs + list */}
                <div className="wr-hidedesk" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                  <div className="wr-wtabs">
                    {styles.map((s, i) => (
                      <button key={s.name} className={"wr-wtab" + (i === wtab ? " on" : "")} onClick={() => setWtab(i)}>{s.name}</button>
                    ))}
                  </div>
                  <div className="wr-wlist mobile" style={{ overflowY: "auto", flex: 1 }}>
                    {(styles[wtab]?.words || []).map((w) => <WordRow key={w.w} w={w} on={starred.some((x) => x.w === w.w)} onClick={() => starToggle(w)} />)}
                  </div>
                </div>
                {/* desktop: 6 columns */}
                <div className="wr-wcols wr-hidemob">
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
            <button className="wr-btn" disabled={!starred.length} onClick={makeNames}>
              ✦ Turn my {starred.length || ""} word{starred.length === 1 ? "" : "s"} into names
            </button>
          </div>
        </>
      )}

      {/* ═══ 04 / 04b the names ═══ */}
      {step === "names" && (
        <>
          <div className="wr-stage" style={{ paddingTop: 18, paddingBottom: 8 }}>
            <div className="wr-nameswrap">
              {!(namesBusy && !names?.length) && <>
                <h1 className="wr-h" style={{ marginBottom: 6 }}>Six names from your {starred.length} word{starred.length === 1 ? "" : "s"}.</h1>
                <p className="wr-hint" style={{ marginBottom: 18 }}>Scored against the brief · domains checked</p>
              </>}
              {fails.names && !names?.length ? (
                <div style={{ margin: "34px 0" }}><GenFail note="The studio couldn't coin your names just now." onRetry={makeNames} /></div>
              ) : namesBusy && !names?.length ? (
                <NamingWait coined={namesProg} starred={starred} />
              ) : (
                <div className="wr-names">
                  {(names || []).map((n, i) => (
                    <button
                      key={n.name}
                      className={"wr-ncard" + (i === 0 ? " top" : "") + (i === nameIdx ? " sel" : "")}
                      style={{ animationDelay: `${Math.min(i, 6) * 0.07}s` }}
                      onClick={() => pickName(n)}
                      onMouseEnter={() => setNameIdx(i)}
                    >
                      <span className="main">
                        <span className="hd">
                          <span className="nm">{n.name}</span>
                          <span className="rt">{n.roots}</span>
                          {n.style && <span className="sty">{n.style}</span>}
                        </span>
                        {n.tagline && <span className="tg">{n.tagline}</span>}
                        {n.dom && <span className="dm"><i className={"dot" + (n.dom.free === false ? " off" : "")} />{n.dom.domain} {n.dom.free === false ? "taken" : "free"}</span>}
                        {n.alt && n.dom?.free !== true && <span className="dm"><i className="dot" />{n.alt.domain} free</span>}
                      </span>
                      <span className="sc">
                        <span className="n">{n.score}<small>/100</small></span>
                        <span className="bar"><i style={{ width: `${Math.min(100, Math.max(4, n.score))}%` }} /></span>
                        <span className="l">Brief fit</span>
                      </span>
                      <span className="go">→</span>
                    </button>
                  ))}
                  {!!names?.length && !namesBusy && (
                    <button className="wr-morecard" disabled={moreBusy} onClick={moreNames}>
                      {moreBusy
                        ? <span className="wr-load"><span className="wr-spin" /> Coining six more…</span>
                        : <span>↻ {fails.more ? "Didn't reach the studio, try again" : "Generate six more"}</span>}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="wr-foot">
            <span className="wr-hint">Pick one, it opens straight into the reveal</span>
          </div>
        </>
      )}

      {/* ═══ 05 the reveal (two columns, per the design) ═══ */}
      {step === "reveal" && picked && (
        <>
          <div className="wr-stage center">
            <div className="wr-revcols">
              <div className="left rise">
                <p className="wr-kicker" style={{ marginBottom: 14 }}>Your name</p>
                <h1 className="wr-bigname pop" style={{ textAlign: "left" }}>{picked.name}</h1>
                <p className="meaning">
                  {picked.parts?.[0] && <>{picked.parts[0].part[0].toUpperCase() + picked.parts[0].part.slice(1)}, {picked.parts[0].note}{picked.parts[1] ? <>, fused with <i>{picked.parts[1].part}</i>, {picked.parts[1].note}.</> : "."}</>}
                  {" "}{picked.tagline}
                </p>
              </div>
              <div className="right rise">
                <p className="tri">One name down. <i>Two steps to make it real.</i></p>
                <div className="rrow one">
                  <span className="i ok">✓</span>
                  <span className="mid">
                    <span className="hl"><b>Name</b><small>You've got it. Congrats!</small></span>
                  </span>
                  <span className="nm2">{picked.name}</span>
                </div>
                <button className="rrow lead" onClick={() => toStep("domain")}>
                  <span className="i">2</span>
                  <span className="mid">
                    <span className="hl"><b>Domain</b><small className="right">Claim it now</small></span>
                    {(domRows.filter((d) => d.status === "available").slice(0, 2)).map((d) => (
                      <span key={d.domain} className="dl"><i />{d.domain} · {d.price}</span>
                    ))}
                    {!domRows.some((d) => d.status === "available") && <span className="dl dim">{picked.dom?.domain || "checking…"}</span>}
                  </span>
                  <span className="ar">→</span>
                </button>
                <button className="rrow" onClick={() => toStep("brand")}>
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
          <div className="wr-foot">
            <button className="wr-link" onClick={() => toStep("names")}>← Back to the names</button>
            <span />
          </div>
        </>
      )}

      {/* ═══ 06 domain ═══ */}
      {step === "domain" && picked && (
        <>
          <div className="wr-stage center">
            <div className="wr-lwrap wr-domcols">
              <div className="dcl">
                <p className="wr-kicker" style={{ marginBottom: 12 }}>Where {picked.name} lives</p>
                <h1 className="wr-h" style={{ fontSize: 52, lineHeight: 1.05, marginBottom: 16 }}>Pick your favorite domain.</h1>
                <p className="wr-lead">Register your name in under a minute.</p>
              </div>
              <div className="dcr">
                {!board || (!board.tlds.length && fails.board) ? (
                  fails.board
                    ? <GenFail note="We couldn't check the registries just now." onRetry={() => retry("board")} />
                    : <div className="wr-load"><span className="wr-spin" /> Checking every extension…</div>
                ) : (
                  <div className="wr-doms">
                    {domRows.slice(0, domShow).map((d, i) => {
                      const on = domSel?.domain === d.domain;
                      return (
                        <button key={d.domain} className={"wr-dom" + (on ? " sel" : "")} onClick={() => setDomSel(d)}>
                          <span className={"rd" + (on ? " on" : "")} />
                          <span className="d">{d.domain}</span>
                          {i === bestDomIdx && <span className="bp">Best pick</span>}
                          <span className="st"><i className={"dot" + (d.status === "negotiable" ? " sale" : "")} />{d.status === "negotiable" ? "for sale" : "available"}</span>
                          <span className="pr">{d.price || d.offerPrice || ""}</span>
                        </button>
                      );
                    })}
                    {domRows.length > domShow && (
                      <button className="wr-link" style={{ alignSelf: "center", marginTop: 4 }} onClick={() => setDomShow((n) => n + 4)}>＋ Try another extension</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="wr-foot">
            <button className="wr-btn2 aslink" onClick={() => toStep("reveal")}>← Your name</button>
            <button className="wr-link mla" onClick={() => steps.domain === "done" ? toStep("brand") : markStep("domain", "skipped", "brand")}>Skip, create your brand →</button>
            <button className="wr-btn" style={{ maxWidth: 340 }} disabled={!domSel} onClick={registerDomain}>
              Register {domSel?.domain || ""}{domSel?.price || domSel?.offerPrice ? ` · ${domSel.price || domSel.offerPrice}` : ""} →
            </button>
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
                <p className="wr-kicker" style={{ marginBottom: 14 }}>Drag to adjust</p>
                {([["Calm", "Energetic", "ce"], ["Warm", "Cool", "wc"], ["Round", "Sharp", "rs"], ["Serif", "Sans", "ss"], ["Minimal", "Bold", "mb"]] as const).map(([l, r, k]) => (
                  <div className="wr-slider" key={k}>
                    <span>{l}</span>
                    <input type="range" min={0} max={100} value={taste.sliders[k]}
                      onChange={(e) => setTaste({ ...taste, sliders: { ...taste.sliders, [k]: Number(e.target.value) } })} />
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="wr-foot">
            <button className="wr-link" onClick={() => toStep("tshape")}>← Back</button>
            <button className="wr-btn" style={{ maxWidth: 260 }} onClick={() => { track("taste", { name: picked.name, ...taste }); refreshBookForTaste(taste); toStep("logo"); }}>Show me my logos →</button>
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
          <div className="wr-foot">
            <button className="wr-link" onClick={() => toStep("taste")}>← My taste</button>
            <button className="wr-btn2 mla" onClick={() => markStep("logo", "skipped", "book")}>Skip the logo</button>
            <button className="wr-btn" style={{ maxWidth: 220 }} disabled={!logoSel} onClick={() => { track("logo", { name: picked.name, concept: logoSel?.title }); toStep("logodone"); }}>
              Use {logoSel?.title?.replace(/ \d+$/, "") || "this"} →
            </button>
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
                <div className="wr-lhero" dangerouslySetInnerHTML={{ __html: logoSvg(logoSel.key, picked.name, lpal, { variant: logoSel.key === "appicon" ? "icon" : "light", accent: logoSel.accent, seed: logoSel.seed, font: logoSel.font, shape: lshape, height: 120 }) }} />
                <p className="wr-lead" style={{ margin: "18px 0 0" }}>
                  <b style={{ color: "#fff" }}>Why it works.</b> {whyItWorks(logoSel.key, picked.name, concept?.concept || "")}
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
                        dangerouslySetInnerHTML={{ __html: logoSvg(logoSel.key, picked.name, lpal, { variant: v, accent: logoSel.accent, seed: logoSel.seed, font: logoSel.font, shape: lshape, height: 46 }) }} />
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
          <div className="wr-foot">
            <button className="wr-link" onClick={() => toStep("logo")}>← Back to logos</button>
            <button className="wr-btn" style={{ maxWidth: 300 }} onClick={() => markStep("logo", "done", "book")}>Next: Brand book →</button>
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
                    <button className="wr-btn" style={{ maxWidth: 260 }} onClick={() => { printBook(`${picked.name} - Brand book`); track("book", { name: picked.name }); }}>↓ Download PDF</button>
                    <button className="wr-btn2" onClick={() => { setBookOpen(true); track("bookpreview", { name: picked.name }); }}>Preview</button>
                  </div>
                )}
              </div>
              {bookCtx && (
                <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 18 }}>
                  <div onClick={() => setBookOpen(true)} style={{ cursor: "pointer" }}><ScaledPage i={0} ctx={bookCtx} width={150} /></div>
                  <div onClick={() => setBookOpen(true)} style={{ cursor: "pointer", transform: "translateY(16px)" }}><ScaledPage i={6} ctx={bookCtx} width={150} /></div>
                </div>
              )}
            </div>
          </div>
          <div className="wr-foot">
            <button className="wr-link" onClick={() => toStep(logoSel ? "logodone" : "logo")}>← Logo</button>
            <button className="wr-btn" style={{ maxWidth: 320 }} onClick={() => markStep("book", "done", "socials")}>Next: Social accounts →</button>
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
          <div className="wr-foot col" style={{ gap: 8 }}>
            <button className="wr-btn" onClick={() => { track("done", { name: picked.name }); markStep("socials", "done", "done"); }}>Finish →</button>
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
              <div className="wr-trip rise">
                <span className="pill"><i className="ok">✓</i> Name <b>{picked.name}</b></span>
                <span className="joins">→</span>
                <span className="pill"><i className={steps.domain === "done" ? "ok" : "no"}>{steps.domain === "done" ? "✓" : "·"}</i> Domain <b>{steps.domain === "done" ? (domSel?.domain || picked.dom?.domain) : "later"}</b></span>
                <span className="joins">→</span>
                <span className="pill"><i className={logoSel || steps.book === "done" || steps.socials === "done" ? "ok" : "no"}>{logoSel || steps.book === "done" || steps.socials === "done" ? "✓" : "·"}</i> Brand <b>logo · book · socials</b></span>
              </div>
              {shareMsg && <p className="wr-hint rise" style={{ marginTop: 12 }}>{shareMsg}</p>}
            </div>
          </div>
          <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
            <button className="wr-btn" style={{ maxWidth: 340 }} onClick={share}>Share the news</button>
            <button className="wr-btn2" onClick={gotoAccount}>Go to my account →</button>
            <button className="wr-link" onClick={restart}>Name something else</button>
            <p className="wr-hint">Everything is saved to your account</p>
          </div>
        </>
      )}

      {/* overlays */}
      {signupOpen && <SignupModal onClose={() => setSignupOpen(false)} onUser={(u) => { setUser(u); setSignupOpen(false); gotoAccount(); }} />}
      {bookOpen && bookCtx && <BookPreview ctx={bookCtx} onClose={() => setBookOpen(false)} />}
      {bookCtx && <BookPrint ctx={bookCtx} />}

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
function SignupModal({ onClose, onUser }: { onClose: () => void; onUser: (u: WUser) => void }) {
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
        <h3>Start naming, free.</h3>
        <p>Save your names and pick up where you left off.</p>
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

/* ── The Known As landing (handoff 4b "The Wordmark"): white page, giant
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
      // Phones break the wordmark onto two lines and size it to "KNOWN".
      wm.style.whiteSpace = "nowrap";
      wm.style.fontSize = "200px";
      if (mobile) wm.textContent = "KNOWN";
      const w = wm.offsetWidth;
      if (mobile) wm.textContent = "KNOWN AS";
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
        <span className="m2">Menu ::</span>
      </div>
      <div className="hero">
        <p className="tag">Not a generator, a perspective.<br />The name you'll be known as.</p>
      </div>
      <span className="menu">Menu ::</span>
      <div className="wmrow"><span className="wm" ref={wmRef}>KNOWN AS</span></div>
      <form className="brief" onSubmit={submit}>
        <input ref={inputRef} type="text" placeholder="Describe what you're building…"
          value={sentence} onChange={(e) => setSentence(e.target.value)} />
        <button type="submit">Name it <span className="arr">→</span></button>
      </form>
      <div className="ink" aria-hidden="true">
        <div className="goo">
          <span className="b a" />
          <span className="b bb" />
          <span className="b c" />
          <span className="b follow" ref={followRef} />
        </div>
      </div>
      <div className="bbar">
        <span className="line">Name, domain &amp; brand in minutes</span>
        <span className="links">
          <button onClick={onHow}>How it works</button>
          <i>/</i>
          <button onClick={onLogin}>{loggedIn ? "My account" : "Log in"}</button>
          <span className="lang">EN</span>
        </span>
      </div>
    </div>
  );
}

/* ── 02·b Brands you like: a 12-card swipe deck that teaches the studio
   the founder's naming taste (design handoff 02r-02b) ── */
function BrandSwipe({ liked, disliked, onJudge, onBack, onNext }: {
  liked: string[]; disliked: string[];
  onJudge: (name: string, like: boolean) => void; onBack: () => void; onNext: () => void;
}) {
  const [idx, setIdx] = useState(liked.length + disliked.length < SWIPE_DECK.length ? liked.length + disliked.length : SWIPE_DECK.length);
  const [dx, setDx] = useState(0);
  const [fly, setFly] = useState<0 | 1 | -1>(0);
  const drag = useRef<{ x0: number; on: boolean }>({ x0: 0, on: false });
  const done = idx >= SWIPE_DECK.length;
  const card = SWIPE_DECK[idx];

  const judge = (like: boolean) => {
    if (done || fly) return;
    setFly(like ? 1 : -1);
    const name = card.name;
    setTimeout(() => { onJudge(name, like); setIdx((i) => i + 1); setFly(0); setDx(0); }, 240);
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
            <p className="wr-kicker" style={{ marginBottom: 10 }}>Brands you like</p>
            <h1 className="wr-h" style={{ fontSize: 36, marginBottom: 10 }}>Which names would you be proud of?</h1>
            <p className="wr-lead" style={{ marginBottom: 22 }}>Swipe on real brands. Your taste shapes the words and the names.</p>
            <div className="lists">
              <p className="llbl">You like · {liked.length}</p>
              <div className="pills">{liked.map((n) => <span key={n} className="pl on">{n}</span>)}{!liked.length && <span className="none">Nothing yet</span>}</div>
              <p className="llbl" style={{ marginTop: 14 }}>Not for you · {disliked.length}</p>
              <div className="pills">{disliked.map((n) => <span key={n} className="pl off">{n}</span>)}{!disliked.length && <span className="none">Nothing yet</span>}</div>
            </div>
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
                  {SWIPE_DECK[idx + 2] && <div className="card back2" />}
                  {SWIPE_DECK[idx + 1] && <div className="card back1" />}
                  <div
                    className="card top"
                    style={{ transform: `translateX(${px}px) rotate(${rot}deg)`, transition: fly || !drag.current.on ? "transform 0.24s ease" : "none" }}
                    onPointerDown={(e) => { drag.current = { x0: e.clientX, on: true }; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
                    onPointerMove={(e) => { if (drag.current.on) setDx(e.clientX - drag.current.x0); }}
                    onPointerUp={() => {
                      const d = dx; drag.current.on = false;
                      if (d > 80) judge(true); else if (d < -80) judge(false); else setDx(0);
                    }}
                  >
                    <span className="prog">{idx + 1} of {SWIPE_DECK.length}</span>
                    {(px > 36) && <span className="stamp like">Like</span>}
                    {(px < -36) && <span className="stamp nope">Nope</span>}
                    <span className="bn">{card.name}</span>
                    <span className="bd">{card.why}</span>
                    <span className="tags"><i>{card.style}</i><i>{card.sector}</i></span>
                  </div>
                </div>
                <div className="acts">
                  <button className="act no" onClick={() => judge(false)} aria-label="Not for you">✕</button>
                  <span className="hint wr-hidemob">← or → keys</span>
                  <button className="act yes" onClick={() => judge(true)} aria-label="Like">♥</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="wr-foot">
        <button className="wr-link" onClick={onBack}>← Back</button>
        <button className="wr-btn2 mla" onClick={onNext}>Skip</button>
        <button className="wr-btn" style={{ maxWidth: 300 }} onClick={onNext}>Show me inspiring words →</button>
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
      const st = k === "Elegant serif" ? { fontFamily: "var(--bookserif)", fontWeight: 500 }
        : k === "Clean sans" ? { fontWeight: 600 }
        : k === "Strong caps" ? { fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.06em", fontSize: 26 }
        : { fontFamily: "var(--mono)", fontWeight: 500, textTransform: "lowercase" as const };
      return <span className="v type" style={st}>{k === "Technical mono" ? name.toLowerCase() : name}</span>;
    }
    if (step === "tshape") {
      return <span className="v shape">{
        k === "Round & soft" ? <i style={{ borderRadius: "50%" }} /> :
        k === "Sharp & angular" ? <i style={{ borderRadius: 2, transform: "rotate(45deg) scale(.82)" }} /> :
        k === "Organic" ? <i style={{ borderRadius: "58% 42% 55% 45% / 45% 58% 42% 55%" }} /> :
        <i style={{ borderRadius: 8 }} />
      }</span>;
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
      <div className="wr-foot wr-tfoot">
        <button className="wr-link" onClick={onBack}>← Back</button>
        <button className="wr-btn2 mla" onClick={onNext}>Skip</button>
        <button className="wr-btn" style={{ maxWidth: 180 }} onClick={onNext}>Next →</button>
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
function DomAdd({ onAdd }: { onAdd: (d: string) => void }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button className="wr-opt add" onClick={() => setOpen(true)}>＋ other</button>;
  return (
    <span className="wr-opt chip">.
      <input autoFocus placeholder="io" style={{ width: "5ch" }}
        onBlur={(e) => { const v = e.target.value.trim().toLowerCase().replace(/^\./, "").replace(/[^a-z.]/g, ""); if (v) onAdd(v); setOpen(false); }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); (e.target as HTMLInputElement).blur(); } }} />
    </span>
  );
}


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
