// The beta flow — the studio rebuilt screen-for-screen to the Claude Design
// "macOS app" redesign (The Naming Studio.dc.html). Its own 10-step machine
// (no Concepts step; a dedicated Domains step), full-bleed, reusing the live
// `naming` API + data layer. Classic CosmosFlow is left entirely untouched.
import { useEffect, useRef, useState } from "react";
import {
  naming, logDecision, type Brief, type Comparison, type Concept, type Feeling,
} from "../lib/namingApi";
import { setTestMode } from "../lib/requestLog";
import { recommendLanes } from "../lib/localStudio";
import { SIGNAL_FALLBACK } from "../cosmos/data";
import { Cx } from "../cosmos/chrome";
import type { TestSeed } from "../cosmos/mock";
import { type ExploreStore } from "../cosmos/Explore";
import { type SavedIdea } from "../cosmos/Shortlist";
import { BrandBook } from "../components/BrandBook";
import { SatisfactionPopup } from "../components/SatisfactionPopup";
import { BetaBrief, BetaBrand, BetaEmotional, BetaStrategy } from "./screens/intake";
import { BetaExplore, BetaNamesCompare } from "./screens/explore";
import { BetaDomains, BetaShare, BetaDecide } from "./screens/decide";

// 8 visible steps; the Decision reveal renders after Domains and displays as 08/08.
export const BETA_STEPS = [
  "Company context", "Brand context", "Emotional value", "Naming strategy",
  "Exploration", "Names & comparison", "Vote", "Domains",
];

const empty: Brief = { does: "", industry: "", problem: "", audience: "", values: "", uvp: "", signal: [], avoid: [], tone: [], lanes: [], geos: [] };

export function BetaFlow({ initialDoes, onRestart, test, userName }: { initialDoes: string; onRestart: () => void; test?: TestSeed; userName?: string }) {
  const firstName = (userName || "").split(" ")[0].trim();
  setTestMode(!!test);

  const [step, setStep] = useState(test?.step ?? 0);
  const [maxReached, setMaxReached] = useState(test?.step ?? 0);
  const [brief, setBrief] = useState<Brief>(test?.brief ?? { ...empty, does: initialDoes || "" });
  const [stage, setStage] = useState(test?.stage ?? "Building it");

  const [feelings, setFeelings] = useState<Feeling[]>(test?.feelings ?? []);
  const [concepts, setConcepts] = useState<Concept[]>(test?.concepts ?? []);
  const [saved, setSaved] = useState<SavedIdea[]>(test?.saved ?? []);
  const [shortlist, setShortlist] = useState<string[]>(test?.shortlist ?? []);
  const [comp, setComp] = useState<Comparison | null>(test?.comp ?? null);
  const [chosenFinal, setChosenFinal] = useState<string>(test?.chosenFinal ?? "");
  const [brandBookOpen, setBrandBookOpen] = useState(false);
  const [satOpen, setSatOpen] = useState(false);
  const [satDone, setSatDone] = useState(false);
  const [feelingsLoading, setFeelingsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const exploreStore = useRef<ExploreStore>({ cache: new Map(), seen: new Set(), focus: null, groups: [], active: 0, hist: [], future: [] });

  const set = (patch: Partial<Brief>) => setBrief((b) => ({ ...b, ...patch }));
  const goto = (n: number) => { setStep(n); setMaxReached((m) => Math.max(m, n)); };
  const toggleArr = (arr: string[], v: string, max = 999) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : arr.length >= max ? arr : [...arr, v];

  // Scroll to top whenever the step changes.
  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  // Log the final chosen name the moment the Decision screen is reached.
  const decisionLogged = useRef(false);
  useEffect(() => {
    if (step !== 8 || decisionLogged.current) return;
    const name = chosenFinal || comp?.recommended || "";
    if (!name) return;
    decisionLogged.current = true;
    logDecision(name);
  }, [step, chosenFinal, comp]);

  // Show satisfaction popup 2s after landing on the Decision screen (step 8).
  useEffect(() => {
    if (step !== 8 || satDone || test) return;
    const t = setTimeout(() => setSatOpen(true), 2000);
    return () => clearTimeout(t);
  }, [step, satDone, test]);

  // Warm feelings (emotions) in the background once the brief has a sentence.
  const feelingsBusy = useRef(false);
  useEffect(() => {
    if (test || feelings.length || feelingsBusy.current || !brief.does.trim() || step > 2) return;
    feelingsBusy.current = true; setFeelingsLoading(true);
    naming.feelings(brief).then(setFeelings).catch(() => { /* fallback */ })
      .finally(() => { feelingsBusy.current = false; setFeelingsLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, brief.does]);

  // Pre-warm concepts once the user picks their first north-star emotion (step 2),
  // so the 3–6s Sonnet call is already done by the time they click "Begin exploration".
  const conceptsBusy = useRef(false);
  useEffect(() => {
    if (test || concepts.length || conceptsBusy.current || !brief.signal.length || step > 3) return;
    conceptsBusy.current = true;
    naming.concepts(brief).then(setConcepts).catch(() => {}).finally(() => { conceptsBusy.current = false; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brief.signal.length]);

  // Live "brief, so far" reframe (debounced) for the intake screens.
  const [synth, setSynth] = useState<{ line: string; tags: string[] } | null>(null);
  const synthLine = useRef("");
  synthLine.current = synth?.line || "";
  useEffect(() => {
    if (test || step > 3 || !brief.does.trim()) return;
    const t = setTimeout(() => { naming.synthesize(brief, synthLine.current).then((s) => { if (s?.line) setSynth(s); }).catch(() => { /* keep */ }); }, 1100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, brief.does, brief.problem, brief.audience, brief.signal, brief.geos]);

  const briefLine = synth?.line || brief.does || "A naming studio for founders who care about taste.";
  const briefTags = (() => {
    const base = synth?.tags?.length ? synth.tags : [brief.industry || "creator tools", stage.split("·")[0].trim()];
    const seen = new Set<string>();
    return [...base, ...(brief.signal || []), ...(brief.geos || [])].map((t) => String(t).trim()).filter(Boolean)
      .filter((t) => { const k = t.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  })();

  const emotionOpts = feelings.length ? feelings.map((f) => f.word) : SIGNAL_FALLBACK;
  const northStar = brief.signal[0] || "";

  const shell = (node: React.ReactNode, opts?: { wide?: boolean; barRight?: React.ReactNode; stepLabel?: string }) => (
    <Cx step={step} steps={BETA_STEPS} skin="beta" wide={opts?.wide}
      reached={test ? BETA_STEPS.length - 1 : maxReached}
      stepLabel={opts?.stepLabel}
      barRight={opts?.barRight}
      topRight={test ? <span className="lbl" style={{ color: "var(--bad)" }}>● Test mode</span> : undefined}
      onBack={() => (step > 0 ? goto(step - 1) : onRestart())} onJump={goto} onLeave={onRestart}>
      {error && <div className="note" style={{ borderColor: "var(--bad)", color: "var(--bad)" }}>{error}</div>}
      {node}
      {test && <BetaTestBar step={step} onJump={goto} />}
    </Cx>
  );

  // 01 — Company context
  if (step === 0) return shell(
    <BetaBrief brief={brief} set={set} stage={stage} setStage={setStage} firstName={firstName}
      briefLine={briefLine} briefTags={briefTags} onNext={() => goto(1)} />
  );

  // 02 — Brand context (feelings warm in the background; step 3 shows its own skeleton)
  if (step === 1) return shell(
    <BetaBrand brief={brief} set={set} toggleArr={toggleArr} briefLine={briefLine} briefTags={briefTags} firstName={firstName}
      onNext={() => goto(2)} />
  );

  // 03 — Emotional value (north star)
  if (step === 2) return shell(
    <BetaEmotional options={emotionOpts} selected={brief.signal} northStar={northStar}
      busy={feelingsLoading && !feelings.length}
      onToggle={(s) => set({ signal: toggleArr(brief.signal, s, 6) })}
      onStar={(s) => set({ signal: [s, ...brief.signal.filter((x) => x !== s)] })}
      onNext={() => { if (!brief.lanes.length) set({ lanes: recommendLanes({ ...brief }) }); goto(3); }} />
  );

  // 04 — Naming strategy (concepts load while the exploration page shows its skeleton)
  if (step === 3) return shell(
    <BetaStrategy brief={brief} set={set} toggleArr={toggleArr}
      onNext={() => {
        if (!concepts.length && !conceptsBusy.current) {
          conceptsBusy.current = true;
          naming.concepts(brief).then(setConcepts).catch((e: any) => setError(e?.message || String(e)))
            .finally(() => { conceptsBusy.current = false; });
        }
        goto(4);
      }} />
  );

  const concept: Concept | undefined = concepts[0];

  // 05 — Exploration
  if (step === 4) return shell(
    <BetaExplore brief={brief} concept={concept} saved={saved} setSaved={setSaved} store={exploreStore.current}
      initial={test?.exploreSeed} onBack={() => goto(3)} onDone={() => goto(5)} />,
    { wide: true, barRight: <span className="lbl" style={{ color: "var(--accent)" }}>★ {saved.length} saved</span> }
  );

  // Score the shortlist in the background — the domains page shows its own
  // "querying registrars" skeleton while this resolves.
  const startCompare = (top: string[]) => {
    setError(null); setComp(null);
    naming.compare(brief, top.map((n) => ({ name: n, type: "", rationale: "", score: 0 })))
      .then(setComp).catch((e: any) => setError(e?.message || String(e)));
  };

  const keepTop = (name: string, allNames: string[]) => {
    const top = [name, ...allNames.filter((n) => n !== name)].slice(0, 5);
    setChosenFinal(name);
    setShortlist(top);
    return top;
  };

  // 06 — Names & comparison
  if (step === 5) return shell(
    <BetaNamesCompare brief={brief} saved={saved} shortlist={shortlist} setShortlist={setShortlist}
      initialRows={test?.shortlistRows}
      onVote={(name, allNames) => { keepTop(name, allNames); goto(6); }}
      onNext={(name, allNames) => { startCompare(keepTop(name, allNames)); goto(7); }} />
  );

  // 07 — Vote (optional)
  // Use comp rows when available; fall back to the shortlist captured on the way in.
  const shareNames = comp ? comp.rows.map((r) => r.name).slice(0, 4) : shortlist.slice(0, 4);
  if (step === 6) return shell(
    <BetaShare brief={brief} names={shareNames}
      onDone={() => {
        if (!comp && shortlist.length) startCompare(shortlist); // vote shortcut — score in background
        goto(7);
      }} />
  );

  // 08 — Domains (comp may still be scoring; the page shows its skeleton meanwhile)
  if (step === 7) return shell(
    <BetaDomains brief={brief} comp={comp} initialPick={chosenFinal} fallbackNames={shortlist}
      onLockIn={(name) => { setChosenFinal(name); goto(8); }} />
  );

  // Decision reveal (after the 8 steps; shown as 08/08)
  if (step === 8) return (
    <>
      {shell(
        <BetaDecide comp={comp} chosenFinal={chosenFinal || comp?.recommended || ""}
          onBack={() => goto(7)} onBrandBook={() => setBrandBookOpen(true)} />,
        { stepLabel: "08" }
      )}
      {brandBookOpen && (chosenFinal || comp?.recommended) && (
        <BrandBook brief={brief} name={chosenFinal || comp?.recommended || ""} skin="beta" onClose={() => setBrandBookOpen(false)} />
      )}
      {satOpen && (
        <SatisfactionPopup name={chosenFinal || comp?.recommended || "your name"}
          onClose={() => { setSatOpen(false); setSatDone(true); }} />
      )}
    </>
  );

  return shell(<div />);
}

// Tiny in-flow step jumper for ?test&beta (desktop verification).
function BetaTestBar({ step, onJump }: { step: number; onJump: (n: number) => void }) {
  return (
    <div style={{ position: "fixed", bottom: 12, left: "50%", transform: "translateX(-50%)", zIndex: 60, display: "flex", gap: 4, alignItems: "center", background: "#1d1d1f", color: "#fff", borderRadius: 999, padding: "6px 10px", boxShadow: "0 10px 30px -12px rgba(0,0,0,.5)" }}>
      <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.08em", opacity: 0.6, marginRight: 4 }}>TEST</span>
      {Array.from({ length: BETA_STEPS.length + 1 }).map((_, i) => (
        <button key={i} onClick={() => onJump(i)} style={{
          width: 22, height: 22, borderRadius: "50%", border: "none", cursor: "pointer", fontSize: 11,
          background: i === step ? "#fff" : "rgba(255,255,255,.14)", color: i === step ? "#1d1d1f" : "#fff",
        }}>{i + 1}</button>
      ))}
    </div>
  );
}
