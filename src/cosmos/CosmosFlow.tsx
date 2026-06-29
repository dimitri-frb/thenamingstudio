// The Cosmos flow — the full 10-step naming process, redrawn from the Full-Flow
// design and wired to the live `naming` API (real Claude via the Worker in prod,
// the dev bridge in dev, the client-side studio as a fallback). The intake and
// concept steps live here; the heavier screens are their own modules.
import { useEffect, useRef, useState } from "react";
import { naming, captureLead, captureSignup, fetchDomains, type Brief, type Concept, type Feeling } from "../lib/namingApi";
import { setTestMode, processId, setProcessId } from "../lib/requestLog";
import { loadFlow, saveFlow } from "../lib/flowState";
import { recommendLanes } from "../lib/localStudio";
import { BrandBook } from "../components/BrandBook";
import { Cx, CXSTEPS, Head, Foot, Star, Thinking, type Skin } from "./chrome";
import { LANES, TONE_OPTIONS, SIGNAL_FALLBACK, INDUSTRIES, STAGES, GEO_OPTIONS } from "./data";
import type { TestSeed } from "./mock";
import { Explore, type ExploreStore } from "./Explore";
import { Shortlist, type SavedIdea } from "./Shortlist";
import { Compare } from "./Compare";
import { Share } from "./Share";
import { Decide } from "./Decide";
import { EmailGate } from "./EmailGate";
import { Feedback } from "./Feedback";

const empty: Brief = { does: "", industry: "", problem: "", audience: "", values: "", uvp: "", signal: [], avoid: [], tone: [], lanes: [], geos: [] };

export function CosmosFlow({ initialDoes, seedBrief, onRestart, test, skin }: { initialDoes: string; seedBrief?: Brief | null; onRestart: () => void; test?: TestSeed; skin?: Skin }) {
  // Keep the request log clean: the sample/test flow is never recorded.
  setTestMode(!!test);
  // Restore an in-progress process from a previous session (read once). Test mode
  // and the voice-seeded path never restore.
  const restoredRef = useRef<ReturnType<typeof loadFlow> | undefined>(undefined);
  if (restoredRef.current === undefined) {
    restoredRef.current = (test || seedBrief) ? null : loadFlow();
    if (restoredRef.current?.process) setProcessId(restoredRef.current.process);
  }
  const R = restoredRef.current;

  const [step, setStep] = useState(R?.step ?? test?.step ?? 0);
  const [brief, setBrief] = useState<Brief>(R?.brief ?? test?.brief ?? { ...empty, does: initialDoes || "" });
  const [stage, setStage] = useState(R?.stage ?? test?.stage ?? "Building it");
  const [workingName, setWorkingName] = useState(R?.workingName ?? test?.workingName ?? "");

  const [feelings, setFeelings] = useState<Feeling[]>(R?.feelings ?? test?.feelings ?? []);
  const [feelingsBusy, setFeelingsBusy] = useState(false);   // feelings load in the background, so step 2->3 is instant
  const [concepts, setConcepts] = useState<Concept[]>(R?.concepts ?? test?.concepts ?? []);
  // Concepts are generated behind the scenes, then the founder picks the territories
  // to explore on the Concepts step; `chosen` holds that pick (and seeds exploration).
  const [chosen, setChosen] = useState<Set<string>>(new Set(R?.chosen ?? test?.chosen ?? []));

  const [saved, setSaved] = useState<SavedIdea[]>(R?.saved ?? test?.saved ?? []);          // step 5 → 6
  const [shortlist, setShortlist] = useState<string[]>(R?.shortlist ?? test?.shortlist ?? []); // step 6 → 7
  const [comp, setComp] = useState<import("../lib/namingApi").Comparison | null>(R?.comp ?? test?.comp ?? null);
  const [taglines, setTaglines] = useState<Record<string, string>>(R?.taglines ?? test?.taglines ?? {}); // founder's tagline edits on the share screen
  const [chosenFinal, setChosenFinal] = useState<string>(R?.chosenFinal ?? test?.chosenFinal ?? "");

  const [brandBookOpen, setBrandBookOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Sign-up captured up front (step 1): name + email (email mandatory to proceed).
  // Captured up front by the StartGate (connect with Google or email) before the
  // flow opens; read here for the lead record and the Step 9 feedback.
  const [fromName] = useState(() => { try { return localStorage.getItem("ns.fromName") || ""; } catch { return ""; } });
  const [email] = useState(() => { try { return localStorage.getItem("ns.email") || ""; } catch { return ""; } });
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const signedUp = useRef(false);
  function registerSignup() {
    const e = email.trim();
    if (!emailOk || signedUp.current) return;
    signedUp.current = true;
    captureSignup(brief, fromName.trim(), e);
  }
  // A live, AI-reframed read of the brief, shown on the right of the brief steps so
  // the founder sees we understand them as they type (not just an echo).
  const [briefSynth, setBriefSynth] = useState<{ line: string; tags: string[] } | null>(null);

  // Email gate: the first time the founder commits to a name (locking it in, or
  // opening the brand book) we capture their email; afterwards we just run the
  // action. `afterGate` holds what to do once the email is in.
  const afterGate = useRef<() => void>(() => {});
  const [gateName, setGateName] = useState("");
  function openGate(name: string, next: () => void) {
    let hasEmail = false;
    try { hasEmail = !!localStorage.getItem("ns.email"); } catch { /* ignore */ }
    if (hasEmail) { next(); return; }
    setGateName(name); afterGate.current = next; setGateOpen(true);
  }
  function requestBrandBook() { openGate(chosenFinal, () => setBrandBookOpen(true)); }
  // Locking in from the comparison: remember the name and gate on the email before
  // moving to the decision screen.
  function lockIn(name: string) {
    if (name) setChosenFinal(name);
    openGate(name, () => goto(9));
  }
  const [loading, setLoading] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [maxReached, setMaxReached] = useState(R?.maxReached ?? test?.step ?? 0); // furthest step seen, so back/forward + rail can jump anywhere visited
  // Exploration board + prefetch cache, kept here so leaving and returning to the
  // exploration step restores it instead of regenerating.
  const exploreStore = useRef<ExploreStore>({ cache: new Map(), seen: new Set(), focus: null, groups: [], active: 0, hist: [], future: [] });

  const set = (patch: Partial<Brief>) => setBrief((b) => ({ ...b, ...patch }));
  const goto = (n: number) => { setStep(n); setMaxReached((m) => Math.max(m, n)); };
  const toggleArr = (arr: string[], v: string, max = 999) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : arr.length >= max ? arr : [...arr, v];

  async function generate(lines: string[], fn: () => Promise<void>, next: number) {
    setError(null); setLoading(lines);
    try { await fn(); goto(next); }
    catch (e: any) { setError(e?.message || String(e)); }
    finally { setLoading(null); }
  }

  // Feelings power the "signal" chips on step 3. We warm them in the background
  // while the founder fills the brand step, so the (full-screen) transition is
  // usually instant; if not ready yet, goEmotional waits behind the loader. One
  // shared in-flight request, falls back to SIGNAL_FALLBACK on failure.
  const feelingsPromise = useRef<Promise<void> | null>(null);
  function loadFeelings(): Promise<void> {
    if (feelings.length) return Promise.resolve();
    if (feelingsPromise.current) return feelingsPromise.current;
    if (!brief.does.trim()) return Promise.resolve();
    const p = (async () => {
      setFeelingsBusy(true);
      try { const f = await naming.feelings(brief); setFeelings(f); }
      catch { /* keep SIGNAL_FALLBACK */ }
      finally { setFeelingsBusy(false); feelingsPromise.current = null; }
    })();
    feelingsPromise.current = p;
    return p;
  }
  // Brand step -> signal step: instant if feelings are already warm, otherwise the
  // full-page loader shows until they land (Haiku, ~2-3s).
  async function goEmotional() {
    if (feelings.length) { goto(2); return; }
    setError(null); setLoading(["Reading the brief…", "Drawing the feelings your name could carry"]);
    try { await loadFeelings(); } catch { /* ignore */ }
    finally { setLoading(null); goto(2); }
  }

  // Arrived from the voice conversation with a ready brief → straight to concepts.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !seedBrief || test) return;
    seeded.current = true;
    setBrief(seedBrief);
    generate(["Reading your brief…", "Mapping the worlds your brand could live in"], async () => setConcepts(await naming.concepts(seedBrief)), 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedBrief]);

  // Warm the feelings while the founder is still filling the brand step, and
  // ensure they're loading the moment they land on the signal step.
  useEffect(() => {
    if (test) return;
    if (step === 2) { loadFeelings(); return; }
    // Warm feelings as soon as the founder has described what the company does,
    // so the brand -> signal transition is already done by the time they reach it.
    if ((step === 0 || step === 1) && brief.does.trim() && !feelings.length && !feelingsBusy) {
      const t = setTimeout(() => loadFeelings(), 600);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, brief.does, brief.problem, brief.audience, brief.uvp]);

  // Reframe the brief live (debounced) while the founder fills the brief steps, so
  // the "brief, so far" card shows we understand it. We pass the line we already
  // have so the model REFINES it (small edits to fold in new info) instead of
  // rewriting from scratch, and we wait a beat longer so it settles, not churns.
  const synthLine = useRef("");
  synthLine.current = briefSynth?.line || "";
  useEffect(() => {
    if (test || step > 2 || !brief.does.trim()) return;
    const t = setTimeout(() => {
      naming.synthesize(brief, synthLine.current).then((s) => { if (s?.line) setBriefSynth(s); }).catch(() => { /* keep last */ });
    }, 1100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, brief.does, brief.problem, brief.audience, brief.uvp, brief.industry, brief.signal, brief.tone]);

  // Pre-generate the concepts while the founder is still on the naming-strategy step
  // (lanes are pre-recommended on arrival), keyed by the brief, so "Generate concepts"
  // is instant. Re-runs if they change lanes.
  const conceptSig = () => [brief.does, (brief.signal || []).join(","), (brief.tone || []).join(","), (brief.lanes || []).join(","), (brief.geos || []).join(",")].join("|");
  const conceptsWarm = useRef<{ sig: string; inflight: string }>({ sig: "", inflight: "" });
  useEffect(() => {
    if (test || step !== 3 || brief.lanes.length < 1) return;
    const sig = conceptSig();
    if (conceptsWarm.current.sig === sig || conceptsWarm.current.inflight === sig) return;
    const t = setTimeout(() => {
      conceptsWarm.current.inflight = sig;
      naming.concepts(brief)
        .then((cs) => { conceptsWarm.current.sig = sig; setConcepts(cs); })
        .catch(() => { /* Generate will fetch on click */ })
        .finally(() => { if (conceptsWarm.current.inflight === sig) conceptsWarm.current.inflight = ""; });
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, brief.lanes, brief.does, brief.signal, brief.tone, brief.geos]);

  // Warm the FIRST exploration board while the founder is still on the naming-strategy
  // step, so exploration opens with words already on screen instead of a cold load.
  const exploreWarm = useRef<string | null>(null);
  useEffect(() => {
    if (test || step !== 3) return;
    const first = concepts.find((c) => chosen.has(c.title)) || concepts[0];
    if (!first || exploreWarm.current === first.title) return;
    const store = exploreStore.current;
    const key = first.title + "::";
    if (store.cache.has(key)) return;
    exploreWarm.current = first.title;
    naming.relate(brief, "", first.title, []).then((res) => {
      const entry = { word: res.word, def: res.def, groups: res.groups || [] };
      store.cache.set(key, entry);
      store.cache.set(first.title + "::" + (entry.word || "").toLowerCase(), entry);
      store.seen.add((entry.word || "").toLowerCase());
      for (const g of entry.groups) for (const w of g.words) store.seen.add((w.w || "").toLowerCase());
    }).catch(() => { exploreWarm.current = null; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, chosen, concepts]);

  // Pre-warm the comparison (scoring + domains) while the founder is still on the
  // shortlist step, keyed by the exact shortlist, so step 8 opens instantly. We
  // only keep `comp` if it matches the shortlist the founder actually carries over.
  const compWarm = useRef<{ sig: string; inflight: string }>({ sig: "", inflight: "" });
  const sigOf = (names: string[]) => [...names].sort().join("|");
  useEffect(() => {
    if (test || step !== 6 || shortlist.length < 1) return;
    const sig = sigOf(shortlist);
    if (compWarm.current.sig === sig || compWarm.current.inflight === sig) return;
    const t = setTimeout(() => {
      compWarm.current.inflight = sig;
      shortlist.forEach((n) => { void fetchDomains(n); });
      naming.compare(brief, shortlist.map((name) => ({ name, type: "", rationale: "", score: 0 })))
        .then((c) => { compWarm.current.sig = sig; setComp(c); })
        .catch(() => { /* Compare will fetch on mount */ })
        .finally(() => { if (compWarm.current.inflight === sig) compWarm.current.inflight = ""; });
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, shortlist]);

  // Persist the in-progress process so a refresh resumes exactly here.
  useEffect(() => {
    if (test) return;
    const t = setTimeout(() => saveFlow({
      process: processId(), step, maxReached, brief, stage, workingName,
      feelings, concepts, chosen: [...chosen], saved, shortlist, comp, taglines, chosenFinal,
    }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, maxReached, brief, stage, workingName, feelings, concepts, chosen, saved, shortlist, comp, taglines, chosenFinal]);

  const shell = (node: React.ReactNode, opts?: { wide?: boolean; barRight?: React.ReactNode; topRight?: React.ReactNode }) => (
    <Cx
      step={step}
      wide={opts?.wide}
      skin={skin}
      reached={test ? 9 : maxReached}
      barRight={opts?.barRight}
      topRight={test ? <span className="lbl" style={{ color: "var(--bad)" }}>● Test mode</span> : opts?.topRight}
      onBack={() => (step > 0 ? goto(step - 1) : onRestart())}
      onJump={(n) => goto(n)}
      onLeave={onRestart}
    >
      {error && <div className="note" style={{ borderColor: "var(--bad)", color: "var(--bad)" }}>{error}</div>}
      {loading ? <Thinking lines={loading} /> : node}
      {test && <TestBar step={step} onJump={goto} />}
      {gateOpen && (
        <EmailGate name={gateName} onClose={() => setGateOpen(false)}
          onSubmit={(email) => { captureLead(brief, email, gateName); setGateOpen(false); afterGate.current(); }} />
      )}
    </Cx>
  );

  // The evolving "brief, so far" card (right side of the brief steps): an AI reframe
  // once it lands, otherwise the founder's own words.
  const briefLine = briefSynth?.line || brief.does || "A naming studio for founders who care about taste.";
  const baseTags = briefSynth?.tags?.length
    ? briefSynth.tags
    : [brief.industry || "creator tools", stage.split("·")[0].trim() || "pre-launch"];
  // Fold the founder's live selections (signal, tone, markets) into the brief card
  // so they build it up as they choose, deduped, case-insensitively.
  const briefTags = (() => {
    const seen = new Set<string>();
    return [...baseTags, ...(brief.signal || []), ...(brief.tone || []), ...(brief.geos || [])]
      .map((t) => String(t).trim()).filter(Boolean)
      .filter((t) => { const k = t.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  })();

  // ── Steps 1–4 · the brief / intake (loading shows inside the same shell) ──
  if (step === 0) return shell(
    <>
      <Head eyebrow="The brief · 1 of 4" title={<>First, what does the <em>company</em> do?</>}
        sub="The sharper this is, the sharper your name." />
      <div className="intake-cols">
        <div className="fgrid" style={{ alignContent: "start" }}>
          <Field label="What it does" hint="· one plain sentence" area value={brief.does} onChange={(v) => set({ does: v })}
            placeholder="An AI naming studio that helps founders find a brand name with the rigor of a strategist, in minutes instead of months." />
          <div className="pairgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Industry" value={brief.industry} onChange={(v) => set({ industry: v })} placeholder="Start typing…" options={INDUSTRIES} />
            <SelectField label="Stage" value={stage} onChange={setStage} options={STAGES} />
          </div>
          <Field label="Working name" hint="· optional, we won't be bound by it" value={workingName} onChange={setWorkingName} placeholder="Untitled" />
        </div>
        <HelpCard label="The brief, so far" quote={`"${briefLine}"`} tags={briefTags} />
      </div>
      <Foot back="Welcome" onBack={onRestart} next="Next: brand context →" disabled={!brief.does.trim()}
        onNext={() => { registerSignup(); goto(1); }} />
    </>
  );

  if (step === 1) return shell(
    <>
      <Head eyebrow="The brief · 2 of 4" title={<>Now the <em>brand</em>: who it's for, why it matters.</>}
        sub="The problem you solve, who you solve it for, and what only you can claim." />
      <div className="intake-cols">
        <div className="fgrid" style={{ alignContent: "start" }}>
          <Field label="The problem you solve" area value={brief.problem} onChange={(v) => set({ problem: v })}
            placeholder="Founders spend weeks on naming and settle for something generic or compromised." />
          <Field label="Who it's for" hint="· and what they value" area value={brief.audience} onChange={(v) => set({ audience: v })}
            placeholder="Startup founders and brand strategists. Time-pressed, care about craft." />
          <Field label="What's your unique proposition" hint="· the one claim rivals can't credibly make" area value={brief.uvp} onChange={(v) => set({ uvp: v })}
            placeholder="e.g. Strategy-first naming with the rigor of a senior consultant, in minutes not months." />
        </div>
        <HelpCard label="The brief, so far" quote={`"${briefLine}"`} tags={briefTags} />
      </div>
      <Foot back="Company context" onBack={() => goto(0)} next="Next: emotional value →" disabled={!brief.problem.trim()}
        onNext={goEmotional} />
    </>
  );

  if (step === 2) {
    const signalOpts = feelings.length ? feelings.map((f) => f.word) : SIGNAL_FALLBACK;
    return shell(
      <>
        <Head eyebrow="The brief · 3 of 4" title={<>What should the name <em>signal</em>?</>}
          sub="Pick the feelings it should carry." />
        <div className="intake-cols">
          <div className="fgrid" style={{ alignContent: "start", gap: 24 }}>
            <PickField label="The name should signal" hint="· pick 3 to 5" options={signalOpts} selected={brief.signal}
              onToggle={(s) => set({ signal: toggleArr(brief.signal, s, 5) })} />
            <PickField label="Tonal register" hint="· pick 2 to 3" options={TONE_OPTIONS} selected={brief.tone}
              onToggle={(s) => set({ tone: toggleArr(brief.tone, s, 3) })} />
            <PickField label="Where it needs to work" hint="· optional, the name will read well in these markets" options={GEO_OPTIONS} selected={brief.geos || []}
              onToggle={(s) => set({ geos: toggleArr(brief.geos || [], s) })} />
          </div>
          <HelpCard label="The brief, so far" quote={`"${briefLine}"`} tags={briefTags} />
        </div>
        <Foot back="Brand context" onBack={() => goto(1)} next="Next: naming strategy →" disabled={brief.signal.length < 1}
          onNext={() => { if (!brief.lanes.length) set({ lanes: recommendLanes({ ...brief }) }); goto(3); }} />
      </>
    );
  }

  if (step === 3) return shell(
    <>
      <Head eyebrow="The brief · 4 of 4" title={<>Choose the <em>naming lanes</em> to explore.</>}
        sub="Nine ways to build a name. The right strategy narrows the search before it starts." />
      <div className="lanegrid">
        {LANES.map((l) => {
          const on = brief.lanes.includes(l.key);
          return (
            <div key={l.key} className={"lane" + (on ? " on" : "")} onClick={() => set({ lanes: toggleArr(brief.lanes, l.key, 5) })}>
              <div className="lt">{l.name}<Star on={on} /></div>
              <div className="lx">{l.ex}</div>
              <p className="ld">{l.d}</p>
            </div>
          );
        })}
      </div>
      <div className="helpcard" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px" }}>
        <span className="tag fill">{brief.lanes.length} lane{brief.lanes.length === 1 ? "" : "s"}</span>
        <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 16, color: "var(--ink-2)", flex: 1 }}>
          {brief.lanes.length ? brief.lanes.map((k) => LANES.find((l) => l.key === k)?.name).filter(Boolean).join(" · ") : "Pick a few lanes to focus the search."}
        </span>
      </div>
      <Foot back="Emotional value" onBack={() => goto(2)} next="See the concepts →" disabled={brief.lanes.length < 1}
        onNext={() => {
          if (concepts.length) goto(4); // already warmed (or seeded) → instant
          else generate(["Thinking like a strategist…", "Mapping the worlds your brand could live in"], async () => setConcepts(await naming.concepts(brief)), 4);
        }} />
    </>
  );

  // Concepts (territories) are generated from the brief; the founder picks which
  // ones to explore here, and that pick seeds exploration's "← from X" provenance.
  // No pick = explore them all.
  const chosenConcepts = chosen.size ? concepts.filter((c) => chosen.has(c.title)) : concepts;
  const toggleConcept = (title: string) =>
    setChosen((prev) => { const n = new Set(prev); n.has(title) ? n.delete(title) : n.add(title); return n; });

  // ── Step 5 · Concepts — pick the territories to explore ──
  if (step === 4) return shell(
    <>
      <Head eyebrow="The territories" title={<>The <em>worlds</em> your brand could live in.</>}
        sub="Each is a different angle on your story. Pick the ones that feel right, the word exploration starts from there." />
      <div className="cgrid">
        {concepts.map((c) => {
          const on = chosen.has(c.title);
          return (
            <div key={c.title} className={"concept" + (on ? " on" : "")} onClick={() => toggleConcept(c.title)}>
              <div className="ct">{c.title}<Star on={on} /></div>
              {c.lane && <span className="tag" style={{ alignSelf: "flex-start" }}>{c.lane}</span>}
              <p className="cd">{c.blurb}</p>
            </div>
          );
        })}
      </div>
      <Foot back="Naming strategy" onBack={() => goto(3)} next="Explore the words →"
        onNext={() => goto(5)} />
    </>,
    { barRight: <span className="lbl" style={{ flex: "0 0 auto" }}>{chosen.size || "all"} {chosen.size === 1 ? "world" : "worlds"}</span> }
  );

  // ── Heavier screens (own modules), each loads its own data on mount ──
  if (step === 5) return shell(
    <Explore brief={brief} concepts={chosenConcepts} saved={saved} setSaved={setSaved} onDone={() => goto(6)} initial={test?.exploreSeed} store={exploreStore.current} />,
    { wide: true, topRight: <span className="lbl">Exploration</span>, barRight: <span className="lbl" style={{ flex: "0 0 auto" }}>★ {saved.length} saved</span> }
  );

  if (step === 6) return shell(
    <Shortlist brief={brief} saved={saved} shortlist={shortlist} setShortlist={setShortlist}
      onDone={() => { if (!test && compWarm.current.sig !== sigOf(shortlist)) setComp(null); goto(7); }} initialRows={test?.shortlistRows} />,
    { barRight: <span className="lbl" style={{ flex: "0 0 auto" }}>{shortlist.length} / 10 shortlisted</span> }
  );

  if (step === 7) return shell(
    <Compare brief={brief} shortlist={shortlist} comp={comp} setComp={setComp}
      onBack={() => goto(6)} onDone={() => goto(8)}
      onLockIn={() => lockIn(comp?.recommended || comp?.rows?.[0]?.name || chosenFinal)} />
  );

  if (step === 8) return shell(
    <Share brief={brief} comp={comp} taglines={taglines} setTaglines={setTaglines}
      onBack={() => goto(7)} onSkip={() => goto(9)} onDone={() => goto(9)}
      onCapture={(email) => captureLead(brief, email, chosenFinal || comp?.recommended || "")} />
  );

  if (step === 9) return (
    <>
      {shell(
        <Decide comp={comp} chosen={chosenFinal} setChosen={setChosenFinal}
          onBack={() => goto(8)} onBrandBook={requestBrandBook} onFeedback={() => setFeedbackOpen(true)} />
      )}
      {brandBookOpen && chosenFinal && <BrandBook brief={brief} name={chosenFinal} onClose={() => setBrandBookOpen(false)} />}
      {feedbackOpen && <Feedback fromName={fromName} email={email} onClose={() => setFeedbackOpen(false)} />}
    </>
  );

  return shell(<div />);
}

/* ───────────────────────── intake atoms ───────────────────────── */

function Field({ label, hint, value, onChange, placeholder, area, options }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void; placeholder?: string; area?: boolean; options?: string[];
}) {
  const listId = options ? "dl-" + label.replace(/[^a-z]/gi, "") : undefined;
  return (
    <div className="fld">
      <label><span className="flabel">{label}</span>{hint && <span className="fhint">{hint}</span>}</label>
      {area
        ? <textarea className="txa" rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        : <input className="inp" list={listId} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />}
      {options && <datalist id={listId}>{options.map((o) => <option key={o} value={o} />)}</datalist>}
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div className="fld">
      <label><span className="flabel">{label}</span></label>
      <select className="inp sel" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function HelpCard({ label, body, bullets, quote, tags }: {
  label: string; body?: string; bullets?: string[]; quote?: string; tags?: string[];
}) {
  return (
    <div className="fld">
      <div className="helpcard" style={{ height: "100%" }}>
        <span className="lbl">{label}</span>
        {quote
          ? <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 19, lineHeight: 1.4, color: "var(--ink-2)", margin: "12px 0 16px" }}>{quote}</p>
          : <p style={{ fontFamily: "var(--serif)", fontSize: 17, lineHeight: 1.5, color: "var(--ink-2)", margin: "12px 0 16px" }}>{body}</p>}
        <div style={{ height: 1, background: "var(--line-2)", margin: "4px 0 14px" }} />
        {bullets && <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "var(--ink-3)" }}>{bullets.map((b) => <span key={b}>· {b}</span>)}</div>}
        {tags && <div className="pickrow">{tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>}
      </div>
    </div>
  );
}

function PickField({ label, hint, options, selected, onToggle }: {
  label: string; hint?: string; options: string[]; selected: string[]; onToggle: (s: string) => void;
}) {
  return (
    <div className="fld">
      <label><span className="flabel">{label}</span>{hint && <span className="fhint">{hint}</span>}</label>
      <div className="pickrow">
        {options.map((s) => <span key={s} className={"pick" + (selected.includes(s) ? " on" : "")} onClick={() => onToggle(s)}>{s}</span>)}
      </div>
    </div>
  );
}

// A floating navigator shown only in test mode (?test): jump to any of the 10
// steps to review the page, no real run needed.
function TestBar({ step, onJump }: { step: number; onJump: (n: number) => void }) {
  return (
    <div style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 70, display: "flex", alignItems: "center", gap: 5, padding: "8px 11px", borderRadius: 999, background: "var(--ink)", boxShadow: "0 14px 34px -12px rgba(0,0,0,0.45)" }}>
      <span style={{ fontFamily: "var(--sans)", fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", padding: "0 6px 0 2px" }}>Test</span>
      {CXSTEPS.map((s, i) => (
        <button key={i} title={`${i + 1}. ${s}`} onClick={() => onJump(i)}
          style={{ width: 26, height: 26, borderRadius: "50%", border: "none", cursor: "pointer", fontSize: 11.5, fontVariantNumeric: "tabular-nums",
            background: i === step ? "var(--surface)" : "rgba(255,255,255,0.12)", color: i === step ? "var(--ink)" : "rgba(255,255,255,0.7)", transition: "background .12s ease" }}>
          {i + 1}
        </button>
      ))}
    </div>
  );
}
