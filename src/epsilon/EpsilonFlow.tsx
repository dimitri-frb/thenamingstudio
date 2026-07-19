// /epsilon — "Kinetic Reveal": the whole journey as cinematic moments on one
// black stage. One question per screen, huge type, no chrome, and the reveal as
// the climax. Faithful to the Claude Design import (Naming Studio - Kinetic
// Flow.dc.html), mobile + desktop (keyboard-first: type, arrows pick, ⏎ advances).
// Reuses the live data layer (naming.*, fetchDomainBoard, captureLead).
import { useCallback, useEffect, useRef, useState } from "react";
import {
  naming, fetchDomainBoard, captureLead, logDecision,
  type Brief, type Comparison, type Concept, type NameIdea, type DomainCard,
} from "../lib/namingApi";
import { setTestMode } from "../lib/requestLog";
import { MOCK } from "../cosmos/mock";
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
];

// Which screens show the "NN / 12" counter (per the design).
const META: Record<number, string> = { 2: "01", 3: "02", 4: "03", 5: "04", 6: "05", 7: "06", 8: "07", 9: "08", 10: "08", 12: "10" };

export function EpsilonFlow({ test, onExit }: { test?: boolean; onExit: () => void }) {
  setTestMode(!!test);
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState<Brief>(test ? { ...MOCK.brief, lanes: ["evocative"] } : EMPTY);
  const [who, setWho] = useState({ name: "", email: "" });
  const [customSpace, setCustomSpace] = useState("");
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
  const relCache = useRef<Map<string, { def: string; world: FieldWord[] }>>(new Map());
  const emailRef = useRef<HTMLInputElement>(null);

  const set = (p: Partial<Brief>) => setBrief((b) => ({ ...b, ...p }));
  const goto = useCallback((n: number) => { setStep(n); setErr(""); }, []);

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
      for (let i = 0; i < 4; i++) groups.forEach((g) => { const w = g.words[i]; if (w && flat.length < 12 && !flat.some((f) => f.w === w.w)) flat.push({ w: w.w, note: w.note, lang: w.lang }); });
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
      case 13: goto(14); break;
      default: goto(step + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, brief, who, feelings, feelIdx, kept, rows.length, test]);

  const back = () => {
    if (overlay) { setOverlay(null); return; }
    if (step === 0) { onExit(); return; }
    if (step === 12) { goto(10); return; }  // skip the interlude going back
    if (step === 11) { goto(10); return; }
    goto(step - 1);
  };

  // ── keyboard (desktop-first) ─────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (overlay) {
        if (e.key === "Escape") { setOverlay(null); e.preventDefault(); }
        if (e.key.toLowerCase() === "k") { toggleKeep(overlay.w); e.preventDefault(); }
        return;
      }
      if (e.key === "Enter") { next(); e.preventDefault(); return; }
      const inField = (e.target as HTMLElement)?.tagName === "INPUT";
      if (inField) return;
      if (step === 5 && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown")) {
        const dir = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
        const cur = Math.max(0, SPACES.indexOf(brief.industry));
        set({ industry: SPACES[(cur + dir + SPACES.length) % SPACES.length] });
        setCustomSpace(""); e.preventDefault();
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
        const dir = e.key === "ArrowUp" ? -1 : 1;
        const cur = Math.max(0, KINDS.findIndex((k) => brief.lanes[0] === k.lane));
        set({ lanes: [KINDS[(cur + dir + KINDS.length) % KINDS.length].lane] }); e.preventDefault();
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
  }, [step, overlay, next, brief.industry, brief.geos, brief.lanes, feelings.length, rows.length, pick]);

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
      case 2: return oneLiner("What are you building?", brief.does, (v) => set({ does: v }),
        "An AI studio that names companies with a strategist's rigor", "One sentence is enough.");
      case 3: return (
        <>
          <div className="eps-stage">
            <p className="eps-kicker">The problem you kill</p>
            <input className="eps-input big" autoFocus value={brief.problem} enterKeyHint="next"
              placeholder="Naming takes founders weeks — and the good domains are gone"
              onChange={(e) => set({ problem: e.target.value })} onKeyDown={onEnter} style={{ marginTop: 24 }} />
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
            <p className="eps-kicker" style={{ marginBottom: 22 }}>Your space is…</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
              {SPACES.map((s) => {
                const on = brief.industry === s;
                return (
                  <button key={s} className={"eps-choice" + (on ? " on" : "")}
                    style={{ fontSize: on ? "clamp(40px, 6vw, 52px)" : "clamp(28px, 5vw, 40px)", fontWeight: 700, letterSpacing: "-.03em" }}
                    onClick={() => { set({ industry: s }); setCustomSpace(""); }}>
                    {s}.{on && <div className="eps-uline" style={{ width: 74 }} />}
                  </button>
                );
              })}
            </div>
            <input className="eps-input" value={customSpace} placeholder="Or type your own…" enterKeyHint="next"
              style={{ marginTop: 26, fontSize: 16, maxWidth: 300 }}
              onChange={(e) => { setCustomSpace(e.target.value); set({ industry: e.target.value }); }}
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
            <div className="eps-kinds" style={{ display: "grid", gap: "18px 56px" }}>
              {KINDS.map((k) => {
                const on = brief.lanes[0] === k.lane;
                return (
                  <button key={k.lane} className={"eps-choice" + (on ? " on" : "")} onClick={() => set({ lanes: [k.lane] })}>
                    <span style={{ fontSize: on ? 28 : 24, fontWeight: 700, letterSpacing: "-.02em" }}>{k.label}</span>
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

      // 10 · Words — the floating field
      case 9: return (
        <>
          <div className="eps-stage">
            <p className="eps-kicker" style={{ marginBottom: 10 }}>Tap what resonates</p>
            <p className="eps-hint" style={{ margin: "0 0 24px" }}>
              Tap to keep a word · {isTouch() ? "hold" : "hover"} it to open its meaning and the words around it.
            </p>
            {!field.length ? (
              <p style={{ fontSize: 21, color: "#5c5c5c", margin: 0 }}>
                {err || <>Reading your brief, finding the words<Caret /></>}
              </p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 16px", alignItems: "baseline", maxWidth: 520 }}>
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
            )}
          </div>
          <div className="eps-foot">
            <span className="eps-dim"><b style={{ color: "#fff" }}>{kept.length}</b> kept</span>
            <span style={{ flex: 1 }} />
            <span className="eps-khint">Make names <span className="eps-key">⏎</span></span>
            <button className="eps-btn" disabled={!canNext()} onClick={next}>Make names →</button>
          </div>
        </>
      );

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

      // 12 · The six
      case 12: return (
        <>
          <div className="eps-stage">
            {pick && (
              <>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "clamp(44px, 6vw, 56px)", fontWeight: 700, letterSpacing: "-.035em" }}>{pick.name}</span>
                  <span style={{ fontSize: 22, fontWeight: 700 }}>{scoreOf(pick.name, pick.total)}</span>
                </div>
                <p style={{ fontSize: 13, fontFamily: "ui-monospace,'SF Mono',monospace", color: "#8a8a8a", margin: "6px 0 0" }}>
                  {pickIdea?.seed ? pickIdea.seed + " · " : ""}{pick.domains?.find((d) => d.tld.includes("com"))?.available ? ".com free" : "domains inside"}
                </p>
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

      // 14 · Own it
      case 14: return <OwnIt name={pick?.name || "Aurova"} geos={brief.geos} test={test} />;

      default: return null;
    }
  };

  function oneLiner(q: string, val: string, on: (v: string) => void, ph: string, hint: string) {
    return (
      <>
        <div className="eps-stage">
          <h2 className="eps-h">{q}</h2>
          <input className="eps-input" autoFocus value={val} placeholder={ph} enterKeyHint="next"
            onChange={(e) => on(e.target.value)} onKeyDown={onEnter} style={{ marginTop: 30 }} />
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
  const showTop = step >= 1 && step !== 11 && step !== 13 && step !== 14;

  return (
    <div className={"eps" + (lights ? " lights" : "")}>
      {showTop ? (
        <div className="eps-top">
          <button className="eps-back" onClick={back}>‹</button>
          <span className="eps-meta">{meta ? `${meta} / 12` : ""}</span>
        </div>
      ) : (step === 13 || step === 14) ? (
        <div className="eps-top">
          <button className="eps-back" onClick={back}>‹</button>
          <span className="eps-meta"></span>
        </div>
      ) : null}

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
          <div style={{ position: "absolute", bottom: 28, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px" }}>
            <span className="eps-dim"><b style={{ color: "#fff" }}>{kept.length}</b> kept</span>
            <span className="eps-dim">{isTouch() ? "Tap outside to close" : <>Press <span className="eps-key" style={{ fontSize: 11 }}>esc</span> to close</>}</span>
          </div>
        </div>
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

function Caret() {
  return <span style={{ display: "inline-block", width: 2, height: "1em", background: "currentColor", marginLeft: 3, verticalAlign: "-2px", animation: "caret 1.1s step-end infinite" }} />;
}

function isTouch() {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

// 14 · Own it — real availability + real prices for the chosen name.
function OwnIt({ name, geos, test }: { name: string; geos?: string[]; test?: boolean }) {
  const [doms, setDoms] = useState<DomainCard[] | null>(test ? [
    { domain: name.toLowerCase() + ".com", status: "available", price: "$12" },
    { domain: name.toLowerCase() + ".io", status: "available", price: "$38" },
    { domain: name.toLowerCase() + ".ai", status: "available", price: "$70" },
  ] : null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (test) return;
    let live = true;
    fetchDomainBoard(name, geos).then((b) => {
      if (!live) return;
      const order = (d: DomainCard) => [".com", ".io", ".ai"].indexOf(d.tld || "") + 1 || 9;
      const good = b.tlds.filter((d) => d.status === "available" || d.status === "negotiable").sort((a, c) => order(a) - order(c));
      const list = good.length ? good.slice(0, 3) : b.variants.slice(0, 3);
      setDoms(list);
    }).catch(() => setDoms([]));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const priceOf = (d: DomainCard) => d.price || d.offerPrice || "";
  const lead = doms?.[0];
  const gd = (domain: string) => `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(domain)}`;
  const share = async () => {
    const text = `Help me pick a name — I'm going with ${name}. Thoughts?`;
    try {
      if (navigator.share) { await navigator.share({ text }); return; }
      await navigator.clipboard.writeText(text);
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    } catch { /* dismissed */ }
  };

  return (
    <>
      <div className="eps-stage" style={{ alignItems: "center", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(50px, 7vw, 64px)", fontWeight: 700, letterSpacing: "-.04em", margin: 0 }}>{name}</h2>
        <div style={{ width: 40, height: 1, background: "#333", margin: "24px 0" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 13, width: "100%", maxWidth: 360 }}>
          {doms === null ? (
            <span className="eps-dim">Checking the registries<Caret /></span>
          ) : !doms.length ? (
            <span className="eps-dim">Every close domain is taken — a prefix (get{name.toLowerCase()}.com) can still be yours.</span>
          ) : doms.map((d, i) => (
            <div key={d.domain} className={"eps-dom" + (i === 0 ? " lead" : "")}>
              <span className="d"><span className="dot" style={{ background: d.status === "negotiable" ? "#ffb84d" : "#3ddc84" }} />{d.domain}</span>
              <span className="p">{priceOf(d) || (d.status === "negotiable" ? "for sale" : "free")}</span>
            </div>
          ))}
        </div>
        <p className="eps-hint" style={{ marginTop: 24 }}>Brand book included.</p>
      </div>
      <div className="eps-foot" style={{ flexDirection: "column", gap: 12, alignItems: "stretch" }}>
        <button className="eps-btn wide" disabled={!lead}
          onClick={() => lead && window.open(gd(lead.domain), "_blank", "noopener")}>
          Make it mine{lead && priceOf(lead) ? ` · ${priceOf(lead)}` : ""}
        </button>
        <button className="eps-choice" style={{ textAlign: "center", fontSize: 13, color: "#8a8a8a" }} onClick={share}>
          {copied ? "Copied — send it to a friend" : "Share for a vote first"}
        </button>
      </div>
    </>
  );
}
