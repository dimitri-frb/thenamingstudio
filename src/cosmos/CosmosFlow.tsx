// The Cosmos flow — the full 10-step naming process, redrawn from the Full-Flow
// design and wired to the live `naming` API (real Claude via the Worker in prod,
// the dev bridge in dev, the client-side studio as a fallback). The intake and
// concept steps live here; the heavier screens are their own modules.
import { useEffect, useRef, useState } from "react";
import { naming, type Brief, type Concept, type Feeling } from "../lib/namingApi";
import { recommendLanes } from "../lib/localStudio";
import { BrandBook } from "../components/BrandBook";
import { PublicVote } from "../components/PublicVote";
import { Cx, Head, Foot, Star, Thinking } from "./chrome";
import { LANES, TONE_OPTIONS, SIGNAL_FALLBACK, AVOID_FALLBACK } from "./data";
import { Explore } from "./Explore";
import { Shortlist, type SavedIdea } from "./Shortlist";
import { Compare } from "./Compare";
import { Share } from "./Share";
import { Decide } from "./Decide";

const empty: Brief = { does: "", industry: "", problem: "", audience: "", values: "", uvp: "", signal: [], avoid: [], tone: [], lanes: [] };

export function CosmosFlow({ initialDoes, seedBrief, onRestart }: { initialDoes: string; seedBrief?: Brief | null; onRestart: () => void }) {
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState<Brief>({ ...empty, does: initialDoes || "" });
  const [stage, setStage] = useState("Pre-launch · building MVP");
  const [workingName, setWorkingName] = useState("");

  const [feelings, setFeelings] = useState<Feeling[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [chosen, setChosen] = useState<Set<string>>(new Set());

  const [saved, setSaved] = useState<SavedIdea[]>([]);          // step 5 → 6
  const [shortlist, setShortlist] = useState<string[]>([]);     // step 6 → 7
  const [comp, setComp] = useState<import("../lib/namingApi").Comparison | null>(null);
  const [taglines, setTaglines] = useState<Record<string, string>>({});
  const [chosenFinal, setChosenFinal] = useState<string>("");

  const [voteOpen, setVoteOpen] = useState(false);
  const [brandBookOpen, setBrandBookOpen] = useState(false);
  const [loading, setLoading] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<Brief>) => setBrief((b) => ({ ...b, ...patch }));
  const goto = (n: number) => setStep(n);
  const toggleArr = (arr: string[], v: string, max = 999) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : arr.length >= max ? arr : [...arr, v];

  async function generate(lines: string[], fn: () => Promise<void>, next: number) {
    setError(null); setLoading(lines);
    try { await fn(); goto(next); }
    catch (e: any) { setError(e?.message || String(e)); }
    finally { setLoading(null); }
  }

  // Arrived from the voice conversation with a ready brief → straight to concepts.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !seedBrief) return;
    seeded.current = true;
    setBrief(seedBrief);
    generate(["Reading your brief…", "Mapping the worlds your brand could live in"], async () => setConcepts(await naming.concepts(seedBrief)), 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedBrief]);

  const shell = (node: React.ReactNode, opts?: { wide?: boolean; barRight?: React.ReactNode; topRight?: React.ReactNode }) => (
    <Cx
      step={step}
      wide={opts?.wide}
      barRight={opts?.barRight}
      topRight={opts?.topRight}
      onBack={() => (step > 0 ? goto(step - 1) : onRestart())}
      onJump={(n) => goto(n)}
      onLeave={onRestart}
    >
      {error && <div className="note" style={{ borderColor: "var(--bad)", color: "var(--bad)" }}>{error}</div>}
      {loading ? <Thinking lines={loading} /> : node}
    </Cx>
  );

  // ── Steps 1–4 · intake + concepts (loading shows inside the same shell) ──
  if (step === 0) return shell(
    <>
      <Head eyebrow="The brief · 1 of 4" title={<>First, what does the <em>company</em> do?</>}
        sub="The sharper this is, the sharper your name. Everything downstream answers to this brief." />
      <div className="intake-cols">
        <div className="fgrid" style={{ alignContent: "start" }}>
          <Field label="What it does" hint="— one plain sentence" area value={brief.does} onChange={(v) => set({ does: v })}
            placeholder="An AI naming studio that helps founders find a brand name with the rigor of a strategist, in minutes instead of months." />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Industry" value={brief.industry} onChange={(v) => set({ industry: v })} placeholder="Creator tools · B2B SaaS" />
            <Field label="Stage" value={stage} onChange={setStage} placeholder="Pre-launch · building MVP" />
          </div>
          <Field label="Working name" hint="— if you have one; we won't be bound by it" value={workingName} onChange={setWorkingName} placeholder="Untitled" />
        </div>
        <HelpCard label="Why this matters"
          body="A name that doesn't know what it stands for has nothing to defend. These answers become the brief every later step is judged against."
          bullets={["Sets the surface area", "Filters the wrong tonal lanes", "Lets us test names against a real job"]} />
      </div>
      <Foot back="Welcome" onBack={onRestart} next="Next: brand context →" disabled={!brief.does.trim()} onNext={() => goto(1)} />
    </>
  );

  if (step === 1) return shell(
    <>
      <Head eyebrow="The brief · 2 of 4" title={<>Now the <em>brand</em> — who it's for, why it matters.</>}
        sub="What problem you solve, for whom, and what only you can credibly claim." />
      <div className="intake-cols">
        <div className="fgrid" style={{ alignContent: "start" }}>
          <Field label="The problem you solve" area value={brief.problem} onChange={(v) => set({ problem: v })}
            placeholder="Founders spend weeks on naming and settle for something generic or compromised." />
          <Field label="Who it's for" hint="— and what they value" area value={brief.audience} onChange={(v) => set({ audience: v })}
            placeholder="Startup founders and brand strategists. Time-pressed, taste-conscious." />
          <Field label="What only you can say" hint="— the defensible point of view" area value={brief.uvp} onChange={(v) => set({ uvp: v })}
            placeholder="Strategy-first naming with the rigor of a senior consultant." />
        </div>
        <HelpCard label="The brief, so far" quote={`"${brief.does || "A naming studio for founders who care about taste."}"`}
          tags={[brief.industry || "creator tools", stage.split("·")[0].trim() || "pre-launch", "taste-conscious", "strategist-grade"]} />
      </div>
      <Foot back="Company context" onBack={() => goto(0)} next="Next: emotional value →" disabled={!brief.problem.trim()}
        onNext={() => generate(["Reading the brief…", "Drawing the feelings your name could carry"], async () => setFeelings(await naming.feelings(brief)), 2)} />
    </>
  );

  if (step === 2) {
    const signalOpts = feelings.length ? feelings.map((f) => f.word) : SIGNAL_FALLBACK;
    return shell(
      <>
        <Head eyebrow="The brief · 3 of 4" title={<>What should the name <em>signal</em>?</>}
          sub="Pick the feelings it should carry. Then mark what you want to actively avoid." />
        <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1, minHeight: 0 }}>
          <PickField label="The name should signal" hint="— pick 3–5" options={signalOpts} selected={brief.signal}
            onToggle={(s) => set({ signal: toggleArr(brief.signal, s, 5) })} />
          <PickField label="Tonal register" hint="— pick 2–3" options={TONE_OPTIONS} selected={brief.tone}
            onToggle={(s) => set({ tone: toggleArr(brief.tone, s, 3) })} />
          <AvoidField selected={brief.avoid.length ? brief.avoid : AVOID_FALLBACK}
            onToggle={(s) => set({ avoid: toggleArr(brief.avoid.length ? brief.avoid : AVOID_FALLBACK, s) })} />
          <div className="helpcard" style={{ marginTop: "auto", display: "flex", gap: 14, alignItems: "flex-start" }}>
            <span className="lbl" style={{ flex: "0 0 auto", marginTop: 2 }}>Read</span>
            <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 17, margin: 0, color: "var(--ink-2)", lineHeight: 1.5 }}>
              You're leaning {brief.signal.length ? <b style={{ fontStyle: "normal", fontWeight: 500 }}>{brief.signal.slice(0, 3).join(", ").toLowerCase()}</b> : "into a clear register"}. That points coined and evocative names in; generic-tech names will feel wrong against it.
            </p>
          </div>
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
      <Foot back="Emotional value" onBack={() => goto(2)} next="Generate concepts →" disabled={brief.lanes.length < 1}
        onNext={() => generate(["Thinking like a strategist…", "Building the worlds your brand could live in"], async () => setConcepts(await naming.concepts(brief)), 4)} />
    </>
  );

  if (step === 4) return shell(
    <>
      <Head eyebrow="The concepts" title={<>The <em>worlds</em> your brand could live in.</>}
        sub="A name with no world behind it is just a word. Pick the two or three that make your gut say yes — we'll explore each next." />
      <div className="cgrid">
        {concepts.map((c) => {
          const on = chosen.has(c.title);
          return (
            <div key={c.title} className={"concept" + (on ? " on" : "")}
              onClick={() => setChosen((s) => { const n = new Set(s); n.has(c.title) ? n.delete(c.title) : n.size < 4 && n.add(c.title); return n; })}>
              <div className="ct">{c.title}<Star on={on} /></div>
              <p className="cd">{c.blurb}</p>
              <span className="lbl" style={{ marginTop: 4 }}>{c.lane}</span>
            </div>
          );
        })}
      </div>
      <Foot back="Naming strategy" onBack={() => goto(3)} next="Explore the worlds →" disabled={chosen.size < 1} onNext={() => goto(5)} />
    </>
  );

  // ── Heavier screens (own modules), each loads its own data on mount ──
  const chosenConcepts = concepts.filter((c) => chosen.has(c.title));

  if (step === 5) return shell(
    <Explore brief={brief} concepts={chosenConcepts} saved={saved} setSaved={setSaved} onDone={() => goto(6)} />,
    { wide: true, topRight: <span className="lbl">Exploration · Option D</span>, barRight: <span className="lbl" style={{ flex: "0 0 auto" }}>★ {saved.length} saved</span> }
  );

  if (step === 6) return shell(
    <Shortlist brief={brief} saved={saved} shortlist={shortlist} setShortlist={setShortlist} onDone={() => goto(7)} />,
    { barRight: <span className="lbl" style={{ flex: "0 0 auto" }}>{shortlist.length} / 10 shortlisted</span> }
  );

  if (step === 7) return shell(
    <Compare brief={brief} shortlist={shortlist} comp={comp} setComp={setComp}
      onBack={() => goto(6)} onDone={() => goto(8)} />
  );

  if (step === 8) return shell(
    <Share brief={brief} comp={comp} taglines={taglines} setTaglines={setTaglines}
      onBack={() => goto(7)} onSkip={() => goto(9)} onDone={() => goto(9)} onVote={() => setVoteOpen(true)} />
  );

  if (step === 9) return (
    <>
      {shell(
        <Decide comp={comp} chosen={chosenFinal} setChosen={setChosenFinal}
          onBack={() => goto(8)} onBrandBook={() => setBrandBookOpen(true)} />
      )}
      {voteOpen && comp && <PublicVote items={comp.rows.map((r) => ({ name: r.name, note: taglines[r.name] || r.verdict }))} onClose={() => setVoteOpen(false)} />}
      {brandBookOpen && chosenFinal && <BrandBook brief={brief} name={chosenFinal} onClose={() => setBrandBookOpen(false)} />}
    </>
  );

  return shell(<div />);
}

/* ───────────────────────── intake atoms ───────────────────────── */

function Field({ label, hint, value, onChange, placeholder, area }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void; placeholder?: string; area?: boolean;
}) {
  return (
    <div className="fld">
      <label><span className="flabel">{label}</span>{hint && <span className="fhint">{hint}</span>}</label>
      {area
        ? <textarea className="txa" rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        : <input className="inp" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />}
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

function AvoidField({ selected, onToggle }: { selected: string[]; onToggle: (s: string) => void }) {
  return (
    <div className="fld">
      <label><span className="flabel">Avoid at all costs</span></label>
      <div className="pickrow">
        {selected.map((s) => <span key={s} className="pick avoid on" onClick={() => onToggle(s)}>{s}<span style={{ color: "var(--ink-4)" }}>×</span></span>)}
      </div>
    </div>
  );
}
