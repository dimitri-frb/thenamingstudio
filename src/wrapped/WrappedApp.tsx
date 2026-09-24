// The Naming Studio — the "Wrapped" flow. One black stage:
// 00 landing → 01 the ask → 02 brief wrapped → 03 the words → 04 the names
// (gated when signed out) → 05 the reveal → then the own-it hub:
// 06 domain → 06b/c logo → 07 brand book → 08 socials → 09 all set.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./wrapped.css";
import {
  GOOGLE_CLIENT_ID, SAMPLE, authGoogle, clearSnap, fetchDomainBoard, fetchMe,
  loadGsi, loadSession, loadSnap, newProcess, processId, putSearch, registrarUrl, sampleBook,
  saveSnap, setProcessId, setTestMode, track, wrapApi,
  type DomainBoardData, type DomainCard, type SavedSearch, type WBook, type WConcept,
  type WName, type WStyle, type WUser, type WWord,
} from "./api";
import { logoConcepts, logoSvg, svgToPng, toPalette, whyItWorks, type LogoConcept } from "./logos";
import { download, makeZip } from "./zip";
import { BookPreview, BookPrint, printBook, ScaledPage, type BookCtx } from "./Book";

type Step = "land" | "ask" | "brief" | "words" | "names" | "reveal" | "domain" | "logo" | "logodone" | "book" | "socials" | "done";
const FLOW_NO: Partial<Record<Step, number>> = { ask: 1, brief: 2, words: 3, names: 4, reveal: 5 };
const OWN_STEPS: Step[] = ["domain", "logo", "logodone", "book", "socials"];
const STEPS_ALL: Step[] = ["land", "ask", "brief", "words", "names", "reveal", "domain", "logo", "logodone", "book", "socials", "done"];

const SOCIALS = [
  { name: "Instagram", desc: "Photos, stories and reels", url: "https://www.instagram.com/accounts/emailsignup/" },
  { name: "X", desc: "Updates and conversation", url: "https://x.com/i/flow/signup" },
  { name: "TikTok", desc: "Short video", url: "https://www.tiktok.com/signup" },
  { name: "LinkedIn", desc: "Company page", url: "https://www.linkedin.com/company/setup/new/" },
];

export function WrappedApp({ test, resume }: { test: boolean; resume?: string }) {
  const [step, setStep] = useState<Step>(test ? "land" : "land");
  const [sentence, setSentence] = useState(test ? "An AI naming studio that gives founders a strategist's rigor in minutes" : "");
  const [chips, setChips] = useState<string[]>(test ? ["B2B SaaS", "Global", "Founders"] : []);
  const [chipsBusy, setChipsBusy] = useState(false);
  const [addingChip, setAddingChip] = useState(false);
  const [concept, setConcept] = useState<WConcept | null>(test ? SAMPLE.concept : null);
  const [styles, setStyles] = useState<WStyle[] | null>(test ? SAMPLE.styles : null);
  const [wtab, setWtab] = useState(0);
  const [starred, setStarred] = useState<WWord[]>(test ? [SAMPLE.styles[0].words[0], SAMPLE.styles[0].words[1], SAMPLE.styles[1].words[0], SAMPLE.styles[1].words[2]] : []);
  const [names, setNames] = useState<WName[] | null>(test ? SAMPLE.names : null);
  const [nameIdx, setNameIdx] = useState(0);
  const [namesBusy, setNamesBusy] = useState(false);
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
  const wordsParts = useRef<{ a?: WStyle[]; b?: WStyle[] }>({});
  const bookReq = useRef("");
  const namesPre = useRef<{ key: string; p: Promise<{ names: WName[] } | null> } | null>(null);
  const stepRef = useRef(step);
  stepRef.current = step;

  const fail = (k: string, v: boolean) => setFails((f) => ({ ...f, [k]: v }));
  const retry = (k: string) => { fail(k, false); if (k === "book") bookReq.current = ""; setRetryTick((t) => t + 1); };
  const starKey = (ws: WWord[]) => ws.map((w) => w.w).sort().join("|");

  useEffect(() => { setTestMode(test); }, [test]);

  /* ── resume: from the account page (?resume=id) or a same-browser refresh ── */
  useEffect(() => {
    if (test) return;
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
        setStep(snap.step);
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
    if (s.logo) setLogoSel({ key: s.logo.key, title: s.logo.title, accent: "dawn" });
    if (s.picked) setStep("reveal");
    else if (s.names?.length) setStep("names");
    else if (s.concept) setStep("words");
    else setStep("brief");
  }

  /* ── persistence (refresh-resume + account) ── */
  useEffect(() => {
    if (test || step === "land") return;
    saveSnap({ step, sentence, chips, concept, styles, starred, names, picked, steps, logoSel, logoSeed, book });
  }, [test, step, sentence, chips, concept, styles, starred, names, picked, steps, logoSel, logoSeed, book]);

  function persist(over: Partial<SavedSearch> = {}) {
    if (test || !sentence.trim()) return;
    const status: SavedSearch["status"] = steps.domain === "done" || over.steps?.domain === "done" ? "claimed" : (names?.length ? "ready" : "exploring");
    putSearch({
      id: processId(), at: startedAt.current, updated: Date.now(),
      sentence: sentence.trim(), chips, concept, starred, names: names || undefined,
      picked, steps, status, ...over,
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
    }, 900);
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
            setStyles(null); wordsParts.current = {}; wordsReq.current = "";
            setStarred([]); setNames(null); namesPre.current = null;
          }
          conceptFor.current = s;
          setConcept(c);
          fail("concept", false);
        } else {
          conceptReq.current = "";
          if (stepRef.current !== "ask") fail("concept", true); // silent while still typing
        }
      });
    };
    if (step === "ask" || step === "land") { const t = setTimeout(go, 1400); return () => clearTimeout(t); }
    if (["brief", "words", "names"].includes(step)) go();
  }, [test, step, sentence, chips, concept, retryTick]);

  useEffect(() => { // words: both halves fired the instant the concept lands, shown as they arrive
    if (test || !concept || styles) return;
    const key = concept.concept + "|" + retryTick;
    if (wordsReq.current === key) return;
    wordsReq.current = key;
    wordsParts.current = {};
    const s = sentence.trim();
    const put = (which: "a" | "b", r: { styles: WStyle[] } | null) => {
      if (wordsReq.current !== key) return; // superseded
      if (r?.styles?.length) {
        wordsParts.current[which] = r.styles;
        const { a, b } = wordsParts.current;
        if (a) { setStyles(b ? [...a, ...b] : a); fail("words", false); } // territories first, extras appended
      } else if (which === "a" && !wordsParts.current.a) {
        fail("words", true); // the territory half is the page's backbone
      }
    };
    wrapApi.words(s, concept.concept, concept.territories, false).then((r) => put("a", r));
    wrapApi.words(s, concept.concept, concept.territories, true).then((r) => put("b", r));
  }, [test, concept, styles, sentence, retryTick]);

  useEffect(() => { // names: pre-coined in the background while the founder is still starring
    if (test || step !== "words" || names?.length || starred.length < 2) return;
    const key = starKey(starred);
    if (namesPre.current?.key === key) return;
    const t = setTimeout(() => {
      namesPre.current = { key, p: wrapApi.names(sentence.trim(), chips, concept?.concept || "", starred) };
    }, 1600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, step, starred, names, sentence, chips, concept]);

  useEffect(() => { // book + domain board: precharged the moment a name is picked
    if (!picked) return;
    fetchDomainBoard(picked.name).then((b) => {
      setBoard(b);
      fail("board", !b.tlds.length);
      setDomSel((cur) => cur || b.tlds.find((d) => d.status === "available") || b.tlds.find((d) => d.status === "negotiable") || null);
    });
    if (test) { setBook(sampleBook(picked.name)); return; }
    if (bookReq.current === picked.name) return;
    bookReq.current = picked.name;
    setBook(null);
    wrapApi.book(sentence.trim(), chips, concept?.concept || "", picked.name, picked.parts || []).then((b) => {
      if (b?.palette) { setBook(b); fail("book", false); } else fail("book", true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, test, retryTick]);

  /* ── actions ── */
  function startFlow(from: string) {
    if (!test) { newProcess(); startedAt.current = Date.now(); }
    conceptReq.current = ""; wordsReq.current = "";
    if (from.trim()) setSentence(from);
    setStep("ask");
  }

  function submitAsk() {
    if (sentence.trim().length < 4) return;
    track("search", { sentence: sentence.trim(), chips });
    setStep("brief");
    persist();
  }

  function toStep(s: Step) { setStep(s); window.scrollTo(0, 0); }

  function starToggle(w: WWord) {
    setStarred((prev) => prev.some((x) => x.w === w.w) ? prev.filter((x) => x.w !== w.w) : [...prev, w]);
  }

  async function makeNames() {
    toStep("names");
    if (names?.length || namesBusy) return;
    setNamesBusy(true);
    fail("names", false);
    // Use the background pre-coined batch when it matches the final starred set.
    const key = starKey(starred);
    const pre = namesPre.current?.key === key ? namesPre.current.p : null;
    let r = pre ? await pre : null;
    if (!r?.names?.length) r = await wrapApi.names(sentence.trim(), chips, concept?.concept || "", starred);
    setNamesBusy(false);
    if (!r?.names?.length) { fail("names", true); return; }
    setNames(r.names);
    persist({ names: r.names });
  }

  async function moreNames() {
    if (moreBusy || !names) return;
    setMoreBusy(true);
    fail("more", false);
    const r = await wrapApi.names(sentence.trim(), chips, concept?.concept || "", starred, names.map((n) => n.name));
    setMoreBusy(false);
    if (!r?.names?.length) { fail("more", true); return; }
    setNames((prev) => [...(prev || []), ...r.names]);
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
    window.open(registrarUrl(domSel.domain), "_blank", "noopener");
    track("domain", { domain: domSel.domain, price: domSel.price || domSel.offerPrice || "" });
    markStep("domain", "done", "logo");
  }

  async function downloadLogoPack() {
    if (!picked || !logoSel) return;
    const pal = toPalette(book?.palette);
    const nm = picked.name.toLowerCase();
    const svgs: Record<string, string> = {
      [`${nm}-primary.svg`]: logoSvg(logoSel.key, picked.name, pal, { variant: "light", accent: logoSel.accent }),
      [`${nm}-reversed.svg`]: logoSvg(logoSel.key, picked.name, pal, { variant: "night", accent: logoSel.accent }),
      [`${nm}-gradient.svg`]: logoSvg(logoSel.key, picked.name, pal, { variant: "dawn", accent: logoSel.accent }),
      [`${nm}-mono.svg`]: logoSvg(logoSel.key, picked.name, pal, { variant: "mono", accent: logoSel.accent }),
      [`${nm}-appicon.svg`]: logoSvg("appicon", picked.name, pal, { variant: "icon", accent: logoSel.accent }),
    };
    const enc = new TextEncoder();
    const files: { name: string; data: Uint8Array }[] = Object.entries(svgs).map(([name, svg]) => ({ name, data: enc.encode(svg) }));
    try {
      files.push({ name: `${nm}-primary@1024.png`, data: await svgToPng(svgs[`${nm}-primary.svg`], 1024) });
      files.push({ name: `${nm}-appicon@512.png`, data: await svgToPng(svgs[`${nm}-appicon.svg`], 512) });
    } catch { /* svg-only pack if the canvas fails */ }
    download(makeZip(files), `${nm}-logo-pack.zip`);
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
    ask: "land", brief: "ask", words: "brief", names: "words", reveal: "names",
    domain: "reveal", logo: "domain", logodone: "logo", book: "logodone", socials: "book",
  };

  const pal = toPalette(book?.palette);
  const bookCtx: BookCtx | null = picked && book ? {
    name: picked.name,
    domain: domSel?.domain || picked.dom?.domain || `${picked.name.toLowerCase()}.com`,
    book, logoKey: logoSel?.key || "sunrise", logoAccent: logoSel?.accent || "dawn",
  } : null;

  return (
    <div className="wr">
      {(step === "land" || step === "reveal" || step === "done") && <div className="wr-glow" />}

      {/* top bar */}
      <div className="wr-top">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          {backTarget[step] && <button className="wr-back" onClick={() => toStep(backTarget[step]!)} aria-label="Back">‹</button>}
          <button className="wr-brand" onClick={() => (step === "land" ? undefined : restart())}>
            <span className="bx"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M 2 8.5 A 4 4 0 0 1 10 8.5 Z" fill="#000" /></svg></span>
            <span className="bt">the naming studio</span>
          </button>
        </span>
        {flowNo
          ? <span className="wr-count"><b>{flowNo}</b> of 5</span>
          : inOwn && picked
            ? <span className="wr-topname">{picked.name}</span>
            : step === "land"
              ? <button className="wr-signin" onClick={gotoAccount}>Sign in</button>
              : step === "done" ? <span className="wr-count">done</span> : <span />}
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
          <p className="wr-kicker rise">Names for companies, apps and products</p>
          <h1 className="wr-h rise" style={{ margin: "14px 0 12px" }}>Find your name.<br />Own it.</h1>
          <p className="wr-lead rise" style={{ maxWidth: 430, margin: "0 0 26px" }}>
            Describe what you're building. Get a name with its domain, logo and brand book, in minutes.
          </p>
          <button className="wr-btn rise" style={{ maxWidth: 260 }} onClick={() => startFlow(sentence)}>Start naming →</button>
          <div style={{ marginTop: 44 }} className="rise">
            <p className="wr-kicker" style={{ marginBottom: 12 }}>You get</p>
            <div className="wr-youget">
              {["Your name", "The domain", "Social accounts", "A logo", "A brand book"].map((x) => <span key={x} className="wr-frost">{x}</span>)}
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
                  We picked up {chipsBusy && <span className="wr-spin" style={{ display: "inline-block", verticalAlign: "-3px", marginLeft: 6 }} />}
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
                <p className="wr-hint" style={{ marginTop: 12 }}>Edit a chip if we read it wrong</p>
              </div>
            </div>
          </div>
          <div className="wr-foot">
            <span className="wr-khint"><span className="wr-key">⏎</span> continue</span>
            <button className="wr-btn" style={{ maxWidth: 420 }} disabled={sentence.trim().length < 4} onClick={submitAsk}>Continue</button>
          </div>
        </>
      )}

      {/* ═══ 02 brief wrapped ═══ */}
      {step === "brief" && (
        <>
          <div className="wr-stage center">
            <div className="inner-nar">
              {!concept ? (
                fails.concept
                  ? <GenFail note="We couldn't read your brief just now." onRetry={() => retry("concept")} />
                  : <div className="wr-load"><span className="wr-spin" /> Reading your brief…</div>
              ) : (
                <>
                  <p className="wr-kicker rise" style={{ marginBottom: 14 }}>Here's what we heard</p>
                  <h1 className="wr-h rise" style={{ marginBottom: 18 }}>
                    Your name should feel like <span className="wr-cpill">{concept.concept}</span>
                  </h1>
                  <p className="wr-lead rise" style={{ marginBottom: 30, maxWidth: 470 }}>{concept.para}</p>
                  <p className="wr-kicker rise" style={{ marginBottom: 14 }}>Our inspirations</p>
                  <div className="wr-terr">
                    {concept.territories.map((t, i) => (
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
            <button className="wr-link" onClick={() => toStep("ask")}>Not quite? Rewrite the brief</button>
            <span className="wr-khint"><span className="wr-key">⏎</span></span>
            <button className="wr-btn" style={{ maxWidth: 300 }} disabled={!concept} onClick={() => toStep("words")}>Show me the words →</button>
          </div>
        </>
      )}

      {/* ═══ 03 the words ═══ */}
      {step === "words" && (
        <>
          <div className="wr-stage" style={{ paddingTop: 16 }}>
            <h1 className="wr-h" style={{ fontSize: 27, marginBottom: 4 }}>Star the words that inspire you.</h1>
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
              <h1 className="wr-h" style={{ fontSize: 30, marginBottom: 4 }}>Six names from your {starred.length} word{starred.length === 1 ? "" : "s"}.</h1>
              <p className="wr-hint" style={{ marginBottom: 18 }}>Scored against the brief · domains checked</p>
              {fails.names && !names?.length ? (
                <div style={{ margin: "34px 0" }}><GenFail note="The studio couldn't coin your names just now." onRetry={makeNames} /></div>
              ) : namesBusy && !names?.length ? (
                <div className="wr-load" style={{ margin: "34px 0" }}><span className="wr-spin" /> Coining names from your words…</div>
              ) : (
                <div className={"wr-names" + (gated ? " gatecol" : "")}>
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
                        {n.dom && <span className="dm"><i className="dot" />{n.dom.domain} free</span>}
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
                    <>
                      <p className="wr-hint" style={{ margin: "8px 0 2px" }}>+ {(names?.length || 6) - 1} more names, locked</p>
                      {(names || []).slice(1).map((n) => (
                        <div key={n.name} className="wr-lockrow">
                          <span>🔒</span><b>{n.name}</b><span className="sc">{n.score}/100</span>
                        </div>
                      ))}
                    </>
                  )}
                  {!gated && !!names?.length && (
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
              <span className="wr-khint"><span className="wr-key">↑</span><span className="wr-key">↓</span> to browse · <span className="wr-key">⏎</span> to pick</span>
            </div>
          )}
          {gated && <SignupGate onUser={(u) => setUser(u)} count={names?.length || 6} />}
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
                <p className="wr-kicker" style={{ marginBottom: 8 }}>What's next</p>
                {[
                  { n: "1", t: "Claim the domain", s: board?.tlds.filter((d) => d.status === "available").slice(0, 2).map((d) => `${d.domain} · ${d.price || ""}`).join("   ") || picked.dom?.domain || "checking…", to: "domain" as Step },
                  { n: "2", t: "Find your perfect logo", s: "Nine logo concepts from the name", to: "logo" as Step },
                  { n: "3", t: "Open your brand book", s: "voice, colours, story", to: "book" as Step },
                  { n: "4", t: "Create your social accounts", s: "Instagram · X · TikTok · LinkedIn", to: "socials" as Step },
                ].map((r) => (
                  <button key={r.n} className="row" onClick={() => toStep(r.to)}>
                    <span className="i">{r.n}</span>
                    <span><span className="tt" style={{ display: "block" }}>{r.t}</span><span className="ss">{r.s}</span></span>
                    <span className="ar">→</span>
                  </button>
                ))}
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
                  {board.tlds.filter((d) => d.status === "available" || d.status === "negotiable").slice(0, domShow).map((d, i) => (
                    <button key={d.domain} className={"wr-dom" + (domSel?.domain === d.domain ? " sel" : "")} onClick={() => setDomSel(d)}>
                      <span className={"dot" + (d.status === "negotiable" ? " sale" : "")} />
                      <span className="d">{d.domain}</span>
                      {i === 0 && <span className="bp">Best pick</span>}
                      <span className="st">{d.status === "negotiable" ? "for sale" : "available"}</span>
                      <span className="pr">{d.price || d.offerPrice || ""}</span>
                    </button>
                  ))}
                  {board.tlds.filter((d) => d.status === "available" || d.status === "negotiable").length > domShow && (
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
            <button className="wr-link" onClick={() => markStep("domain", "skipped", "logo")}>Skip for now</button>
          </div>
        </>
      )}

      {/* ═══ 06b logo grid ═══ */}
      {step === "logo" && picked && (
        <>
          <div className="wr-stage center">
            <div className="inner-nar">
              <p className="wr-kicker" style={{ marginBottom: 8 }}>Your logo</p>
              <h1 className="wr-h" style={{ fontSize: 30, marginBottom: 6 }}>Give {picked.name} a face.</h1>
              <p className="wr-lead" style={{ marginBottom: 18, maxWidth: 460 }}>
                Nine concepts drawn from the story of the name. Pick one; it flows into your brand book.
              </p>
              <div className="wr-lgrid">
                {logoConcepts(logoSeed).map((c) => (
                  <button key={c.key} className={"wr-ltile" + (logoSel?.key === c.key ? " sel" : "")} onClick={() => setLogoSel(c)}>
                    {logoSel?.key === c.key && <span className="ck">✓</span>}
                    <span className="lt" dangerouslySetInnerHTML={{ __html: logoSvg(c.key, picked.name, pal, { variant: c.key === "appicon" ? "icon" : "tile", accent: c.accent, height: 54 }) }} />
                    <span className="ln">{c.title}</span>
                  </button>
                ))}
              </div>
              <button className="wr-link" style={{ marginTop: 12 }} onClick={() => { setLogoSeed((s) => s + 1); setLogoSel(null); }}>↻ Nine more concepts</button>
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
              <div className="wr-lhero" dangerouslySetInnerHTML={{ __html: logoSvg(logoSel.key, picked.name, pal, { variant: logoSel.key === "appicon" ? "icon" : "light", accent: logoSel.accent, height: 110 }) }} />
              <p className="wr-lead" style={{ margin: "16px 0 14px", maxWidth: 500 }}>
                <b style={{ color: "#fff" }}>Why it works.</b> {whyItWorks(logoSel.key, picked.name, concept?.concept || "")}
              </p>
              <button className="wr-btn2" onClick={downloadLogoPack}>↓ Download logo pack · SVG · PNG</button>
              <p className="wr-kicker" style={{ margin: "26px 0 10px" }}>Every version</p>
              <div className="wr-lvers">
                {([["light", "Primary · on light", "#fff"], ["night", "Reversed · on night", pal.night], ["dawn", "On the Dawn gradient", "transparent"], ["icon", "App icon · favicon", "transparent"]] as const).map(([v, label, bg]) => (
                  <div key={v} className="wr-lver">
                    <div className="vv" style={{ background: bg === "transparent" ? "var(--surface3)" : bg }}
                      dangerouslySetInnerHTML={{ __html: logoSvg(v === "icon" ? "appicon" : logoSel.key, picked.name, pal, { variant: v === "icon" ? "icon" : v, accent: logoSel.accent, height: 46 }) }} />
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
                <h1 className="wr-h" style={{ fontSize: 30, marginBottom: 10 }}>{picked.name}, ready for you.</h1>
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
                    <button className="wr-btn" style={{ maxWidth: 260 }} onClick={() => { printBook(); track("book", { name: picked.name }); }}>↓ Download PDF</button>
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
              <h1 className="wr-h" style={{ fontSize: 30, marginBottom: 8 }}>Set up {picked.name}'s socials.</h1>
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

/* ── honest failure state: never sample data, always a retry ── */
function GenFail({ note, onRetry }: { note: string; onRetry: () => void }) {
  return (
    <div className="wr-fail">
      <p>{note} Nothing was lost, your brief and words are safe.</p>
      <button className="wr-btn2" onClick={onRetry}>↻ Try again</button>
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
function Grow({ value, onChange, onEnter, placeholder }: { value: string; onChange: (v: string) => void; onEnter: () => void; placeholder: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(46, el.scrollHeight) + "px";
  }, [value]);
  return (
    <textarea
      ref={ref} className="wr-ask" rows={1} autoFocus
      value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); onEnter(); } }}
    />
  );
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
    <div className="wr-gatewrap">
      <div className="wr-gate">
        <p className="k">Free account</p>
        <h3>Unlock all {count} names</h3>
        <p>Plus your saved words, domain checks and brand book.</p>
        <div className="gbtn" ref={gbtn} />
        {err && <p className="alt" style={{ color: "#c0392b" }}>{err}</p>}
        <p className="alt">Have an account? Same button, we'll recognise you.</p>
      </div>
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
