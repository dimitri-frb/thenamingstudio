// /epsilon — "Kinetic Reveal": the whole journey as cinematic moments on one
// black stage. One question per screen, huge type, no chrome, and the reveal as
// the climax. Faithful to the Claude Design import (Naming Studio - Kinetic
// Flow.dc.html), mobile + desktop (keyboard-first: type, arrows pick, ⏎ advances).
// Reuses the live data layer (naming.*, fetchDomainBoard, captureLead).
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  naming, fetchDomainBoard, captureLead, logDecision,
  type Brief, type Comparison, type Concept, type NameIdea, type DomainCard,
} from "../lib/namingApi";
import { setTestMode } from "../lib/requestLog";
import { recommendLanes } from "../lib/localStudio";
import { MOCK } from "../cosmos/mock";
import { BrandBook } from "../components/BrandBook";
import "./epsilon.css";

const EMPTY: Brief = { does: "", industry: "", problem: "", audience: "", values: "", uvp: "", signal: [], avoid: [], tone: [], lanes: [], geos: [] };

const SPACES = ["B2B SaaS", "Consumer", "Fintech", "Health"];
const REACHES: { label: string; geo: string }[] = [
  { label: "Globally", geo: "Global" }, { label: "EU", geo: "EU" }, { label: "US", geo: "US" }, { label: "UK", geo: "UK" },
];
const FEELING_FALLBACK = ["Clear", "Bold", "Warm", "Premium", "Calm", "Human", "Sharp"];
const KINDS: { label: string; lane: string; desc: string; ex: string }[] = [
  { label: "Evocative", lane: "evocative", desc: "Suggests the feeling.", ex: "Stripe · Notion" },
  { label: "Invented", lane: "invented", desc: "A word born new.", ex: "Kodak · Zynga" },
  { label: "Descriptive", lane: "descriptive", desc: "Says what it does.", ex: "Booking · YouTube" },
  { label: "Compound", lane: "compound", desc: "Two words fused.", ex: "Facebook · Snapchat" },
  { label: "Real word", lane: "abstract", desc: "Borrowed whole.", ex: "Apple · Amazon" },
  { label: "Misspelled", lane: "playful", desc: "A twist on spelling.", ex: "Lyft · Tumblr" },
];

// The floating word field: deterministic size/animation pattern (from the design).
const SIZES = [30, 22, 26, 20, 24, 21, 23, 27, 20, 25, 22, 26];
const FLOATS = [5, 6, 5.5, 6.5, 5.2, 5.8, 6.2, 5.4, 6.4, 5.6, 6.1, 5.3];

interface FieldWord { w: string; note?: string; lang?: string }
const TEST_FIELD: FieldWord[] = [
  { w: "dawn" }, { w: "bloom" }, { w: "aurora" }, { w: "inhale" }, { w: "spark" },
  { w: "morgenrot", lang: "DE" }, { w: "eos" }, { w: "alba", lang: "IT" }, { w: "lucere", lang: "LA" },
  { w: "ember" }, { w: "aube", lang: "FR" }, { w: "nova" }, { w: "kindle" }, { w: "oriri", lang: "LA" },
  { w: "first light" }, { w: "matin", lang: "FR" }, { w: "gleam" }, { w: "albor", lang: "ES" },
];

// Which screens show the "NN / 12" counter (per the design).
const META: Record<number, string> = { 2: "01", 3: "02", 4: "03", 5: "04", 6: "05", 7: "06", 8: "07", 9: "08", 10: "08", 12: "10" };

// The essentials of a brand book, for the "Your brand book" preview cards.
interface BookPreview { palette: string[]; voice: string; tagline: string }
const TEST_BOOK: BookPreview = {
  palette: ["#ff9e7a", "#c9b6ff", "#7c9cff", "#0f0f0f"],
  voice: "Warm, clear, quietly confident. Speaks to founders at first light.",
  tagline: "Every brand has a first light.",
};
const TEST_DOMS: DomainCard[] = [
  { domain: "aurova.com", tld: ".com", status: "available", price: "$32" },
  { domain: "aurova.io", tld: ".io", status: "available", price: "$38" },
  { domain: "aurova.ai", tld: ".ai", status: "negotiable", offerPrice: "$70" },
  { domain: "aurova.co", tld: ".co", status: "taken" },
];

export function EpsilonFlow({ test, onExit }: { test?: boolean; onExit: () => void }) {
  setTestMode(!!test);
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState<Brief>(test ? { ...MOCK.brief, lanes: ["evocative"] } : EMPTY);
  const [who, setWho] = useState({ name: "", email: "" });
  const [feelings, setFeelings] = useState<string[]>(test ? FEELING_FALLBACK : []);
  const [feelIdx, setFeelIdx] = useState(0);
  const [concept, setConcept] = useState<Concept | null>(test ? { title: "First light", blurb: "Dawn, firsts and new beginnings.", lane: "evocative" } : null);
  const [field, setField] = useState<FieldWord[]>(test ? TEST_FIELD : []);
  const [kept, setKept] = useState<string[]>(test ? ["dawn", "aurora", "spark", "alba"] : []);
  const [overlay, setOverlay] = useState<{ w: string; def: string; world: FieldWord[] } | null>(null);
  const [ideas, setIdeas] = useState<NameIdea[]>(test ? MOCK.shortlistRows.flatMap((r) => r.ideas) : []);
  const [comp, setComp] = useState<Comparison | null>(test ? MOCK.comp : null);
  const [pickIdx, setPickIdx] = useState(0);
  const [err, setErr] = useState("");
  // Live domain boards per name (the six + own-it screens), the own-it sub-view,
  // the brand-book preview, and the full brand-book modal.
  const [boards, setBoards] = useState<Record<string, DomainCard[] | null>>({});
  const [own, setOwn] = useState<"hub" | "domain" | "book">("hub");
  const [domSel, setDomSel] = useState("");
  const [moreDoms, setMoreDoms] = useState(false);
  const [book, setBook] = useState<BookPreview | null>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const relCache = useRef<Map<string, { def: string; world: FieldWord[] }>>(new Map());
  const emailRef = useRef<HTMLInputElement>(null);

  const set = (p: Partial<Brief>) => setBrief((b) => ({ ...b, ...p }));
  const goto = useCallback((n: number) => { setStep(n); setErr(""); }, []);

  // ── multi-select: several spaces / kinds can be picked; one recommended
  // option is always pre-selected so ⏎ can simply advance. ──────────────────
  const spaceSel = (brief.industry || "").split(", ").filter(Boolean);
  const presetSpaces = spaceSel.filter((s) => SPACES.includes(s));
  const customSpace = spaceSel.find((s) => !SPACES.includes(s)) || "";
  const applySpaces = (presets: string[], custom: string) =>
    set({ industry: [...presets, ...(custom.trim() ? [custom] : [])].join(", ") });
  const toggleSpace = (s: string) =>
    applySpaces(presetSpaces.includes(s) ? presetSpaces.filter((x) => x !== s) : [...presetSpaces, s], customSpace);
  const toggleLane = (l: string) =>
    set({ lanes: brief.lanes.includes(l) ? brief.lanes.filter((x) => x !== l) : [...brief.lanes, l] });
  const recLane = (() => {
    const r = recommendLanes({ ...brief })[0];
    return KINDS.some((k) => k.lane === r) ? r : "evocative";
  })();
  useEffect(() => {
    if (step === 5 && !brief.industry.trim()) set({ industry: SPACES[0] });
    if (step === 8 && !brief.lanes.length) set({ lanes: [recLane] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── background fetches (skipped in test mode) ─────────────────────────────
  const feelBusy = useRef(false);
  useEffect(() => {
    if (test || feelings.length || feelBusy.current || !brief.does.trim() || step < 2 || step > 7) return;
    feelBusy.current = true;
    naming.feelings(brief).then((f) => setFeelings(f.map((x) => x.word)))
      .catch(() => setFeelings(FEELING_FALLBACK)).finally(() => { feelBusy.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, brief.does]);

  const conceptBusy = useRef(false);
  useEffect(() => {
    if (test || concept || conceptBusy.current || !brief.signal.length || step < 7) return;
    conceptBusy.current = true;
    naming.concepts(brief).then((cs) => setConcept(cs[0] || { title: "your idea", blurb: "", lane: "" }))
      .catch(() => setConcept({ title: "your idea", blurb: "", lane: "" }))
      .finally(() => { conceptBusy.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, brief.signal.length]);

  // The word field: one relate() on the concept, flattened across its groups.
  const fieldBusy = useRef(false);
  useEffect(() => {
    if (test || field.length || fieldBusy.current || !concept || step !== 9) return;
    fieldBusy.current = true;
    naming.relate(brief, "", concept.title, []).then((r) => {
      const flat: FieldWord[] = [];
      const groups = r.groups || [];
      for (let i = 0; i < 5; i++) groups.forEach((g) => { const w = g.words[i]; if (w && flat.length < 18 && !flat.some((f) => f.w === w.w)) flat.push({ w: w.w, note: w.note, lang: w.lang }); });
      setField(flat);
    }).catch(() => setErr("The words didn't come. Go back and try again."))
      .finally(() => { fieldBusy.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, concept]);

  // ── word overlay (long-press / hover / tap-again) ─────────────────────────
  const openWord = (w: string) => {
    const hit = relCache.current.get(w);
    if (hit) { setOverlay({ w, ...hit }); return; }
    if (test) {
      const world = TEST_FIELD.filter((f) => f.w !== w).slice(0, 6);
      const data = { def: "One of your field's words — dawn, light, firsts.", world };
      relCache.current.set(w, data); setOverlay({ w, ...data });
      return;
    }
    setOverlay({ w, def: "", world: [] });
    naming.relate(brief, w, concept?.title || "", []).then((r) => {
      const world: FieldWord[] = [];
      (r.groups || []).forEach((g) => g.words.forEach((x) => { if (world.length < 6 && x.w.toLowerCase() !== w.toLowerCase()) world.push({ w: x.w, note: x.note, lang: x.lang }); }));
      const data = { def: r.def || "", world };
      relCache.current.set(w, data);
      setOverlay((o) => (o && o.w === w ? { w, ...data } : o));
    }).catch(() => { /* leave the sparse overlay */ });
  };

  const isKept = (w: string) => kept.some((k) => k.toLowerCase() === w.toLowerCase());
  const toggleKeep = (w: string) => setKept((p) => isKept(w) ? p.filter((k) => k.toLowerCase() !== w.toLowerCase()) : [...p, w]);

  // ── names + scoring pipeline (the narrowing interlude runs while this works) ──
  const namesBusy = useRef(false);
  const startNames = () => {
    goto(11);
    if (test) { setTimeout(() => goto(12), 2600); return; }
    if (namesBusy.current) return;
    namesBusy.current = true;
    (async () => {
      try {
        const res = await naming.names(brief, { concepts: concept ? [concept.title] : [], words: kept } as any, []);
        const all = [...res].sort((a, b) => (b.score || 0) - (a.score || 0));
        setIdeas(all);
        const top = all.slice(0, 6);
        const c = await naming.compare(brief, top);
        setComp(c);
        goto(12);
      } catch (e: any) {
        setErr(e?.message || "Something broke while scoring. Tap to retry.");
        goto(10);
      } finally { namesBusy.current = false; }
    })();
  };

  // ── the six / reveal data ────────────────────────────────────────────────
  const rows = comp ? [...comp.rows].sort((a, b) => b.total - a.total).slice(0, 6) : [];
  const scoreOf = (name: string, total: number) =>
    ideas.find((i) => i.name === name)?.score || Math.round((total / 20) * 100);
  const pick = rows[pickIdx] || rows[0];
  const pickIdea = pick ? ideas.find((i) => i.name === pick.name) : undefined;

  const decided = useRef("");
  useEffect(() => {
    if (step !== 13 || !pick || decided.current === pick.name) return;
    decided.current = pick.name;
    if (!test) logDecision(pick.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, pickIdx]);

  // Live domain board for the current pick (the six shows it on desktop; own-it
  // builds the "Grab the domain" view from it).
  useEffect(() => {
    const name = pick?.name;
    if (step < 12 || !name || boards[name] !== undefined) return;
    if (test) { setBoards((p) => ({ ...p, [name]: TEST_DOMS.map((d) => ({ ...d, domain: name.toLowerCase() + (d.tld || "") })) })); return; }
    setBoards((p) => ({ ...p, [name]: null }));
    fetchDomainBoard(name, brief.geos).then((b) => {
      const order = (d: DomainCard) => [".com", ".io", ".ai"].indexOf(d.tld || "") + 1 || 9;
      const good = b.tlds.filter((d) => d.status === "available" || d.status === "negotiable").sort((a, c) => order(a) - order(c));
      const taken = b.tlds.filter((d) => d.status === "taken").sort((a, c) => order(a) - order(c));
      setBoards((p) => ({ ...p, [name]: [...good, ...b.variants.slice(0, 4), ...taken.slice(0, 1)] }));
    }).catch(() => setBoards((p) => ({ ...p, [name]: [] })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, pick?.name]);

  const board = pick ? boards[pick.name] : undefined;
  const goodDoms = (board || []).filter((d) => d.status !== "taken");
  const takenDom = (board || []).find((d) => d.status === "taken");
  const bestDom = goodDoms[0];
  const domPrice = (d?: DomainCard) => d ? (d.price || d.offerPrice || "") : "";
  const chosenDom = goodDoms.find((d) => d.domain === domSel) || bestDom;
  const gdUrl = (domain: string) => `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(domain)}`;

  // Brand-book preview (palette · voice · tagline) once the book view opens.
  const bookBusy = useRef(false);
  useEffect(() => {
    if (step !== 14 || own !== "book" || book || bookBusy.current || !pick) return;
    if (test) { setBook(TEST_BOOK); return; }
    bookBusy.current = true;
    naming.brandbook(brief, pick.name).then((b) => setBook({
      palette: (b.palette || []).map((s) => s.hex).slice(0, 4),
      voice: b.voice?.sample || (b.voice?.adjectives || []).join(", "),
      tagline: b.tagline || "",
    })).catch(() => setBook({ palette: [], voice: "", tagline: "" }))
      .finally(() => { bookBusy.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, own]);

  const hear = (name: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(name);
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  };

  // ── narrowing countdown ──────────────────────────────────────────────────
  const [narrowN, setNarrowN] = useState(48);
  useEffect(() => {
    if (step !== 11) return;
    setNarrowN(48);
    const t = setInterval(() => setNarrowN((n) => (n > 6 ? n - 1 : 6)), 130);
    return () => clearInterval(t);
  }, [step]);

  // ── validation per step ──────────────────────────────────────────────────
  const canNext = (): boolean => {
    switch (step) {
      case 1: return who.name.trim().length > 1 && /.+@.+\..+/.test(who.email);
      case 2: return brief.does.trim().length > 3;
      case 3: return brief.problem.trim().length > 3;
      case 4: return brief.audience.trim().length > 3;
      case 5: return !!brief.industry.trim();
      case 6: return !!brief.geos?.length;
      case 7: return true;
      case 8: return !!brief.lanes.length;
      case 9: case 10: return kept.length > 0;
      case 12: return rows.length > 0;
      default: return true;
    }
  };

  const next = useCallback(() => {
    if (!canNext()) return;
    switch (step) {
      case 0: goto(1); break;
      case 1:
        if (!test) { captureLead(brief, who.email.trim(), who.name.trim()).catch(() => { /* soft */ }); }
        try { localStorage.setItem("ns.fromName", who.name.trim()); } catch { /* noop */ }
        goto(2); break;
      case 7: set({ signal: [feelings[feelIdx] || FEELING_FALLBACK[0]] }); goto(8); break;
      case 9: goto(10); break;
      case 10: startNames(); break;
      case 12: goto(13); break;
      case 13: setOwn("hub"); goto(14); break;
      case 14:
        if (own === "hub") setOwn("domain");
        else if (own === "domain") { if (chosenDom) window.open(gdUrl(chosenDom.domain), "_blank", "noopener"); }
        else setBookOpen(true);
        break;
      default: goto(step + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, brief, who, feelings, feelIdx, kept, rows.length, test, own, chosenDom]);

  const back = () => {
    if (overlay) { setOverlay(null); return; }
    if (step === 14 && own !== "hub") { setOwn("hub"); return; }
    if (step === 0) { onExit(); return; }
    if (step === 12) { goto(10); return; }  // skip the interlude going back
    if (step === 11) { goto(10); return; }
    goto(step - 1);
  };

  // ── keyboard (desktop-first) ─────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || bookOpen) return;
      if (overlay) {
        if (e.key === "Escape") { setOverlay(null); e.preventDefault(); }
        if (e.key.toLowerCase() === "k") { toggleKeep(overlay.w); e.preventDefault(); }
        return;
      }
      if (e.key === "Escape" && step === 14 && own !== "hub") { setOwn("hub"); e.preventDefault(); return; }
      if (e.key === "Enter") { next(); e.preventDefault(); return; }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (step === 5 && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown")) {
        // arrows swap the selection while it's single; with several picked, tap/click rules
        const sel = (brief.industry || "").split(", ").filter((s) => SPACES.includes(s));
        if (sel.length <= 1) {
          const dir = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
          const cur = Math.max(0, SPACES.indexOf(sel[0] || ""));
          set({ industry: SPACES[(cur + dir + SPACES.length) % SPACES.length] });
        }
        e.preventDefault();
      }
      if (step === 6 && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        const dir = e.key === "ArrowLeft" ? -1 : 1;
        const cur = Math.max(0, REACHES.findIndex((r) => brief.geos?.[0] === r.geo));
        set({ geos: [REACHES[(cur + dir + REACHES.length) % REACHES.length].geo] }); e.preventDefault();
      }
      if (step === 7 && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        const dir = e.key === "ArrowLeft" ? -1 : 1;
        const n = feelings.length || FEELING_FALLBACK.length;
        setFeelIdx((i) => (i + dir + n) % n); e.preventDefault();
      }
      if (step === 8 && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        if (brief.lanes.length <= 1) {
          const dir = e.key === "ArrowUp" ? -1 : 1;
          const cur = Math.max(0, KINDS.findIndex((k) => brief.lanes[0] === k.lane));
          set({ lanes: [KINDS[(cur + dir + KINDS.length) % KINDS.length].lane] });
        }
        e.preventDefault();
      }
      if (step === 12) {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          const dir = e.key === "ArrowUp" ? -1 : 1;
          setPickIdx((i) => (i + dir + rows.length) % Math.max(1, rows.length)); e.preventDefault();
        }
        if (e.key.toLowerCase() === "p" && pick) { hear(pick.name); e.preventDefault(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, overlay, next, brief.industry, brief.geos, brief.lanes, feelings.length, rows.length, pick, own, bookOpen]);

  // Enter handled directly on the inputs too: mobile virtual keyboards don't
  // reliably deliver the return key to window listeners, so "go" advances here.
  // stopPropagation keeps the window handler from firing next() twice on desktop.
  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault(); e.stopPropagation();
    (e.target as HTMLElement).blur();
    next();
  };

  // long-press (mobile)
  const pressTimer = useRef<number>(0);
  const pressFired = useRef(false);
  const pressStart = (w: string) => {
    pressFired.current = false;
    pressTimer.current = window.setTimeout(() => { pressFired.current = true; openWord(w); }, 420);
  };
  const pressEnd = () => window.clearTimeout(pressTimer.current);

  const feelWords = feelings.length ? feelings : FEELING_FALLBACK;
  const meta = META[step];
  const firstName = who.name.trim().split(" ")[0] || "";
  // The founder's kept words, blue-tagged when they came from a word's world
  // (not the base field), per the design.
  const isWorldWord = (w: string) => !field.some((f) => f.w.toLowerCase() === w.toLowerCase());
  const keptPills = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
      <b style={{ color: "#fff", fontSize: 13 }}>{kept.length} kept</b>
      {kept.map((w) => (
        <button key={w} className={"eps-keptpill" + (isWorldWord(w) ? " new" : "")} title="Tap to remove"
          onClick={() => toggleKeep(w)}>{w}</button>
      ))}
    </span>
  );

  // ─────────────────────────── screens ───────────────────────────
  const stage = () => {
    switch (step) {
      // 01 · Opening
      case 0: return (
        <>
          <div className="eps-stage">
            <span style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 8, background: "#fff", color: "#000", marginBottom: 26 }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 4.5v15M5.5 8.25l13 7.5M18.5 8.25l-13 7.5" /></svg>
            </span>
            <h2 style={{ fontSize: "clamp(56px, 9vw, 84px)", fontWeight: 700, letterSpacing: "-.045em", lineHeight: 0.97, margin: 0 }}>Name it.</h2>
            <p style={{ fontSize: 17, color: "#8a8a8a", margin: "20px 0 0", lineHeight: 1.5 }}>Nine minutes to a name you own.</p>
          </div>
          <div className="eps-foot">
            <span className="eps-dim" style={{ color: "#5c5c5c" }}>the naming studio</span>
            <span className="eps-khint">Press <span className="eps-key">⏎</span> to begin</span>
            <button className="eps-btn" onClick={next}>Begin</button>
          </div>
        </>
      );

      // 02 · Sign up
      case 1: return (
        <>
          <div className="eps-stage">
            <h2 className="eps-h">First, you.</h2>
            <div className="eps-cols" style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 36, maxWidth: 560 }}>
              <div>
                <p className="eps-label">Name</p>
                <input className="eps-input" autoFocus value={who.name} placeholder="Jordan Avery" enterKeyHint="next"
                  onChange={(e) => setWho((w) => ({ ...w, name: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); emailRef.current?.focus(); } }} />
              </div>
              <div>
                <p className="eps-label">Email</p>
                <input className="eps-input" type="email" ref={emailRef} value={who.email} placeholder="jordan@company.com" enterKeyHint="go"
                  onChange={(e) => setWho((w) => ({ ...w, email: e.target.value }))}
                  onKeyDown={onEnter} />
              </div>
            </div>
            <p className="eps-hint" style={{ marginTop: 22 }}>No password. We save your journey and send the name here.</p>
          </div>
          <div className="eps-foot end">
            <span className="eps-khint">Start <span className="eps-key">⏎</span></span>
            <button className="eps-btn" disabled={!canNext()} onClick={next}>Start →</button>
          </div>
        </>
      );

      // 03 · Brief / 04 · Problem / 05 · Audience — one bare question each
      case 2: return oneLiner(firstName ? `${firstName}, what are you building?` : "What are you building?", brief.does, (v) => set({ does: v }),
        "An AI studio that names companies with a strategist's rigor", "One sentence is enough.");
      case 3: return (
        <>
          <div className="eps-stage">
            <p className="eps-kicker">The problem you kill</p>
            <GrowArea className="eps-input big" autoFocus value={brief.problem}
              placeholder="Naming takes founders weeks — and the good domains are gone"
              onChange={(v) => set({ problem: v })} onKeyDown={onEnter} style={{ marginTop: 24 }} />
            <p className="eps-hint">Say it like you'd say it to a friend.</p>
          </div>
          {footNext()}
        </>
      );
      case 4: return oneLiner("Who is it for?", brief.audience, (v) => set({ audience: v }),
        "Early-stage founders naming their first real thing", "The people who'll say the name out loud.");

      // 06 · Space
      case 5: return (
        <>
          <div className="eps-stage">
            <p className="eps-kicker" style={{ marginBottom: 22 }}>Your space is… <span style={{ color: "#4a4a4a", textTransform: "none", letterSpacing: 0 }}>tap all that fit</span></p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
              {SPACES.map((s, i) => {
                const on = presetSpaces.includes(s);
                return (
                  <button key={s} className={"eps-choice" + (on ? " on" : "")}
                    style={{ fontSize: on ? "clamp(40px, 6vw, 52px)" : "clamp(28px, 5vw, 40px)", fontWeight: 700, letterSpacing: "-.03em" }}
                    onClick={() => toggleSpace(s)}>
                    {s}.{i === 0 && <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: on ? "#8a8a8a" : "#3a3a3a", marginLeft: 12, verticalAlign: "middle" }}>Recommended</span>}
                    {on && <div className="eps-uline" style={{ width: 74 }} />}
                  </button>
                );
              })}
            </div>
            <input className="eps-input" value={customSpace} placeholder="Or type your own…" enterKeyHint="next"
              style={{ marginTop: 26, fontSize: 16, maxWidth: 300 }}
              onChange={(e) => applySpaces(presetSpaces, e.target.value)}
              onKeyDown={onEnter} />
          </div>
          <div className="eps-foot">
            <span className="eps-khint"><span className="eps-key">↑</span><span className="eps-key">↓</span> to choose</span>
            <span style={{ flex: 1 }} />
            <span className="eps-khint">Next <span className="eps-key">⏎</span></span>
            <button className="eps-btn" disabled={!canNext()} onClick={next}>Next →</button>
          </div>
        </>
      );

      // 07 · Reach
      case 6: return (
        <>
          <div className="eps-stage">
            <p className="eps-kicker" style={{ marginBottom: 18 }}>The name must work…</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
              {REACHES.map((r) => {
                const on = brief.geos?.[0] === r.geo;
                return (
                  <button key={r.geo} className={"eps-choice" + (on ? " on" : "")}
                    style={{ fontSize: on ? "clamp(48px, 7vw, 58px)" : 22, fontWeight: 700, letterSpacing: "-.035em", borderBottom: on ? "3px solid #fff" : "3px solid transparent", paddingBottom: 4 }}
                    onClick={() => set({ geos: [r.geo] })}>{r.label}.</button>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 34 }}>
              <span style={{ fontSize: 22 }}>🌍</span>
              <p className="eps-hint" style={{ margin: 0 }}>We'll check meaning, sayability and domains everywhere it lands.</p>
            </div>
          </div>
          <div className="eps-foot">
            <span className="eps-khint"><span className="eps-key">←</span><span className="eps-key">→</span> to choose</span>
            <span style={{ flex: 1 }} />
            <span className="eps-khint">Next <span className="eps-key">⏎</span></span>
            <button className="eps-btn" disabled={!canNext()} onClick={next}>Next →</button>
          </div>
        </>
      );

      // 08 · Feeling — one huge word, cycle through
      case 7: {
        const word = feelWords[feelIdx % feelWords.length] || "Clear";
        const others = [1, 2, 3].map((d) => feelWords[(feelIdx + d) % feelWords.length]).filter(Boolean);
        return (
          <>
            <div className="eps-stage" style={{ alignItems: "center", textAlign: "center" }}>
              <p className="eps-kicker" style={{ marginBottom: 26 }}>It should feel…</p>
              <span key={word} style={{ fontSize: "clamp(64px, 10vw, 92px)", fontWeight: 700, letterSpacing: "-.045em", lineHeight: 1, animation: "eps-popIn .3s ease both" }}>{word}.</span>
              <div className="eps-uline" style={{ width: 88, margin: "16px auto 34px" }} />
              <div style={{ display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap" }}>
                {others.map((o) => (
                  <button key={o} className="eps-choice" style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.01em" }}
                    onClick={() => setFeelIdx(feelWords.indexOf(o))}>{o}.</button>
                ))}
              </div>
              <p className="eps-hint" style={{ fontSize: 12, marginTop: 26 }}>Tap a word to make it the one</p>
            </div>
            <div className="eps-foot">
              <span className="eps-dim">Your north star</span>
              <span style={{ flex: 1 }} />
              <span className="eps-khint"><span className="eps-key">←</span><span className="eps-key">→</span> to choose</span>
              <button className="eps-btn" onClick={next}>Next →</button>
            </div>
          </>
        );
      }

      // 09 · Kind of name
      case 8: return (
        <>
          <div className="eps-stage">
            <p className="eps-kicker" style={{ marginBottom: 24 }}>The kind of name… <span style={{ color: "#4a4a4a", textTransform: "none", letterSpacing: 0 }}>tap all that fit</span></p>
            <div className="eps-kinds" style={{ display: "grid", gap: "18px 56px" }}>
              {KINDS.map((k) => {
                const on = brief.lanes.includes(k.lane);
                return (
                  <button key={k.lane} className={"eps-choice" + (on ? " on" : "")} onClick={() => toggleLane(k.lane)}>
                    <span style={{ fontSize: on ? 28 : 24, fontWeight: 700, letterSpacing: "-.02em" }}>{k.label}</span>
                    {k.lane === recLane && <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: on ? "#8a8a8a" : "#3a3a3a", marginLeft: 10 }}>Recommended</span>}
                    {on && <div className="eps-uline" style={{ width: 56 }} />}
                    <p style={{ fontSize: 13, color: on ? "#8a8a8a" : "#4a4a4a", margin: "5px 0 0", lineHeight: 1.5 }}>
                      {k.desc} <span style={{ fontFamily: "ui-monospace,'SF Mono',monospace", fontSize: 11 }}>{k.ex}</span>
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="eps-foot">
            <span className="eps-khint"><span className="eps-key">↑</span><span className="eps-key">↓</span> to choose</span>
            <span style={{ flex: 1 }} />
            <span className="eps-khint">Next <span className="eps-key">⏎</span></span>
            <button className="eps-btn" disabled={!canNext()} onClick={next}>Next →</button>
          </div>
        </>
      );

      // 10 · Words — the floating field (+ desktop rail: your brief / why this field)
      case 9: {
        const loading = !field.length;
        return (
          <>
            <div className="eps-stage" style={{ flexDirection: "row", alignItems: "center", gap: 48 }}>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                {loading ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 22 }}>
                      <span className="eps-spin" />
                      <span className="eps-pulse" style={{ fontSize: 14, fontWeight: 600, color: "#e6e6e6" }}>{err || "Reading your brief, finding the words…"}</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "16px 20px", alignItems: "center", maxWidth: 480 }}>
                      {[[34, 120], [24, 78], [29, 104], [22, 66], [27, 92], [23, 110], [30, 84], [22, 70]].map(([h, w], i) => (
                        <span key={i} className="eps-shim" style={{ height: h, width: w }} />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="eps-kicker" style={{ marginBottom: 10 }}>Tap what resonates</p>
                    <p className="eps-hint" style={{ margin: "0 0 24px" }}>
                      Tap to keep a word · {isTouch() ? "hold" : "hover"} it to open its meaning and the words around it.
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 18px", alignItems: "baseline", maxWidth: 680 }}>
                      {field.map((f, i) => (
                        <button key={f.w} className={"eps-word" + (isKept(f.w) ? " on" : "")}
                          style={{ fontSize: SIZES[i % SIZES.length], animation: `eps-floaty ${FLOATS[i % FLOATS.length]}s ease-in-out infinite ${(i * 0.13).toFixed(2)}s` }}
                          onClick={() => { if (pressFired.current) { pressFired.current = false; return; } isKept(f.w) ? openWord(f.w) : toggleKeep(f.w); }}
                          onMouseEnter={() => { if (!isTouch()) pressStart(f.w); }}
                          onMouseLeave={pressEnd}
                          onTouchStart={() => pressStart(f.w)}
                          onTouchEnd={pressEnd}
                          onContextMenu={(e) => e.preventDefault()}>
                          {f.w}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="eps-rail">
                <p className="eps-label" style={{ marginBottom: 12 }}>Your brief</p>
                <p style={{ fontSize: 14.5, color: "#e6e6e6", lineHeight: 1.55, margin: 0 }}>&ldquo;{brief.does}&rdquo;</p>
                <p style={{ fontSize: 12.5, color: "#8a8a8a", lineHeight: 1.55, margin: "12px 0 0" }}>
                  {brief.industry}{brief.geos?.length ? <> &middot; {brief.geos.join(", ").toLowerCase()}</> : null} &middot; must feel <b style={{ color: "#e6e6e6" }}>{(brief.signal[0] || "clear").toLowerCase()}</b> &middot; {brief.lanes[0] || "evocative"}
                </p>
                <div style={{ height: 1, background: "#222", margin: "18px 0" }} />
                {loading || !concept ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span className="eps-spin small" />
                    <span style={{ fontSize: 12.5, color: "#8a8a8a" }}>Shaping the field around <b style={{ color: "#e6e6e6" }}>{concept?.title.toLowerCase() || "your brief"}</b>&hellip;</span>
                  </div>
                ) : (
                  <>
                    <p className="eps-label" style={{ marginBottom: 12 }}>Why this field</p>
                    <p style={{ fontSize: 12.5, color: "#8a8a8a", lineHeight: 1.55, margin: 0 }}>
                      Your brief circles <b style={{ color: "#e6e6e6" }}>{concept.title.toLowerCase()}</b>{concept.blurb ? <> — {concept.blurb.charAt(0).toLowerCase() + concept.blurb.slice(1)}</> : "."}
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="eps-foot" style={{ flexWrap: "wrap" }}>
              {keptPills}
              <span style={{ flex: 1 }} />
              <span className="eps-khint">Make names <span className="eps-key">⏎</span></span>
              <button className="eps-btn" disabled={!canNext()} onClick={next}>Make names →</button>
            </div>
          </>
        );
      }

      // 10c · Ingredients
      case 10: return (
        <>
          <div className="eps-stage" style={{ alignItems: "center", textAlign: "center" }}>
            <p className="eps-kicker" style={{ marginBottom: 26 }}>Your ingredients</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
              {kept.map((w, i) => (
                <button key={w} className="eps-choice on"
                  style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-.02em", animation: `eps-floaty ${FLOATS[i % FLOATS.length]}s ease-in-out infinite ${(i * 0.15).toFixed(2)}s` }}
                  onClick={() => toggleKeep(w)} title="Tap to remove">{w}</button>
              ))}
            </div>
            <p className="eps-hint" style={{ marginTop: 26 }}>{err || <>They'll fuse, bend and combine into real names next.</>}</p>
          </div>
          <div className="eps-foot" style={{ flexDirection: "column", gap: 10, alignItems: "stretch" }}>
            <button className="eps-btn wide" disabled={!canNext()} onClick={next}>Make names from these {kept.length} →</button>
          </div>
        </>
      );

      // 11 · Narrowing — the machine works
      case 11: return (
        <div className="eps-stage" style={{ alignItems: "center", textAlign: "center", overflow: "hidden" }}>
          <div className="eps-streaks">
            {streakLines().map((line, i) => (
              <span key={i} style={{ top: `${[20, 36, 64, 80][i % 4]}%`, animationDuration: `${[2.2, 2.6, 2.9, 2.4][i % 4]}s`, animationDelay: `${[0, 0.4, 0.8, 0.2][i % 4]}s` }}>{line}</span>
            ))}
          </div>
          <span className="eps-kicker" style={{ letterSpacing: ".16em", position: "relative" }}>Scoring against your brief</span>
          <h2 style={{ fontSize: "clamp(88px, 12vw, 110px)", fontWeight: 700, letterSpacing: "-.045em", margin: "6px 0 0", position: "relative" }}>{narrowN}</h2>
          <span style={{ fontSize: 15, color: "#8a8a8a", position: "relative" }}>names, down to six</span>
        </div>
      );

      // 12 · The six — leader with its story + live domains (desktop), rest dim
      case 12: return (
        <>
          <div className="eps-stage">
            {pick && (
              <>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", maxWidth: 560 }}>
                  <span style={{ fontSize: "clamp(44px, 6vw, 56px)", fontWeight: 700, letterSpacing: "-.035em", cursor: "pointer" }} onClick={() => hear(pick.name)}>{pick.name}</span>
                  <span style={{ fontSize: 22, fontWeight: 700 }}>{scoreOf(pick.name, pick.total)}</span>
                </div>
                <p style={{ fontSize: 13.5, color: "#c7c7cc", margin: "8px 0 0", lineHeight: 1.5, maxWidth: "46ch" }}>
                  {pickIdea?.rationale || pick.verdict || pick.tagline || ""}
                </p>
                <div className="eps-sixdoms">
                  {board === null && <span className="eps-dim" style={{ fontFamily: "ui-monospace,'SF Mono',monospace", fontSize: 13 }}>checking domains&hellip;</span>}
                  {goodDoms.slice(0, 3).map((d) => (
                    <div key={d.domain} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14, fontFamily: "ui-monospace,'SF Mono',monospace" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 9, color: "#e6e6e6" }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: d.status === "negotiable" ? "#ffb02e" : "#3ddc84" }} />{d.domain}
                      </span>
                      <span style={{ color: "#8a8a8a" }}>{d.status === "negotiable" ? "for sale" : "available"}{domPrice(d) ? ` · ${domPrice(d)}` : ""}</span>
                    </div>
                  ))}
                </div>
                <div style={{ width: "100%", maxWidth: 560, height: 1, background: "#2a2a2a", margin: "20px 0" }} />
              </>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
              {rows.map((r, i) => {
                if (i === pickIdx) return null;
                const shade = ["#6a6a6a", "#4a4a4a", "#3a3a3a", "#303030", "#2a2a2a"][Math.min(4, Math.max(0, i - 1))];
                return (
                  <button key={r.name} className="eps-sixrow" onClick={() => setPickIdx(i)}>
                    <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-.02em", color: shade }}>{r.name}</span>
                    <span style={{ fontSize: 17, fontWeight: 700, color: shade }}>{scoreOf(r.name, r.total)}</span>
                  </button>
                );
              })}
            </div>
            <p className="eps-hint" style={{ fontSize: 12, marginTop: 18 }}>Tap a name to lead · tap the leader to hear it</p>
          </div>
          <div className="eps-foot" style={{ flexDirection: "column", gap: 10, alignItems: "stretch" }}>
            <span className="eps-khint" style={{ alignSelf: "flex-start" }}><span className="eps-key">↑</span><span className="eps-key">↓</span> to browse · <span className="eps-key">P</span> to hear it</span>
            <button className="eps-btn wide" onClick={next}>Reveal my name</button>
          </div>
        </>
      );

      // 13 · The reveal — lights on
      case 13: return (
        <>
          <div className="eps-stage" style={{ alignItems: "center", textAlign: "center" }}>
            <span className="eps-kicker" style={{ letterSpacing: ".16em", color: "#8a8a8f", marginBottom: 24 }}>And your name is…</span>
            <div key={pick?.name} style={{ display: "flex", gap: 2 }}>
              {(pick?.name || "").split("").map((ch, i) => (
                <span key={i} className="eps-letter" style={{ animationDelay: `${i * 0.1}s` }}>{ch}</span>
              ))}
            </div>
            <div style={{ width: 64, height: 3, borderRadius: 2, background: "#000", marginTop: 22, animation: "eps-rise .6s ease .7s both" }} />
            <p style={{ fontSize: 15, color: "#6a6a6a", margin: "22px 0 0", animation: "eps-rise .6s ease .9s both" }}>{pick?.tagline || pickIdea?.rationale || "Made for you."}</p>
          </div>
          <div className="eps-foot" style={{ animation: "eps-rise .6s ease 1.3s both" }}>
            <button className="eps-choice" style={{ fontSize: 13, color: "#8a8a8f" }}
              onClick={() => setPickIdx((i) => (i + 1) % Math.max(1, rows.length))}>
              Not it? <b style={{ color: "#000" }}>Reveal the runner-up</b>
            </button>
            <button className="eps-btn" style={{ background: "#000", color: "#fff" }} onClick={next}>Own it →</button>
          </div>
        </>
      );

      // 14 · Own it — what's next hub + "grab the domain" and "brand book" views
      case 14: {
        const name = pick?.name || "Aurova";
        const blurb = pickIdea?.rationale || pick?.verdict || pick?.tagline || "";
        if (own === "domain") return (
          <>
            <div className="eps-stage">
              <div className="eps-owncols">
                <div>
                  <p className="eps-kicker" style={{ letterSpacing: ".2em", fontSize: 12, marginBottom: 10 }}>Grab the domain</p>
                  <h2 style={{ fontSize: "clamp(27px, 4.5vw, 60px)", fontWeight: 700, letterSpacing: "-.045em", lineHeight: 1.06, margin: 0 }}>Where {name} lives</h2>
                  <p style={{ fontSize: "clamp(13px, 1.4vw, 16px)", color: "#9a9a9a", margin: "12px 0 0", lineHeight: 1.5, maxWidth: "30ch" }}>Pick one — we register it for you in a minute, then point it wherever you build.</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {board === null && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="eps-spin small" /><span className="eps-dim">Querying the registries&hellip;</span></div>
                  )}
                  {(moreDoms ? goodDoms : goodDoms.slice(0, 3)).map((d) => {
                    const selDom = chosenDom?.domain === d.domain;
                    return (
                      <button key={d.domain} onClick={() => setDomSel(d.domain)}
                        style={{ display: "flex", alignItems: "center", gap: 13, padding: "15px 16px", borderRadius: 16, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                          background: selDom ? "#fff" : "#161616", color: selDom ? "#000" : "#fff", border: selDom ? "1.5px solid #fff" : "1px solid #2a2a2a" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.status === "negotiable" ? "#ffb02e" : selDom ? "#12b981" : "#3ddc84", flex: "0 0 auto" }} />
                        <span style={{ flex: 1, fontSize: 16, fontFamily: "ui-monospace,'SF Mono',monospace", fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{d.domain}</span>
                        {selDom
                          ? <span style={{ fontSize: 12, color: "#12b981", fontWeight: 700 }}>BEST</span>
                          : <span style={{ fontSize: 11, color: "#8a8a8a" }}>{d.status === "negotiable" ? "for sale" : "available"}</span>}
                        {domPrice(d) && <span style={{ fontSize: 14, fontFamily: "ui-monospace,'SF Mono',monospace", color: selDom ? "#3a3a3a" : "#8a8a8a" }}>{domPrice(d)}</span>}
                      </button>
                    );
                  })}
                  {board && !goodDoms.length && <span className="eps-dim">Every close extension is taken — try a prefix like get{name.toLowerCase()}.com.</span>}
                  {takenDom && (
                    <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "15px 16px", borderRadius: 16, background: "#0f0f0f", border: "1px solid #202020" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff5f57", flex: "0 0 auto" }} />
                      <span style={{ flex: 1, fontSize: 16, fontFamily: "ui-monospace,'SF Mono',monospace", fontWeight: 600, color: "#6a6a6a", textDecoration: "line-through" }}>{takenDom.domain}</span>
                      <span style={{ fontSize: 11, color: "#6a6a6a" }}>taken</span>
                    </div>
                  )}
                  {board && goodDoms.length > 3 && !moreDoms && (
                    <button className="eps-choice" style={{ fontSize: 12.5, color: "#6a6a6a", textAlign: "center" }} onClick={() => setMoreDoms(true)}>＋ Try more extensions</button>
                  )}
                </div>
              </div>
            </div>
            <div className="eps-foot" style={{ flexDirection: "column", gap: 10, alignItems: "stretch" }}>
              <span className="eps-khint" style={{ alignSelf: "flex-end" }}>Register {chosenDom?.domain || "it"} <span className="eps-key">⏎</span></span>
              <button className="eps-btn wide" disabled={!chosenDom}
                onClick={() => chosenDom && window.open(gdUrl(chosenDom.domain), "_blank", "noopener")}>
                Register {chosenDom?.domain || "your domain"}{domPrice(chosenDom) ? ` · ${domPrice(chosenDom)}` : ""}
              </button>
            </div>
          </>
        );
        if (own === "book") return (
          <>
            <div className="eps-stage">
              <div className="eps-owncols" style={{ alignItems: "center" }}>
                <div style={{ flex: "0 0 auto", maxWidth: 320 }}>
                  <p className="eps-kicker" style={{ letterSpacing: ".2em", fontSize: 12, marginBottom: 10 }}>Brand book &middot; {name}</p>
                  <h2 style={{ fontSize: "clamp(27px, 4vw, 52px)", fontWeight: 700, letterSpacing: "-.04em", lineHeight: 1.04, margin: 0 }}>The story behind the name</h2>
                  <p style={{ fontSize: "clamp(13px, 1.3vw, 15px)", color: "#9a9a9a", margin: "12px 0 0", lineHeight: 1.5 }}>Everything a founder needs to start showing up like a real brand — generated from your name and brief.</p>
                </div>
                <div className="eps-bookgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, flex: 1, minWidth: 0 }}>
                  <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid #262626" }}>
                    <div style={{ height: 74, display: "flex", alignItems: "flex-end", padding: "10px 14px", background: book?.palette?.length ? `linear-gradient(120deg, ${book.palette.slice(0, 3).join(",")})` : "linear-gradient(120deg,#ff9e7a,#c9b6ff,#7c9cff)" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,.3)" }}>Palette</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, padding: "12px 14px", background: "#111" }}>
                      {(book?.palette?.length ? book.palette : ["", "", "", ""]).slice(0, 4).map((hex, i) => (
                        <span key={i} className={hex ? undefined : "eps-pulse"} style={{ width: 26, height: 26, borderRadius: 7, background: hex || "#1c1c1c", border: "1px solid #333" }} />
                      ))}
                    </div>
                  </div>
                  <div style={{ borderRadius: 18, border: "1px solid #262626", background: "#111", padding: 14, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <span className="eps-label" style={{ margin: 0 }}>Wordmark</span>
                    <span style={{ fontSize: "clamp(26px, 2.5vw, 34px)", fontWeight: 700, letterSpacing: "-.03em", marginTop: 6 }}>{name}</span>
                  </div>
                  <div style={{ borderRadius: 18, border: "1px solid #262626", background: "#111", padding: 14 }}>
                    <span className="eps-label" style={{ margin: 0 }}>Voice</span>
                    <p className={book ? undefined : "eps-pulse"} style={{ fontSize: 14, color: "#e6e6e6", margin: "8px 0 0", lineHeight: 1.5 }}>{book ? (book.voice || "Warm, clear, quietly confident.") : "Reading your brief…"}</p>
                  </div>
                  <div style={{ borderRadius: 18, border: "1px solid #262626", background: "#111", padding: 14 }}>
                    <span className="eps-label" style={{ margin: 0 }}>Tagline</span>
                    <p className={book ? undefined : "eps-pulse"} style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-.01em", color: "#fff", margin: "8px 0 0", lineHeight: 1.35 }}>{book ? `“${book.tagline || name}.”`.replace("..", ".") : "…"}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="eps-foot" style={{ flexDirection: "column", gap: 10, alignItems: "stretch" }}>
              <span className="eps-khint" style={{ alignSelf: "flex-end" }}>Open full brand book <span className="eps-key">⏎</span></span>
              <button className="eps-btn wide" onClick={() => setBookOpen(true)}>Open full brand book →</button>
            </div>
          </>
        );
        // the hub
        return (
          <>
            <div className="eps-stage">
              <div className="eps-owncols">
                <div style={{ textAlign: "center" }} className="eps-ownhead">
                  <p className="eps-kicker" style={{ letterSpacing: ".2em", fontSize: 11, margin: "0 0 6px" }}>Your name</p>
                  <h2 style={{ fontSize: "clamp(44px, 6vw, 76px)", fontWeight: 700, letterSpacing: "-.045em", lineHeight: 0.98, margin: 0 }}>{name}</h2>
                  {blurb && <p style={{ fontSize: "clamp(13px, 1.4vw, 16px)", color: "#9a9a9a", margin: "10px 0 0", lineHeight: 1.5, maxWidth: "32ch", marginLeft: "auto", marginRight: "auto" }}>{blurb}</p>}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, margin: "18px 0 12px" }}>
                    <span style={{ display: "grid", placeItems: "center", width: 22, height: 22, borderRadius: "50%", background: "#fff", color: "#000", fontSize: 12, flex: "0 0 auto" }}>✓</span>
                    <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.01em" }}>What's next</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    <button onClick={() => setOwn("domain")}
                      style={{ display: "flex", alignItems: "center", gap: 13, padding: 15, borderRadius: 16, background: "#fff", color: "#000", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>Grab the domain</span>
                        <span style={{ display: "block", fontSize: 12, color: "#6a6a6a", marginTop: 2 }}>
                          {board === undefined || board === null ? "checking availability…" : bestDom ? `${bestDom.domain} is ${bestDom.status === "negotiable" ? "for sale" : "free"}${domPrice(bestDom) ? ` · from ${domPrice(bestDom)}` : ""}` : "close variants are open"}
                        </span>
                      </span>
                      <span style={{ fontSize: 17, flex: "0 0 auto" }}>→</span>
                    </button>
                    <button onClick={() => setOwn("book")}
                      style={{ display: "flex", alignItems: "center", gap: 13, padding: 15, borderRadius: 16, background: "#161616", color: "#fff", border: "1px solid #2a2a2a", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>Your brand book</span>
                        <span style={{ display: "block", fontSize: 12, color: "#8a8a8a", marginTop: 2 }}>Voice, colours &amp; the story behind {name}</span>
                      </span>
                      <span style={{ fontSize: 17, flex: "0 0 auto" }}>→</span>
                    </button>
                  </div>
                  <p className="eps-kicker" style={{ fontSize: 11, letterSpacing: ".1em", color: "#5c5c5c", margin: "18px 0 9px" }}>Coming soon</p>
                  <div style={{ display: "flex", gap: 7 }}>
                    {["Logo", "Website", "Trademark"].map((c) => (
                      <span key={c} style={{ flex: 1, textAlign: "center", fontSize: 11.5, fontWeight: 600, color: "#8a8a8a", padding: "10px 4px", borderRadius: 11, background: "#111", border: "1px solid #242424" }}>{c}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="eps-foot">
              <button className="eps-choice" style={{ fontSize: 12.5, color: "#6a6a6a" }} onClick={() => goto(13)}>← Back to the reveal</button>
              <span style={{ flex: 1 }} />
              <span className="eps-khint">Grab the domain <span className="eps-key">⏎</span></span>
            </div>
          </>
        );
      }

      default: return null;
    }
  };

  function oneLiner(q: string, val: string, on: (v: string) => void, ph: string, hint: string) {
    return (
      <>
        <div className="eps-stage">
          <h2 className="eps-h">{q}</h2>
          <GrowArea className="eps-input" autoFocus value={val} placeholder={ph}
            onChange={on} onKeyDown={onEnter} style={{ marginTop: 30 }} />
          <p className="eps-hint">{hint}</p>
        </div>
        {footNext()}
      </>
    );
  }
  function footNext() {
    return (
      <div className="eps-foot end">
        <span className="eps-khint">Next <span className="eps-key">⏎</span></span>
        <button className="eps-btn" disabled={!canNext()} onClick={next}>Next →</button>
      </div>
    );
  }
  function streakLines(): string[] {
    const pool = [...kept, ...field.map((f) => f.w), "lumen", "nova", "oriri"];
    const lines: string[] = [];
    for (let i = 0; i < 4; i++) lines.push(pool.slice(i * 3, i * 3 + 4).join(" · ") || "ember · dawn · spark · alba");
    return lines;
  }

  const lights = step === 13;
  const hub = step === 14;
  const showTop = step >= 1 && step !== 11;
  // The › forward arrow lives on the pure question beats only (per the design).
  const canForward = step >= 2 && step <= 8 && canNext();

  return (
    <div className={"eps" + (lights ? " lights" : "") + (hub ? " hub" : "")}>
      {showTop && (
        <div className="eps-top">
          <button className="eps-back" onClick={back}>‹</button>
          <span className="eps-meta">{meta ? `${meta} / 12` : ""}</span>
          <button className="eps-back" style={{ marginLeft: 0, marginRight: -10, visibility: canForward ? "visible" : "hidden", color: "#8a8a8a" }}
            onClick={next}>›</button>
        </div>
      )}

      <div key={step} style={{ display: "contents" }}>{stage()}</div>

      {/* word overlay — meaning + its world */}
      {overlay && (
        <div className="eps-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOverlay(null); }}>
          <div style={{ maxWidth: 640 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
              <span style={{ fontSize: "clamp(44px, 6vw, 52px)", fontWeight: 700, letterSpacing: "-.03em" }}>{overlay.w}</span>
              <button className="eps-btn" style={{ padding: "10px 20px", fontSize: 14 }} onClick={() => toggleKeep(overlay.w)}>
                {isKept(overlay.w) ? "✓ Kept" : "Keep"}
              </button>
            </div>
            <p style={{ fontSize: 15, color: "#bcbcbc", margin: "10px 0 0", lineHeight: 1.5, minHeight: 23 }}>
              {overlay.def || <>Reading its meaning<Caret /></>}
            </p>
            <div style={{ width: "100%", height: 1, background: "#2a2a2a", margin: "22px 0 16px" }} />
            <p className="eps-label" style={{ marginBottom: 14 }}>Its world · tap to keep</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 14px", alignItems: "baseline" }}>
              {overlay.world.map((f, i) => (
                <button key={f.w} className={"eps-word" + (isKept(f.w) ? " on" : "")}
                  style={{ fontSize: [24, 20, 22, 19, 20, 19][i % 6], animation: `eps-rise .5s ease ${(i * 0.08).toFixed(2)}s both`, color: isKept(f.w) ? "#fff" : "#8a8a8a" }}
                  onClick={() => toggleKeep(f.w)}>{f.w}</button>
              ))}
              {!overlay.world.length && <span className="eps-dim">finding its world…</span>}
            </div>
            <p className="eps-hint" style={{ fontSize: 12, marginTop: 18 }}>Related · translations · roots — one field</p>
          </div>
          <div style={{ position: "absolute", bottom: 28, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "0 28px" }}>
            {keptPills}
            <span className="eps-dim" style={{ flex: "0 0 auto" }}>{isTouch() ? "Tap outside to close" : <>Press <span className="eps-key" style={{ fontSize: 11 }}>esc</span> to close</>}</span>
          </div>
        </div>
      )}

      {/* the full brand book (beta look) over the stage */}
      {bookOpen && pick && (
        <BrandBook brief={brief} name={pick.name} skin="beta" onClose={() => setBookOpen(false)} />
      )}

      {test && (
        <div className="eps-testbar">
          <span style={{ fontFamily: "ui-monospace,'SF Mono',monospace", fontSize: 10, letterSpacing: ".08em", opacity: .6, marginRight: 4 }}>TEST</span>
          {Array.from({ length: 15 }).map((_, i) => (
            <button key={i} onClick={() => goto(i)} style={{
              width: 22, height: 22, borderRadius: "50%", border: "none", cursor: "pointer", fontSize: 10,
              background: i === step ? "#fff" : "rgba(255,255,255,.14)", color: i === step ? "#1d1d1f" : "#fff",
            }}>{i + 1}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// An underline textarea that grows with its content (the brief answers wrap
// over several lines like the design; ⏎ still advances via onKeyDown).
function GrowArea({ value, onChange, onKeyDown, className, style, placeholder, autoFocus }: {
  value: string; onChange: (v: string) => void; onKeyDown: (e: React.KeyboardEvent) => void;
  className?: string; style?: React.CSSProperties; placeholder?: string; autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.height = "0px";
      el.style.height = el.scrollHeight + "px";
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [value]);
  return (
    <textarea ref={ref} rows={1} className={className} style={style} placeholder={placeholder}
      autoFocus={autoFocus} enterKeyHint="next" value={value}
      onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} />
  );
}

function Caret() {
  return <span style={{ display: "inline-block", width: 2, height: "1em", background: "currentColor", marginLeft: 3, verticalAlign: "-2px", animation: "caret 1.1s step-end infinite" }} />;
}

function isTouch() {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}
