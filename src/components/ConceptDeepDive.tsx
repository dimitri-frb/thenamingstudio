import { useState } from "react";
import type { TerritoryWorld } from "../lib/namingApi";
import { StudioNote, Kicker } from "./Guide";

// Explore the chosen directions, one at a time. An overview shows every world;
// tap one and answer a few quick questions (a feeling, a line, some brands).
// Those answers, not a word list, are what the names are drawn from.

export type Selection = { feeling?: string; quote?: string; brands: string[] };

const TINTS = [
  "from-accent/20 to-accent2/10",
  "from-accent2/20 to-accent3/10",
  "from-accent3/20 to-accent/10",
];

export function ConceptDeepDive({ worlds, selections, onSelect, onBack, onGenerate }: {
  worlds: TerritoryWorld[];
  selections: Record<string, Selection>;
  onSelect: (concept: string, patch: Partial<Selection>) => void;
  onBack: () => void;
  onGenerate: () => void;
}) {
  const [active, setActive] = useState<number | null>(null);

  const selFor = (t: string): Selection => selections[t] || { brands: [] };
  const isExplored = (t: string) => { const s = selFor(t); return !!(s.feeling || s.quote || s.brands.length); };
  const exploredCount = worlds.filter((w) => isExplored(w.title)).length;

  if (active !== null && worlds[active]) {
    return (
      <ConceptQuiz
        key={worlds[active].title}
        world={worlds[active]}
        index={active}
        total={worlds.length}
        sel={selFor(worlds[active].title)}
        onSelect={(patch) => onSelect(worlds[active].title, patch)}
        onClose={() => setActive(null)}
        onNext={() => {
          const next = worlds.findIndex((w, i) => i > active && !isExplored(w.title));
          setActive(next >= 0 ? next : null);
        }}
      />
    );
  }

  return (
    <div className="animate-in">
      <Kicker>The exploration</Kicker>
      <h2 className="mt-2 text-3xl leading-snug sm:text-4xl">Let's <span className="italic text-accent">explore</span> each world.</h2>
      <StudioNote>This is the fun part. Step into a world and answer a few quick questions, a feeling, a line, a few brands you admire. The more you tell us, the sharper the names.</StudioNote>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {worlds.map((w, i) => {
          const done = isExplored(w.title);
          return (
            <button key={w.title} onClick={() => setActive(i)}
              className="group overflow-hidden rounded-2xl border border-ink/12 bg-[var(--surface-solid)] text-left transition hover:border-ink/30 hover:shadow-sm">
              <div className={`relative flex h-24 items-end bg-gradient-to-br p-4 ${TINTS[i % TINTS.length]}`}>
                <span className="absolute right-3 top-3 text-2xl text-ink/15">✳</span>
                <span className="font-mono text-xs text-ink/45">{String(i + 1).padStart(2, "0")}</span>
                {done && <span className="absolute right-3 bottom-3 grid h-6 w-6 place-items-center rounded-full bg-accent text-xs text-white">✓</span>}
              </div>
              <div className="p-4">
                <p className="font-serif text-xl leading-tight">{w.title}</p>
                <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-ink/55">{w.blurb}</p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-accent">{done ? "Explored · edit →" : "Explore →"}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-9 flex items-center justify-between border-t border-ink/10 pt-6">
        <button onClick={onBack} className="text-sm text-ink/50 transition hover:text-ink">← Back</button>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-widest text-ink/45">{exploredCount}/{worlds.length} explored</span>
          <button onClick={onGenerate} disabled={exploredCount < 1}
            className="rounded-xl bg-accent px-6 py-3 font-serif text-lg italic text-white shadow-lg shadow-accent/20 transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-30">
            Draw up the names →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- the per-world quiz ---------------- */
function ConceptQuiz({ world, index, total, sel, onSelect, onClose, onNext }: {
  world: TerritoryWorld;
  index: number; total: number;
  sel: Selection;
  onSelect: (patch: Partial<Selection>) => void;
  onClose: () => void;
  onNext: () => void;
}) {
  const [q, setQ] = useState(0);
  const steps = 3;

  const toggleBrand = (name: string) => {
    const has = sel.brands.includes(name);
    onSelect({ brands: has ? sel.brands.filter((b) => b !== name) : [...sel.brands, name] });
  };

  return (
    <div className="animate-in">
      {/* header */}
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="flex items-center gap-2 text-sm text-ink/50 transition hover:text-ink">← All worlds</button>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink/40">World {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
          <span className="flex gap-1">
            {Array.from({ length: steps }).map((_, i) => <span key={i} className={`h-1.5 w-1.5 rounded-full ${i <= q ? "bg-accent" : "bg-ink/15"}`} />)}
          </span>
        </div>
      </div>

      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-accent">{world.title}</p>

      {/* question */}
      <div key={q} className="animate-in mt-2">
        {q === 0 && (
          <Question title="What feeling makes you think of the brand most?">
            <div className="flex flex-wrap gap-2.5">
              {world.feelings.map((f) => (
                <button key={f} onClick={() => { onSelect({ feeling: f }); setQ(1); }}
                  className={`rounded-full border px-4 py-2 font-serif text-lg italic transition ${sel.feeling === f ? "border-accent bg-accent text-white" : "border-ink/20 hover:border-ink/40"}`}>
                  {f}
                </button>
              ))}
            </div>
          </Question>
        )}

        {q === 1 && (
          <Question title="Which line sounds like your brand?">
            <div className="grid gap-3">
              {world.quotes.map((quote) => (
                <button key={quote} onClick={() => { onSelect({ quote }); setQ(2); }}
                  className={`rounded-2xl border p-4 text-left transition ${sel.quote === quote ? "border-accent bg-accent/[0.07]" : "border-ink/15 bg-[var(--surface-solid)] hover:border-ink/30"}`}>
                  <p className="font-serif text-xl italic leading-snug text-ink/85">“{quote}”</p>
                </button>
              ))}
            </div>
          </Question>
        )}

        {q === 2 && (
          <Question title="Which brands inspire you here?" hint="Pick any that feel right.">
            <div className="grid gap-3 sm:grid-cols-2">
              {world.brands.map((b) => {
                const on = sel.brands.includes(b.name);
                return (
                  <button key={b.name} onClick={() => toggleBrand(b.name)}
                    className={`relative rounded-2xl border p-4 text-left transition ${on ? "border-accent bg-accent/[0.07]" : "border-ink/15 bg-[var(--surface-solid)] hover:border-ink/30"}`}>
                    <span className={`absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full text-xs transition ${on ? "bg-accent text-white" : "border border-ink/20 text-ink/35"}`}>{on ? "♥" : "+"}</span>
                    <p className="pr-8 font-serif text-lg">{b.name}</p>
                    <p className="mt-1 text-sm leading-snug text-ink/55">{b.why}</p>
                  </button>
                );
              })}
            </div>
          </Question>
        )}
      </div>

      {/* nav */}
      <div className="mt-8 flex items-center justify-between border-t border-ink/10 pt-6">
        <button onClick={() => (q > 0 ? setQ(q - 1) : onClose())} className="text-sm text-ink/50 transition hover:text-ink">← Back</button>
        {q < steps - 1 ? (
          <button onClick={() => setQ(q + 1)} className="text-sm font-medium text-ink/55 transition hover:text-ink">Skip →</button>
        ) : (
          <button onClick={onNext}
            className="rounded-xl bg-accent px-6 py-3 font-serif text-lg italic text-white shadow-lg shadow-accent/20 transition hover:brightness-105">
            Done · next world →
          </button>
        )}
      </div>
    </div>
  );
}

function Question({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-2xl leading-snug sm:text-3xl">{title}</h3>
      {hint && <p className="mt-1.5 text-sm text-ink/45">{hint}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}
