// Phase 4 — Generate. Divergent exploration. We reuse v1's night-sky
// constellation (a genuinely stable, presentational component) and only feed it
// richer word craft underneath: roots, blends and sound symbolism per territory.

import { useEffect, useMemo, useState } from "react";
import type { NameBrief, Territory } from "../types";
import type { TerritoryWorld } from "../../lib/namingApi";
import { studio } from "../studioApi";
import { ConceptDeepDive } from "../../components/ConceptDeepDive";
import { PhaseHeader, Thinking } from "../ui";

export function Generate({
  brief,
  territories,
  initialKept,
  onBack,
  onDone,
}: {
  brief: NameBrief;
  territories: Territory[];
  initialKept?: string[];
  onBack: () => void;
  onDone: (keptWords: string[]) => void;
}) {
  const selected = useMemo(() => territories.filter((t) => t.selected), [territories]);
  const [worlds, setWorlds] = useState<TerritoryWorld[] | null>(null);
  const [kept, setKept] = useState<Set<string>>(new Set(initialKept || []));

  useEffect(() => {
    let live = true;
    Promise.all(
      selected.map(async (t) => ({
        title: t.name,
        blurb: t.description,
        words: await studio.words(brief, t),
      })),
    ).then((ws) => { if (live) setWorlds(ws); });
    return () => { live = false; };
  }, [brief, selected]);

  function toggle(word: string) {
    setKept((s) => {
      const next = new Set(s);
      if (next.has(word)) next.delete(word);
      else next.add(word);
      return next;
    });
  }

  if (!worlds) {
    return (
      <div className="animate-in mx-auto max-w-3xl">
        <PhaseHeader phase={4} title="Building" accent="the worlds." />
        <Thinking lines={["Spinning up your constellations…", "Roots, blends and sound symbolism"]} />
      </div>
    );
  }

  return (
    <div className="animate-in mx-auto max-w-3xl">
      <ConceptDeepDive
        worlds={worlds}
        kept={kept}
        onToggle={toggle}
        onBack={onBack}
        onGenerate={() => onDone([...kept])}
      />
    </div>
  );
}
