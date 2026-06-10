// Phase 2 — Read the room (NEW). Charts the category's soundscape on a 2-axis
// map, hands the founder a strategist's read, and forces a deliberate stance:
// blend in to borrow trust, or break to stand out.

import { useEffect, useMemo, useState } from "react";
import type { NameBrief, SoundscapeAnalysis, Stance } from "../types";
import { studio } from "../studioApi";
import { FooterNav, PhaseHeader, PrimaryButton, StudioNote, Thinking } from "../ui";

export function ReadTheRoom({
  brief,
  initialStance,
  onBack,
  onDone,
}: {
  brief: NameBrief;
  initialStance?: Stance;
  onBack: () => void;
  onDone: (soundscape: SoundscapeAnalysis, stance: Stance) => void;
}) {
  const [competitors, setCompetitors] = useState<string[]>(brief.competitors);
  const [draft, setDraft] = useState("");
  const [analysis, setAnalysis] = useState<SoundscapeAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [stance, setStance] = useState<Stance | null>(initialStance || null);

  const analysisBrief = useMemo<NameBrief>(() => ({ ...brief, competitors }), [brief, competitors]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    studio.soundscape(analysisBrief).then((a) => {
      if (!live) return;
      setAnalysis(a);
      setStance((s) => s || a.recommendedStance);
      setLoading(false);
    });
    return () => { live = false; };
  }, [analysisBrief]);

  function addCompetitor() {
    const v = draft.trim();
    if (v && competitors.length < 6 && !competitors.includes(v)) setCompetitors([...competitors, v]);
    setDraft("");
  }

  if (loading || !analysis) {
    return (
      <div className="animate-in mx-auto max-w-2xl">
        <PhaseHeader phase={2} title="Reading" accent="the room." />
        <Thinking lines={["Listening to the category…", "Charting how your rivals sound"]} />
      </div>
    );
  }

  return (
    <div className="animate-in mx-auto max-w-2xl">
      <PhaseHeader phase={2} title="Reading" accent="the room." />
      <StudioNote>{analysis.read}</StudioNote>

      {/* competitor set, editable */}
      <div className="mt-6">
        <p className="mb-2 text-sm font-medium text-ink/60">The names we're listening to</p>
        <div className="flex flex-wrap items-center gap-2">
          {competitors.map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-[var(--surface-solid)] px-3 py-1 text-sm">
              {c}
              <button onClick={() => setCompetitors(competitors.filter((x) => x !== c))} className="text-ink/35 transition hover:text-rose-600">×</button>
            </span>
          ))}
          {competitors.length < 6 && (
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCompetitor()}
              onBlur={addCompetitor}
              placeholder="add a rival…"
              className="w-32 rounded-full border border-dashed border-ink/25 bg-transparent px-3 py-1 text-sm outline-none placeholder:text-ink/30 focus:border-accent/50"
            />
          )}
        </div>
      </div>

      {/* the map */}
      <SoundMap analysis={analysis} stance={stance} />

      {/* patterns */}
      <ul className="mt-5 grid gap-1.5 sm:grid-cols-2">
        {analysis.patterns.map((p, i) => (
          <li key={i} className="flex gap-2 text-sm text-ink/60">
            <span className="text-accent">·</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>

      {/* stance */}
      <div className="mt-7">
        <p className="mb-2 text-sm font-medium text-ink/60">Your move</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <StanceCard
            active={stance === "blend"}
            recommended={analysis.recommendedStance === "blend"}
            title="Blend in"
            body="Borrow the category's sound so you feel native and trusted, then add one twist that's yours."
            onClick={() => setStance("blend")}
          />
          <StanceCard
            active={stance === "break"}
            recommended={analysis.recommendedStance === "break"}
            title="Break out"
            body="Deliberately sound different. Higher risk, but you become the name people actually remember."
            onClick={() => setStance("break")}
          />
        </div>
      </div>

      <FooterNav onBack={onBack}>
        <PrimaryButton onClick={() => stance && onDone(analysis, stance)} disabled={!stance}>
          Set the directions →
        </PrimaryButton>
      </FooterNav>
    </div>
  );
}

function StanceCard({ active, recommended, title, body, onClick }: {
  active: boolean; recommended: boolean; title: string; body: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`rounded-2xl border p-4 text-left transition ${active ? "border-accent bg-accent/5 shadow-sm" : "border-ink/15 bg-[var(--surface-solid)] hover:border-ink/30"}`}>
      <div className="flex items-center justify-between">
        <span className="font-serif text-xl italic">{title}</span>
        {recommended && <span className="rounded-full bg-accent/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-accent">our read</span>}
      </div>
      <p className="mt-1.5 text-sm text-ink/55">{body}</p>
    </button>
  );
}

// The signature 2-axis map. x: descriptive -> abstract, y: soft -> sharp.
function SoundMap({ analysis, stance }: { analysis: SoundscapeAnalysis; stance: Stance | null }) {
  const W = 520, H = 360, P = 34;
  const sx = (x: number) => P + (x / 100) * (W - 2 * P);
  const sy = (y: number) => H - P - (y / 100) * (H - 2 * P); // soft at bottom, sharp at top
  const t = analysis.target;

  return (
    <div className="mt-6 overflow-hidden rounded-[24px] border border-ink/12 bg-[var(--surface-solid)] p-2 shadow-sm">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* quadrant grid */}
        <line x1={W / 2} y1={P} x2={W / 2} y2={H - P} stroke="currentColor" className="text-ink/10" />
        <line x1={P} y1={H / 2} x2={W - P} y2={H / 2} stroke="currentColor" className="text-ink/10" />

        {/* founder target zone */}
        <circle cx={sx(t.x)} cy={sy(t.y)} r={58} fill="var(--c-accent)" opacity={0.08} />
        <circle cx={sx(t.x)} cy={sy(t.y)} r={58} fill="none" stroke="var(--c-accent)" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.55} />
        <text x={sx(t.x)} y={sy(t.y) - 66} textAnchor="middle" className="fill-accent font-mono text-[10px] uppercase tracking-wide">
          {stance === "break" ? "your open lane" : "your zone"}
        </text>

        {/* competitors */}
        {analysis.competitorPoints.map((c) => (
          <g key={c.name}>
            <circle cx={sx(c.x)} cy={sy(c.y)} r={5} className="fill-ink/55" />
            <text x={sx(c.x) + 9} y={sy(c.y) + 4} className="fill-ink/65 text-[12px]">{c.name}</text>
          </g>
        ))}

        {/* axis labels */}
        <text x={P} y={H - 8} className="fill-ink/40 font-mono text-[10px] uppercase tracking-wide">descriptive</text>
        <text x={W - P} y={H - 8} textAnchor="end" className="fill-ink/40 font-mono text-[10px] uppercase tracking-wide">abstract</text>
        <text x={8} y={H - P} className="fill-ink/40 font-mono text-[10px] uppercase tracking-wide">soft</text>
        <text x={8} y={P + 4} className="fill-ink/40 font-mono text-[10px] uppercase tracking-wide">sharp</text>
      </svg>
    </div>
  );
}
