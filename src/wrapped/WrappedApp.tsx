// The Naming Studio — the "Wrapped" flow. One black stage:
// 00 landing → 01 the ask → 02 brief wrapped → 03 the words → 04 the names
// (gated when signed out) → 05 the reveal → then the own-it hub:
// 06 domain → 06b/c logo → 07 brand book → 08 socials → 09 all set.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./wrapped.css";
import {
  GOOGLE_CLIENT_ID, SAMPLE, authGoogle, clearSnap, coinNames, fetchDomainBoard, fetchMe,
  loadGsi, loadSession, loadSnap, newProcess, processId, putSearch, registrarUrl, sampleBook,
  loadEta, recordEta, saveSnap, setProcessId, setTestMode, track, wrapApi, type NameStream,
  type DomainBoardData, type DomainCard, type SavedSearch, type WBook, type WConcept,
  type WName, type WStyle, type WTerritory, type WUser, type WWord,
} from "./api";
import { buildLogoPack, logoConcepts, logoSvg, toPalette, whyItWorks, type LogoConcept, type LogoFont } from "./logos";
import { download } from "./zip";
import { BookPreview, BookPrint, printBook, ScaledPage, type BookCtx } from "./Book";

type Step = "land" | "how" | "ask" | "brief" | "refine" | "words" | "names" | "reveal" | "domain" | "logo" | "logodone" | "book" | "socials" | "done";
const FLOW_NO: Partial<Record<Step, number>> = { ask: 1, brief: 2, words: 3, names: 4, reveal: 5 };
const OWN_STEPS: Step[] = ["domain", "logo", "logodone", "book", "socials"];
const STEPS_ALL: Step[] = ["land", "ask", "brief", "words", "names", "reveal", "domain", "logo", "logodone", "book", "socials", "done"];

// The URL mirrors the step (/2-concept, /4-names…), so the nav shows where you
// are and the browser's back/forward walk the flow.
const STEP_SLUG: Record<Step, string> = {
  land: "", how: "how-it-works", ask: "1-brief", brief: "2-concept", refine: "2-refine", words: "3-words", names: "4-names", reveal: "5-reveal",
  domain: "6-domain", logo: "7-logo", logodone: "7-logo-chosen", book: "8-brand-book", socials: "9-socials", done: "10-done",
};
const SLUG_STEP: Record<string, Step> = Object.fromEntries(
  (Object.entries(STEP_SLUG) as [Step, string][]).filter(([, v]) => v).map(([k, v]) => [v, k]),
) as Record<string, Step>;
const pathSlug = () => {
  const base = ((import.meta as any).env.BASE_URL || "/").replace(/\/$/, "");
  return window.location.pathname.replace(base, "").replace(/^\/+|\/+$/g, "");
};

const EXAMPLES = ["A budgeting app for students", "A calm coffee brand", "An AI tool for lawyers"];
const SOCIALS = [
  { name: "Instagram", desc: "Photos, stories and reels", url: "https://www.instagram.com/accounts/emailsignup/" },
  { name: "X", desc: "Updates and conversation", url: "https://x.com/i/flow/signup" },
  { name: "TikTok", desc: "Short video", url: "https://www.tiktok.com/signup" },
  { name: "LinkedIn", desc: "Company page", url: "https://www.linkedin.com/company/setup/new/" },
];

export function WrappedApp({ test, resume, go }: { test: boolean; resume?: string; go?: string }) {
  const [step, setStep] = useState<Step>(test ? "land" : "land");
  const [sentence, setSentence] = useState(test ? "An AI naming studio that gives founders a strategist's rigor in minutes" : "");
  const [chips, setChips] = useState<string[]>(test ? ["B2B SaaS", "Global", "Founders"] : []);
  const [chipsBusy, setChipsBusy] = useState(false);
  const [addingChip, setAddingChip] = useState(false);
  const [concept, setConcept] = useState<WConcept | null>(test ? SAMPLE.concept : null);
  const [feelOpts, setFeelOpts] = useState<string[]>(test ? [SAMPLE.concept.concept, ...(SAMPLE.concept.alts || [])] : []);
  // The refine page's founder preferences, folded into every later generation.
  const [prefs, setPrefs] = useState<{ tone: string; style: string; length: string; langs: string[]; avoid: string[]; terr: string[]; doms: string[] }>({
    tone: "Balanced", style: "Any", length: "Any", langs: ["English"], avoid: [], terr: [], doms: [],
  });
  const [styles, setStyles] = useState<WStyle[] | null>(test ? SAMPLE.styles : null);
  const [wtab, setWtab] = useState(0);
  const [starred, setStarred] = useState<WWord[]>(test ? [SAMPLE.styles[0].words[0], SAMPLE.styles[0].words[1], SAMPLE.styles[1].words[0], SAMPLE.styles[1].words[2]] : []);
  const [names, setNames] = useState<WName[] | null>(test ? SAMPLE.names : null);
  const [nameIdx, setNameIdx] = useState(0);
  const [namesBusy, setNamesBusy] = useState(false);
  const [namesProg, setNamesProg] = useState(0);      // names coined so far (drives the wait screen)
  const waitStart = useRef(0);
  const [moreBusy, setMoreBusy] = useState(false);
  const [picked, setPicked] = useState<WName | null>(test ? SAMPLE.names[0] : null);
  const [board, setBoard] = useState<DomainBoardData | null>(null);
  const [domSel, setDomSel] = useState<DomainCard | null>(null);
  const [domShow, setDomShow] = useState(4);
  const [logoSeed, setLogoSeed] = useState(0);
  const [logoSel, setLogoSel] = useState<LogoConcept | null>(null);
  const [book, setBook] = useState<WBook | null>(test ? sampleBook("Aurova") : null);
  const [steps, setSteps] = useState<SavedSearch["steps"]>({});
  const [user, setUser] = useState<WUser | null>(() => loadSession()?.user || null);
  const [bookOpen, setBookOpen] = useState(false);
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
  const bookFetch = (n: WName) => {
    if (!bookPre.current.has(n.name)) {
      bookPre.current.set(n.name, wrapApi.book(sentence.trim(), chips, concept?.concept || "", n.name, n.parts || []));
    }
    return bookPre.current.get(n.name)!;
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
    saveSnap({ step, sentence, chips, concept, styles, starred, names, picked, steps, logoSel, logoSeed, book, prefs, feelOpts });
  }, [test, step, sentence, chips, concept, styles, starred, names, picked, steps, logoSel, logoSeed, book, prefs, feelOpts]);

  function persist(over: Partial<SavedSearch> = {}) {
    if (test || !sentence.trim()) return;
    const status: SavedSearch["status"] = steps.domain === "done" || over.steps?.domain === "done" ? "claimed" : (names?.length ? "ready" : "exploring");
    putSearch({
      id: processId(), at: startedAt.current, updated: Date.now(),
      sentence: sentence.trim(), chips, concept, starred, names: names || undefined,
      picked, steps, status,
      logo: logoSel ? { key: logoSel.key, title: logoSel.title, seed: logoSel.seed, accent: logoSel.accent, font: logoSel.font } : null,
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
    const terrs = (concept?.territories || []).filter((t) => !prefs.terr.length || prefs.terr.includes(t.name));
    const extras = [
      { name: "Motion", desc: "movement, drive, pace" },
      { name: "Clarity", desc: "clear, pure, true" },
      { name: "Languages", desc: "the idea in other tongues" },
      { name: "Craft", desc: "made with care, by hand" },
      { name: "Texture", desc: "how it feels to the touch" },
    ];
    return [...terrs, ...extras].slice(0, 6);
  };
  const wordsKey = () =>
    (concept?.concept || "") + "|" + JSON.stringify([prefs.terr, prefs.langs, prefs.tone, prefs.style, prefs.avoid]) + "|" + retryTick;
  const wordsBusyMore = useRef(false);
  const wordsBatches = useRef(0);

  useEffect(() => { // words: SIX one-style calls in parallel the instant the concept lands,
    // each column rendered the moment it arrives; a failed column retries once.
    if (test || !conceptReady || styles) return;
    const key = wordsKey();
    if (wordsReq.current === key) return;
    wordsReq.current = key;
    wordsBatches.current = 0;
    const slots: (WStyle | null)[] = new Array(6).fill(null);
    let failed = 0;
    const s = sentence.trim();
    const run = (i: number, st: WTerritory, attempt: number) => {
      wrapApi.wordStyle(s, concept!.concept, concept!.territories, st, i, prefs).then((r) => {
        if (wordsReq.current !== key) return; // superseded
        if (r?.styles?.[0]?.words?.length) {
          slots[i] = r.styles[0];
          setStyles(slots.filter(Boolean) as WStyle[]);
          fail("words", false);
        } else if (attempt < 1) {
          run(i, st, attempt + 1); // one quiet retry so columns never just go missing
        } else {
          failed++;
          if (failed >= 6) fail("words", true);
        }
      });
    };
    wordsPlan().forEach((st, i) => run(i, st, 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, concept, conceptReady, styles, sentence, retryTick, prefs]);

  // Page 3 infinite scroll: nearing the bottom appends 16 fresh words per style.
  function loadMoreWords() {
    if (test || !styles || !concept || wordsBusyMore.current || wordsBatches.current >= 3) return;
    wordsBusyMore.current = true;
    wordsBatches.current++;
    const key = wordsReq.current;
    const s = sentence.trim();
    let pending = styles.length;
    styles.forEach((st, i) => {
      wrapApi.wordStyle(s, concept.concept, concept.territories, { name: st.name, desc: "" }, i, { ...prefs, exclude: st.words.map((w) => w.w) }).then((r) => {
        pending--;
        if (pending <= 0) wordsBusyMore.current = false;
        if (wordsReq.current !== key || !r?.styles?.[0]?.words?.length) return;
        const fresh = r.styles[0].words;
        setStyles((cur) => cur?.map((c, j) => {
          if (j !== i) return c;
          const seen = new Set(c.words.map((w) => w.w));
          return { ...c, words: [...c.words, ...fresh.filter((w) => !seen.has(w.w))] };
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
    if (t === "brief" || t === "refine" || t === "words") return !!d.sentence.trim();
    if (t === "names") return !!(d.names?.length || d.starred.length);
    return !!d.picked;
  };
  const urlFor = (t: Step) => {
    const base = (import.meta as any).env.BASE_URL || "/";
    return base + STEP_SLUG[t] + (test ? (STEP_SLUG[t] ? "?test" : "?test") : "");
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
    const pack = await buildLogoPack(picked.name, logoSel.key, logoSel.accent, logoSel.seed, book?.palette, logoSel.font);
    download(pack.blob, pack.filename);
    track("logopack", { name: picked.name, concept: logoSel.title });
  }

  function share() {
    const text = `${picked?.name || "My new name"} — found with The Naming Studio`;
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
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && step === "names" && !typing && names?.length && !gated) {
        e.preventDefault();
        setNameIdx((i) => Math.min(names.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1))));
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        if (step === "ask") { e.preventDefault(); submitAsk(); }
        else if (!typing) {
          if (step === "brief" && concept) { e.preventDefault(); toStep("words"); }
          else if (step === "words" && starred.length) { e.preventDefault(); makeNames(); }
          else if (step === "names" && names?.length && !gated) { e.preventDefault(); pickName(names[Math.min(nameIdx, names.length - 1)]); }
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
  const flowNo = FLOW_NO[step];
  const inOwn = OWN_STEPS.includes(step);
  const gated = step === "names" && !!names?.length && !user && !!GOOGLE_CLIENT_ID && !test;

  const ownTab = (k: "domain" | "logo" | "book" | "socials") => {
    const active = (k === "logo" && (step === "logo" || step === "logodone")) || step === k;
    const done = steps[k] === "done";
    const target: Step = k === "logo" ? (logoSel ? "logodone" : "logo") : k;
    return (
      <button key={k} className={"wr-tab" + (active ? " on" : "") + (done ? " done" : "")} onClick={() => toStep(target)}>
        {done && <span className="ck">✓</span>}
        {{ domain: "1 · Domain", logo: "2 · Logo", book: "3 · Brand book", socials: "4 · Socials" }[k]}
      </button>
    );
  };

  const backTarget: Partial<Record<Step, Step>> = {
    ask: "land", brief: "ask", refine: "brief", words: "brief", names: "words", reveal: "names",
    domain: "reveal", logo: "domain", logodone: "logo", book: "logodone", socials: "book",
  };
  // Forward mirrors back, but only where the run's data already allows the step.
  const fwdTarget = (): Step | null => {
    const t: Step | null =
      step === "ask" ? (sentence.trim().length >= 4 ? "brief" : null) :
      step === "brief" || step === "refine" ? (conceptReady ? "words" : null) :
      step === "words" ? (names?.length ? "names" : null) :
      step === "names" ? (picked && !gated ? "reveal" : null) :
      step === "reveal" ? "domain" :
      step === "domain" ? "logo" :
      step === "logo" ? (logoSel ? "logodone" : "book") :
      step === "logodone" ? "book" :
      step === "book" ? "socials" :
      step === "socials" ? (steps.socials ? "done" : null) : null;
    return t;
  };

  const pal = toPalette(book?.palette);
  const bookCtx: BookCtx | null = picked && book ? {
    name: picked.name,
    domain: domSel?.domain || picked.dom?.domain || `${picked.name.toLowerCase()}.com`,
    book, logoKey: logoSel?.key || "sunrise", logoAccent: logoSel?.accent || "dawn", logoSeed: logoSel?.seed ?? 0, logoFont: logoSel?.font,
  } : null;

  return (
    <div className="wr">
      {(step === "land" || step === "reveal" || step === "done") && <div className="wr-glow" />}

      {/* top bar: the logo never moves; the back arrow lives at the far right */}
      <div className="wr-top">
        <button className="wr-brand" onClick={() => (step === "land" ? undefined : restart())}>
          <span className="bx"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M 2 8.5 A 4 4 0 0 1 10 8.5 Z" fill="#000" /></svg></span>
          <span className="bt">the naming studio</span>
        </button>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
          {backTarget[step] && <button className="wr-back" onClick={() => toStep(backTarget[step]!)} aria-label="Back">‹</button>}
          {flowNo
            ? <span className="wr-count"><b>{flowNo}</b> of 5</span>
            : inOwn && picked
              ? <span className="wr-topname">{picked.name}</span>
              : step === "land"
                ? <button className="wr-link" onClick={() => toStep("how")}>How it works</button>
                : step === "how"
                  ? <span className="wr-tab on" style={{ cursor: "default" }}>How it works</span>
                : step === "done" ? <span className="wr-count">done</span> : null}
          {backTarget[step] && (fwdTarget()
            ? <button className="wr-back" onClick={() => toStep(fwdTarget()!)} aria-label="Forward">›</button>
            : <span className="wr-back" style={{ opacity: 0.25, cursor: "default" }}>›</span>)}
        </span>
      </div>

      {flowNo && (
        <div className="wr-prog">{[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= flowNo ? "on" : ""} />)}</div>
      )}
      {inOwn && (
        <div className="wr-tabs">{(["domain", "logo", "book", "socials"] as const).map(ownTab)}</div>
      )}

      {/* ═══ 00 landing ═══ */}
      {step === "land" && (
        <div className="wr-land">
          <div className="hero">
            <h1 className="wr-h rise" style={{ margin: "0 0 18px" }}>Find your name.<br />Own it.</h1>
            <p className="wr-lead rise" style={{ maxWidth: 470, margin: "0 0 34px" }}>
              Describe what you're building. Get a name with its domain, logo and brand book, in minutes.
            </p>
            <div className="wr-herobtns rise">
              <button className="wr-btn herocta" onClick={() => startFlow(sentence)}>Start naming →</button>
              {user
                ? <button className="wr-gbtn herocta" onClick={gotoAccount}><span className="gi">G</span> My account →</button>
                : <GoogleCTA onDone={gotoAccount} />}
            </div>
            <div className="wr-eg rise">
              {EXAMPLES.map((x) => <button key={x} onClick={() => startFlow(x)}>{x}</button>)}
            </div>
          </div>
          <div className="wr-youget2">
            <span className="line">A name, its domain, logo and brand book, in minutes.</span>
          </div>
        </div>
      )}

      {/* ═══ 00b how it works ═══ */}
      {step === "how" && (
        <div className="wr-stage" style={{ paddingTop: 26 }}>
          <div className="wr-hiw">
            <h1 className="wr-h" style={{ textAlign: "center", margin: "10px 0 8px" }}>From one sentence to a name you own.</h1>
            <p className="wr-lead" style={{ textAlign: "center", color: "var(--text3)", marginBottom: 34 }}>Five steps. About five minutes.</p>
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
            <button className="wr-link" onClick={() => toStep("refine")}>Not quite? Refine the brief</button>
            <button className="wr-btn" style={{ maxWidth: 300 }} disabled={!conceptReady} onClick={() => toStep("words")}>Show me the words →</button>
          </div>
        </>
      )}

      {/* ═══ 02b refine the brief ═══ */}
      {step === "refine" && (
        <div className="wr-stage" style={{ paddingTop: 8 }}>
          <div className="wr-refine">
            <p className="wr-kicker" style={{ marginBottom: 10 }}>Refine your brief</p>
            <div className="headline">
              <h1 className="wr-h" style={{ fontSize: 34, margin: 0 }}>
                Your name should feel like <span className="wr-cpill">{concept?.concept || "…"}</span>
              </h1>
              <span className="wr-hint">Updates as you change things</span>
            </div>
            <Grow value={sentence} onChange={setSentence} onEnter={() => conceptReady && toStep("words")} placeholder="What are you building?" boxed />
            <div className="cols">
              <div>
                <p className="lbl">Feels like</p>
                <div className="opts">
                  {(feelOpts.length ? feelOpts : concept ? [concept.concept] : []).map((f) => (
                    <button key={f} className={"wr-opt" + (concept?.concept === f ? " on" : "")}
                      onClick={() => { if (!concept || concept.concept === f) return; setConcept({ ...concept, concept: f }); setStyles(null); setNames(null); namesPre.current = null; morePre.current = null; }}>
                      {concept?.concept === f ? "✓ " : ""}{f}
                    </button>
                  ))}
                </div>
                <p className="lbl">Tone</p>
                <div className="opts">
                  {["Friendly", "Balanced", "Serious", "Playful"].map((t) => (
                    <button key={t} className={"wr-opt" + (prefs.tone === t ? " on" : "")} onClick={() => setPrefs({ ...prefs, tone: t })}>{prefs.tone === t ? "✓ " : ""}{t}</button>
                  ))}
                </div>
                <p className="lbl">Length</p>
                <div className="opts">
                  {["Short · 1–2 syllables", "Medium", "Any"].map((t) => (
                    <button key={t} className={"wr-opt" + (prefs.length === t ? " on" : "")} onClick={() => setPrefs({ ...prefs, length: t })}>{prefs.length === t ? "✓ " : ""}{t}</button>
                  ))}
                </div>
                <p className="lbl">Space</p>
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
              <div>
                <p className="lbl">Draw from</p>
                <div className="opts">
                  {(concept?.territories || []).map((t) => {
                    const active = !prefs.terr.length || prefs.terr.includes(t.name);
                    return (
                      <button key={t.name} className={"wr-opt" + (active ? " on" : "")}
                        onClick={() => {
                          const all = (concept?.territories || []).map((x) => x.name);
                          const cur = prefs.terr.length ? prefs.terr : all;
                          const next = active ? cur.filter((x) => x !== t.name) : [...cur, t.name];
                          if (!next.length) return; // keep at least one
                          setPrefs({ ...prefs, terr: next.length === all.length ? [] : next });
                          setStyles(null); setNames(null); namesPre.current = null; morePre.current = null;
                        }}>{active ? "✓ " : ""}{t.name}</button>
                    );
                  })}
                </div>
                <p className="lbl">Name style</p>
                <div className="opts">
                  {["Invented", "Real word", "Compound", "Any"].map((t) => (
                    <button key={t} className={"wr-opt" + (prefs.style === t ? " on" : "")} onClick={() => setPrefs({ ...prefs, style: t })}>{prefs.style === t ? "✓ " : ""}{t}</button>
                  ))}
                </div>
                <p className="lbl">Must work in</p>
                <div className="opts">
                  {["English", "French", "Spanish", "German"].map((t) => {
                    const on = prefs.langs.includes(t);
                    return <button key={t} className={"wr-opt" + (on ? " on" : "")}
                      onClick={() => setPrefs({ ...prefs, langs: on ? prefs.langs.filter((x) => x !== t) : [...prefs.langs, t] })}>{on ? "✓ " : ""}{t}</button>;
                  })}
                </div>
                <p className="lbl">Domain</p>
                <div className="opts">
                  <button className={"wr-opt" + (!prefs.doms.length ? " on" : "")}
                    onClick={() => { if (prefs.doms.length) { setPrefs({ ...prefs, doms: [] }); setNames(null); namesPre.current = null; morePre.current = null; } }}>
                    {!prefs.doms.length ? "✓ " : ""}Any
                  </button>
                  {["com", "ai", ...prefs.doms.filter((d) => !["com", "ai"].includes(d))].map((d) => {
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
                <p className="lbl">Avoid</p>
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
            onClick={() => { if (wordsReq.current !== wordsKey()) { setStyles(null); setNames(null); namesPre.current = null; morePre.current = null; } toStep("words"); }}>
            Show me the words →
          </button>
        </div>
      )}

      {/* ═══ 03 the words ═══ */}
      {step === "words" && (
        <>
          <div className="wr-stage" style={{ paddingTop: 16 }}>
            <h1 className="wr-h" style={{ marginBottom: 6 }}>Star the words that inspire you.</h1>
            <p className="wr-hint" style={{ marginBottom: 14 }}>
              {styles ? `${styles.reduce((a, s) => a + s.words.length, 0)} words · scroll` : ""}
            </p>
            {!styles ? (
              fails.words || fails.concept
                ? <div style={{ margin: "40px 0" }}><GenFail note="We couldn't gather your words just now." onRetry={() => { retry("concept"); retry("words"); }} /></div>
                : <div className="wr-load" style={{ margin: "40px 0" }}>
                    <span className="wr-spin" /> Finding words for “{concept?.concept || "your brief"}”…
                  </div>
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
                <MoreWordsSentinel onMore={loadMoreWords} />
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
                <div className={gated ? "wr-gatecols" : "wr-names"}>
                  {(gated ? (names || []).slice(0, 1) : names || []).map((n, i) => (
                    <button
                      key={n.name}
                      className={"wr-ncard" + (i === 0 ? " top" : "") + (!gated && i === nameIdx ? " sel" : "")}
                      style={{ animationDelay: `${Math.min(i, 6) * 0.07}s` }}
                      onClick={() => pickName(n)}
                      onMouseEnter={() => !gated && setNameIdx(i)}
                    >
                      <span className="main">
                        <span className="hd">
                          <span className="nm">{n.name}</span>
                          <span className="rt">{n.roots}</span>
                          {gated && i === 0 && <span className="wr-freebadge">Free preview</span>}
                        </span>
                        {n.tagline && <span className="tg">{n.tagline}</span>}
                        {n.dom && <span className="dm"><i className={"dot" + (n.dom.free === false ? " off" : "")} />{n.dom.domain} {n.dom.free === false ? "taken" : "free"}</span>}
                      </span>
                      <span className="sc">
                        <span className="n">{n.score}<small>/100</small></span>
                        <span className="bar"><i style={{ width: `${Math.min(100, Math.max(4, n.score))}%` }} /></span>
                        <span className="l">Brief fit</span>
                      </span>
                      <span className="go">→</span>
                    </button>
                  ))}
                  {gated && (
                    <div className="left">
                      <p className="wr-hint" style={{ margin: "8px 0 2px" }}>+ {(names?.length || 6) - 1} more names, locked</p>
                      {(names || []).slice(1).map((n) => (
                        <div key={n.name} className="wr-lockrow">
                          <span>🔒</span><b>{n.name}</b><span className="sc">{n.score}/100</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {gated && <SignupGate onUser={(u) => setUser(u)} count={names?.length || 6} />}
                  {!gated && !!names?.length && !namesBusy && (
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
          {!gated && (
            <div className="wr-foot">
              <span className="wr-hint">Pick one, it opens straight into the reveal</span>
            </div>
          )}
        </>
      )}

      {/* ═══ 05 the reveal ═══ */}
      {step === "reveal" && picked && (
        <>
          <div className="wr-stage center wr-reveal">
            <div style={{ position: "relative", zIndex: 2 }}>
              <p className="wr-kicker rise" style={{ marginBottom: 16 }}>Your name</p>
              <h1 className="wr-bigname pop">{picked.name}</h1>
              <p className="wr-tagline rise" style={{ margin: "14px 0 22px" }}>{picked.tagline}</p>
              <div className="wr-partcards rise">
                {(picked.parts || []).map((p) => (
                  <div key={p.part} className="wr-partcard wr-frost"><b>{p.part}</b><span>{p.note}</span></div>
                ))}
              </div>
              <div className="wr-next rise" style={{ marginTop: 28 }}>
                <p className="head"><i className="ck">✓</i> What's next</p>
                <button className="row lead" onClick={() => toStep("domain")}>
                  <span className="i">1</span>
                  <span className="mid">
                    <span className="tt">Claim the domain</span>
                    {(domRows.filter((d) => d.status === "available").slice(0, 2)).map((d) => (
                      <span key={d.domain} className="dl"><i />{d.domain} · {d.price}</span>
                    ))}
                    {!domRows.some((d) => d.status === "available") && <span className="ss">{picked.dom?.domain || "checking…"}</span>}
                  </span>
                  <span className="ar">→</span>
                </button>
                <button className="row" onClick={() => toStep("logo")}>
                  <span className="i">2</span>
                  <span className="mid"><span className="tt">Find your perfect logo</span><span className="ss">Nine logo concepts from the name</span></span>
                  <span className="ar">→</span>
                </button>
                <button className="row" onClick={() => toStep("book")}>
                  <span className="i">3</span>
                  <span className="mid">
                    <span className="tt">Open your brand book</span>
                    <span className="ss">
                      {(book?.palette || []).slice(0, 3).map((c) => <i key={c.name} className="sw" style={{ background: c.hex }} />)}
                      voice, colours, story
                    </span>
                  </span>
                  <span className="ar">→</span>
                </button>
                <button className="row" onClick={() => toStep("socials")}>
                  <span className="i">4</span>
                  <span className="mid"><span className="tt">Create your social accounts</span><span className="ss">Instagram · X · TikTok · LinkedIn</span></span>
                  <span className="ar">→</span>
                </button>
              </div>
            </div>
          </div>
          <div className="wr-foot">
            <button className="wr-link" onClick={() => toStep("names")}>← Back to the names</button>
            <button className="wr-btn" style={{ maxWidth: 340 }} onClick={() => toStep("domain")}>
              Claim {domSel?.domain || picked.dom?.domain || "the domain"} →
            </button>
          </div>
        </>
      )}

      {/* ═══ 06 domain ═══ */}
      {step === "domain" && picked && (
        <>
          <div className="wr-stage center">
            <div className="inner-nar">
              <h1 className="wr-h" style={{ marginBottom: 6 }}>Where {picked.name} lives</h1>
              <p className="wr-lead" style={{ marginBottom: 22 }}>Pick your address. Register your name in under a minute.</p>
              {!board || (!board.tlds.length && fails.board) ? (
                fails.board
                  ? <GenFail note="We couldn't check the registries just now." onRetry={() => retry("board")} />
                  : <div className="wr-load"><span className="wr-spin" /> Checking every extension…</div>
              ) : (
                <div className="wr-doms">
                  {domRows.slice(0, domShow).map((d, i) => (
                    <button key={d.domain} className={"wr-dom" + (domSel?.domain === d.domain ? " sel" : "")} onClick={() => setDomSel(d)}>
                      <span className={"dot" + (d.status === "negotiable" ? " sale" : "")} />
                      <span className="d">{d.domain}</span>
                      {i === bestDomIdx && <span className="bp">Best pick</span>}
                      <span className="st">{d.status === "negotiable" ? "for sale" : "available"}</span>
                      <span className="pr">{d.price || d.offerPrice || ""}</span>
                    </button>
                  ))}
                  {domRows.length > domShow && (
                    <button className="wr-btn2" style={{ alignSelf: "flex-start" }} onClick={() => setDomShow((n) => n + 4)}>＋ Try another extension</button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="wr-foot col" style={{ gap: 8 }}>
            <button className="wr-btn" disabled={!domSel} onClick={registerDomain}>
              Register {domSel?.domain || ""}{domSel?.price || domSel?.offerPrice ? ` · ${domSel.price || domSel.offerPrice}` : ""} →
            </button>
            {steps.domain === "done"
              ? <button className="wr-btn2" onClick={() => toStep("logo")}>Next: Logo →</button>
              : <button className="wr-link" onClick={() => markStep("domain", "skipped", "logo")}>Skip for now</button>}
          </div>
        </>
      )}

      {/* ═══ 06b logo grid ═══ */}
      {step === "logo" && picked && (
        <>
          <div className="wr-stage center">
            <div className="inner-nar">
              <p className="wr-kicker" style={{ marginBottom: 8 }}>Your logo</p>
              <h1 className="wr-h" style={{ marginBottom: 8 }}>Give {picked.name} a face.</h1>
              <p className="wr-lead" style={{ marginBottom: 18, maxWidth: 460 }}>
                Nine concepts drawn from the story of the name. Pick one; it flows into your brand book.
              </p>
              {Array.from({ length: logoSeed + 1 }, (_, round) => (
                <div className="wr-lgrid" key={round} style={{ marginTop: round ? 12 : 0 }}>
                  {logoConcepts(round).map((c) => {
                    const on = logoSel?.key === c.key && logoSel?.seed === c.seed;
                    return (
                      <button key={c.key + round} className={"wr-ltile" + (on ? " sel" : "")} onClick={() => setLogoSel(on ? null : c)}>
                        {on && <span className="ck">✓</span>}
                        <span className="lt" dangerouslySetInnerHTML={{ __html: logoSvg(c.key, picked.name, pal, { variant: c.key === "appicon" ? "icon" : "tile", accent: c.accent, seed: c.seed, height: 54 }) }} />
                        <span className="ln">{c.title}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
              <button className="wr-link" style={{ marginTop: 12 }} onClick={() => setLogoSeed((s) => s + 1)}>↻ Nine more concepts</button>
            </div>
          </div>
          <div className="wr-foot col" style={{ gap: 8 }}>
            <button className="wr-btn" disabled={!logoSel} onClick={() => { track("logo", { name: picked.name, concept: logoSel?.title }); toStep("logodone"); }}>
              Use {logoSel?.title || "this concept"} →
            </button>
            <button className="wr-link" onClick={() => markStep("logo", "skipped", "book")}>Skip the logo</button>
          </div>
        </>
      )}

      {/* ═══ 06c your logo ═══ */}
      {step === "logodone" && picked && logoSel && (
        <>
          <div className="wr-stage" style={{ paddingTop: 18, paddingBottom: 10 }}>
            <div className="inner-nar">
              <p className="wr-kicker" style={{ marginBottom: 12 }}>Your logo · {logoSel.title}</p>
              <div className="wr-lhero" dangerouslySetInnerHTML={{ __html: logoSvg(logoSel.key, picked.name, pal, { variant: logoSel.key === "appicon" ? "icon" : "light", accent: logoSel.accent, seed: logoSel.seed, font: logoSel.font, height: 110 }) }} />
              <div className="wr-logoctl">
                <label>Colour
                  <select value={logoSel.accent} onChange={(e) => setLogoSel({ ...logoSel, accent: e.target.value as LogoConcept["accent"] })}>
                    {(book?.palette || [{ name: "Dawn" }, { name: "Haze" }, { name: "Nova" }]).slice(0, 3).map((c, i) => (
                      <option key={c.name} value={(["dawn", "haze", "nova"] as const)[i]}>{c.name}</option>
                    ))}
                  </select>
                </label>
                <label>Font
                  <select value={logoSel.font || "auto"} onChange={(e) => setLogoSel({ ...logoSel, font: e.target.value === "auto" ? undefined : (e.target.value as LogoFont) })}>
                    <option value="auto">Auto</option>
                    <option value="bold">Heavy sans</option>
                    <option value="serif">Serif</option>
                    <option value="light">Light sans</option>
                  </select>
                </label>
              </div>
              <p className="wr-lead" style={{ margin: "16px 0 14px", maxWidth: 500 }}>
                <b style={{ color: "#fff" }}>Why it works.</b> {whyItWorks(logoSel.key, picked.name, concept?.concept || "")}
              </p>
              <button className="wr-btn2" onClick={downloadLogoPack}>↓ Download logo pack · SVG · PNG</button>
              <p className="wr-kicker" style={{ margin: "26px 0 10px" }}>Every version</p>
              <div className="wr-lvers">
                {([["light", "Primary · on light", "#fff"], ["night", "Reversed · on night", pal.night], ["dawn", "On the Dawn gradient", "transparent"], ["icon", "App icon · favicon", "transparent"]] as const).map(([v, label, bg]) => (
                  <div key={v} className="wr-lver">
                    <div className="vv" style={{ background: bg === "transparent" ? "var(--surface3)" : bg }}
                      dangerouslySetInnerHTML={{ __html: logoSvg(v === "icon" ? "appicon" : logoSel.key, picked.name, pal, { variant: v === "icon" ? "icon" : v, accent: logoSel.accent, seed: logoSel.seed, font: logoSel.font, height: 46 }) }} />
                    <div className="vl">{label}</div>
                  </div>
                ))}
              </div>
              <div className="wr-specs" style={{ marginTop: 22 }}>
                <div className="wr-spec"><b>Colours</b>
                  <span className="wr-swatches">
                    {(book?.palette || [{ name: "Dawn", hex: pal.dawn }, { name: "Night", hex: pal.night }, { name: "White", hex: "#ffffff" }]).slice(0, 4).map((c) => (
                      <span key={c.name} className="wr-swatch"><i style={{ background: c.hex }} />{c.name}</span>
                    ))}
                  </span>
                </div>
                <div className="wr-spec"><b>Minimum size</b><span>24 px high on screen · 8 mm in print</span></div>
                <div className="wr-spec"><b>Don't</b><span>Stretch it, recolour the sun, or add effects</span></div>
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
              <div className="wr-checks rise">
                {steps.domain === "done" && <div><span className="c">✓</span> {domSel?.domain || picked.dom?.domain}</div>}
                {steps.logo === "done" && <div><span className="c">✓</span> Logo · {logoSel?.title}</div>}
                <div><span className="c">✓</span> Brand book</div>
                {steps.socials === "done" && <div><span className="c">✓</span> Socials set up</div>}
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
        <div className="dots">
          {NAMING_STORIES.map((_, i) => <i key={i} className={i === storyIdx ? "on" : ""} />)}
          <button className="wr-link" onClick={() => setStoryIdx((i) => (i + 1) % NAMING_STORIES.length)}>Another story →</button>
        </div>
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

/* ── landing "Sign up with Google": the mock's pill, with the REAL Google
   button laid invisibly on top so the click is a genuine Google sign-in ── */
function GoogleCTA({ onDone }: { onDone: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const init = () => {
      const w = window as any;
      if (!w.google?.accounts?.id || !host.current) return;
      w.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (resp: any) => { const r = await authGoogle(resp.credential); if (r) onDone(); },
      });
      w.google.accounts.id.renderButton(host.current, { type: "standard", theme: "filled_black", size: "large", text: "signup_with", shape: "pill", width: 280 });
    };
    return loadGsi(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!GOOGLE_CLIENT_ID) return null;
  // The official Google button, rendered visibly: Google's own dark pill is
  // near-identical to the mock and the click path is bulletproof.
  return <span className="wr-gwrap" ref={host} />;
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

/* small input for the refine page's Avoid list */
function AvoidAdd({ onAdd }: { onAdd: (w: string) => void }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button className="wr-opt add" onClick={() => setOpen(true)}>＋ word to avoid</button>;
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

/* page 3 infinite scroll: fires when the founder nears the end of the field */
function MoreWordsSentinel({ onMore }: { onMore: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) onMore(); }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [onMore]);
  return <div ref={ref} style={{ height: 1 }} />;
}

/* ── 04b sign-up gate (Google only) ── */
function SignupGate({ onUser, count }: { onUser: (u: WUser) => void; count: number }) {
  const gbtn = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    const init = () => {
      const w = window as any;
      if (!w.google?.accounts?.id || !gbtn.current) return;
      w.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (resp: any) => {
          const r = await authGoogle(resp.credential);
          if (r) onUser(r.user);
          else setErr("Sign-in didn't stick, try again.");
        },
      });
      w.google.accounts.id.renderButton(gbtn.current, { type: "standard", theme: "outline", size: "large", text: "continue_with", shape: "pill", logo_alignment: "center", width: 320 });
    };
    return loadGsi(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="wr-gate">
      <p className="k">Free account</p>
      <h3>Unlock all {count} names</h3>
      <p>Plus your saved words, domain checks and brand book.</p>
      <div className="gbtn" ref={gbtn} />
      {err && <p className="alt" style={{ color: "#c0392b" }}>{err}</p>}
      <p className="alt">Have an account? Same button, we'll recognise you.</p>
    </div>
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
