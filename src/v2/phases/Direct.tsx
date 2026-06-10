// Phase 3 — Direct. Converge before diverging: pick 2 to 3 naming territories.
// Every territory carries an explicit tradeoff (what it buys, what it costs) so
// the choice is strategic, not aesthetic.

import { useEffect, useState } from "react";
import type { NameBrief, Stance, Territory } from "../types";
import { studio } from "../studioApi";
import { FooterNav, PhaseHeader, PrimaryButton, StudioNote, Thinking } from "../ui";

export function Direct({
  brief,
  stance,
  initial,
  onBack,
  onDone,
}: {
  brief: NameBrief;
  stance: Stance;
  initial?: Territory[];
  onBack: () => void;
  onDone: (territories: Territory[]) => void;
}) {
  const [territories, setTerritories] = useState<Territory[]>(initial || []);
  const [loading, setLoading] = useState(!initial?.length);

  useEffect(() => {
    if (initial?.length) return;
    let live = true;
    studio.territories(brief, stance).then((t) => {
      if (live) { setTerritories(t); setLoading(false); }
    });
    return () => { live = false; };
  }, [brief, stance, initial]);

  const selectedCount = territories.filter((t) => t.selected).length;

  function toggle(id: string) {
    setTerritories((ts) =>
      ts.map((t) => {
        if (t.id !== id) return t;
        if (!t.selected && selectedCount >= 3) return t; // cap at 3
        return { ...t, selected: !t.selected };
      }),
    );
  }

  if (loading) {
    return (
      <div className="animate-in mx-auto max-w-3xl">
        <PhaseHeader phase={3} title="Choosing" accent="directions." />
        <Thinking lines={["Drawing up your territories…", `Tuned to a ${stance === "break" ? "break-out" : "blend-in"} stance`]} />
      </div>
    );
  }

  return (
    <div className="animate-in mx-auto max-w-3xl">
      <PhaseHeader phase={3} title="Choosing" accent="directions." />
      <StudioNote>
        Great names come from a direction, not a dice roll. Here are the territories that fit your brief and your {stance === "break" ? "break-out" : "blend-in"} stance. Pick the 2 or 3 you want to explore, each buys you something and costs you something.
      </StudioNote>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {territories.map((t) => (
          <button
            key={t.id}
            onClick={() => toggle(t.id)}
            className={`rounded-2xl border p-5 text-left transition ${t.selected ? "border-accent bg-accent/5 shadow-sm" : "border-ink/15 bg-[var(--surface-solid)] hover:border-ink/30"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-serif text-xl italic">{t.name}</span>
              <span className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] ${t.selected ? "border-accent bg-accent text-white" : "border-ink/25 text-transparent"}`}>✓</span>
            </div>
            <p className="mt-1.5 text-sm text-ink/60">{t.description}</p>
            <p className="mt-2 font-mono text-[11px] text-ink/40">{t.examplePattern}</p>
            <div className="mt-3 space-y-1.5 border-t border-ink/10 pt-3 text-sm">
              <p className="flex gap-2"><span className="font-mono text-[10px] uppercase tracking-wide text-emerald-700">buys</span><span className="text-ink/60">{t.buys}</span></p>
              <p className="flex gap-2"><span className="font-mono text-[10px] uppercase tracking-wide text-rose-700">costs</span><span className="text-ink/60">{t.costs}</span></p>
            </div>
          </button>
        ))}
      </div>

      <FooterNav
        onBack={onBack}
        middle={<span className="font-mono text-xs text-accent">{selectedCount} / 3 chosen</span>}
      >
        <PrimaryButton onClick={() => onDone(territories)} disabled={selectedCount < 1}>
          Into the worlds →
        </PrimaryButton>
      </FooterNav>
    </div>
  );
}
