import { useMemo, useState } from "react";
import type { TerritoryWorld } from "../lib/namingApi";

// Explore the 2-3 chosen territories in depth. Mobile = stacked "worlds";
// desktop (lg+) = an interactive node canvas. Both share the "kept" word set.

const KIND_LABEL: Record<string, string> = { synonym: "≈", metaphor: "✶", foreign: "🌍", sound: "♪" };

export function ConceptDeepDive({ worlds, kept, onToggle, onBack, onGenerate }: {
  worlds: TerritoryWorld[];
  kept: Set<string>;
  onToggle: (w: string) => void;
  onBack: () => void;
  onGenerate: () => void;
}) {
  const [active, setActive] = useState(0);
  const world = worlds[active];
  if (!world) return null;

  return (
    <div className="animate-in">
      <h2 className="text-3xl leading-snug sm:text-4xl">Explore your <span className="italic text-accent">territories</span>.</h2>
      <p className="mt-3 max-w-xl text-ink/55">Dig into each world. Tap the words that speak to you to keep them — names get built from your favourites.</p>

      {/* territory tabs */}
      {worlds.length > 1 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {worlds.map((w, i) => (
            <button key={w.title} onClick={() => setActive(i)}
              className={`rounded-full border px-3.5 py-1.5 font-serif text-base italic transition ${i === active ? "border-accent bg-accent/10 text-ink" : "border-ink/15 text-ink/55 hover:border-ink/35"}`}>
              {w.title}
            </button>
          ))}
        </div>
      )}

      {/* the world header — shared by both layouts */}
      <div className="mt-6 rounded-2xl border border-ink/12 bg-[var(--surface-solid)] p-5">
        <p className="font-serif text-xl italic leading-snug text-ink/80">{world.story}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-1.5">
            {world.palette.map((c, i) => <span key={i} className="h-5 w-5 rounded-full ring-1 ring-ink/10" style={{ background: c }} />)}
          </div>
          <span className="font-mono text-xs uppercase tracking-wider text-ink/45">{world.mood.join(" · ")}</span>
          <span className="text-sm text-ink/55">{world.motif}</span>
        </div>
      </div>

      {/* desktop: node canvas */}
      <div className="mt-5 hidden lg:block">
        <Canvas world={world} kept={kept} onToggle={onToggle} />
      </div>

      {/* mobile: stacked word world */}
      <div className="mt-5 lg:hidden">
        <WordList world={world} kept={kept} onToggle={onToggle} />
      </div>

      {/* references + samples */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink/12 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40">Names already in this world</p>
          <p className="mt-2 font-serif text-lg text-ink/70">{world.samples.join(" · ")}</p>
        </div>
        <div className="rounded-2xl border border-ink/12 p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40">Touchstones</p>
          <p className="mt-2 text-sm text-ink/55">{world.references.join(" · ")}</p>
        </div>
      </div>

      {/* nav */}
      <div className="mt-8 flex items-center justify-between border-t border-ink/10 pt-6">
        <button onClick={onBack} className="text-sm text-ink/50 transition hover:text-ink">← Back</button>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-widest text-ink/45">{kept.size} kept</span>
          <button onClick={onGenerate} disabled={kept.size < 1}
            className="rounded-xl bg-accent px-6 py-3 font-serif text-lg italic text-white shadow-lg shadow-accent/20 transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-30">
            Generate names from {kept.size || ""} words →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- mobile: word list with inline branches ---------------- */
function WordList({ world, kept, onToggle }: { world: TerritoryWorld; kept: Set<string>; onToggle: (w: string) => void }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggleOpen = (w: string) => setOpen((s) => { const n = new Set(s); n.has(w) ? n.delete(w) : n.add(w); return n; });

  return (
    <div className="space-y-2.5">
      {world.words.map((sw) => {
        const isOpen = open.has(sw.word);
        return (
          <div key={sw.word} className="rounded-2xl border border-ink/12 bg-[var(--surface-solid)] p-3">
            <div className="flex items-center gap-2">
              <Pill word={sw.word} kept={kept.has(sw.word)} onClick={() => onToggle(sw.word)} big />
              <span className="flex-1 text-xs text-ink/45">{sw.note}</span>
              <button onClick={() => toggleOpen(sw.word)} className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-ink/15 text-ink/50 transition hover:border-ink/35" title="Branch further">
                {isOpen ? "–" : "+"}
              </button>
            </div>
            {isOpen && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-ink/10 pt-2.5">
                {sw.branches.map((b) => (
                  <Pill key={b.word} word={b.word} kind={b.kind} kept={kept.has(b.word)} onClick={() => onToggle(b.word)} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Pill({ word, kept, onClick, kind, big }: { word: string; kept: boolean; onClick: () => void; kind?: string; big?: boolean }) {
  return (
    <button onClick={onClick}
      className={`rounded-full border transition ${big ? "px-3.5 py-1.5 text-base" : "px-2.5 py-1 text-sm"} ${kept ? "border-accent bg-accent text-white" : "border-ink/20 bg-[var(--surface-solid)] hover:border-ink/40"}`}>
      {kept ? "★ " : ""}{word}{kind && !kept ? <span className="ml-1 opacity-40">{KIND_LABEL[kind]}</span> : ""}
    </button>
  );
}

/* ---------------- desktop: node canvas ---------------- */
function Canvas({ world, kept, onToggle }: { world: TerritoryWorld; kept: Set<string>; onToggle: (w: string) => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpand = (w: string) => setExpanded((s) => { const n = new Set(s); n.has(w) ? n.delete(w) : n.add(w); return n; });

  // deterministic radial layout in a 0..100 coordinate space
  const layout = useMemo(() => {
    const C = { x: 50, y: 50 };
    const n = world.words.length;
    const words = world.words.map((sw, i) => {
      const a = (-90 + (i * 360) / n) * (Math.PI / 180);
      return { sw, x: clamp(C.x + 35 * Math.cos(a)), y: clamp(C.y + 32 * Math.sin(a)), a };
    });
    return { C, words };
  }, [world]);

  return (
    <div className="relative h-[440px] w-full overflow-hidden rounded-2xl border border-ink/12 bg-[var(--surface-solid)]">
      <span className="absolute right-3 top-3 z-10 font-mono text-[10px] uppercase tracking-widest text-ink/35">Canvas · tap a word to branch</span>

      {/* lines */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {layout.words.map((w) => (
          <line key={w.sw.word} x1={layout.C.x} y1={layout.C.y} x2={w.x} y2={w.y} stroke="currentColor" className="text-ink/15" strokeWidth="0.2" />
        ))}
        {layout.words.filter((w) => expanded.has(w.sw.word)).flatMap((w) =>
          w.sw.branches.map((b, j) => {
            const ba = w.a + (j - (w.sw.branches.length - 1) / 2) * 0.5;
            const bx = clamp(w.x + 16 * Math.cos(ba)), by = clamp(w.y + 15 * Math.sin(ba));
            return <line key={w.sw.word + b.word} x1={w.x} y1={w.y} x2={bx} y2={by} stroke="currentColor" className="text-accent/30" strokeWidth="0.18" />;
          }),
        )}
      </svg>

      {/* center */}
      <Node x={layout.C.x} y={layout.C.y} label={world.title} center />

      {/* word + branch nodes */}
      {layout.words.map((w) => (
        <div key={w.sw.word}>
          <Node x={w.x} y={w.y} label={w.sw.word} kept={kept.has(w.sw.word)} open={expanded.has(w.sw.word)}
            onClick={() => toggleExpand(w.sw.word)} onKeep={() => onToggle(w.sw.word)} />
          {expanded.has(w.sw.word) && w.sw.branches.map((b, j) => {
            const ba = w.a + (j - (w.sw.branches.length - 1) / 2) * 0.5;
            const bx = clamp(w.x + 16 * Math.cos(ba)), by = clamp(w.y + 15 * Math.sin(ba));
            return <Node key={b.word} x={bx} y={by} label={b.word} small kept={kept.has(b.word)} onClick={() => onToggle(b.word)} />;
          })}
        </div>
      ))}
    </div>
  );
}

function Node({ x, y, label, center, small, kept, open, onClick, onKeep }: {
  x: number; y: number; label: string; center?: boolean; small?: boolean; kept?: boolean; open?: boolean; onClick?: () => void; onKeep?: () => void;
}) {
  if (center) {
    return (
      <span className="absolute z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl bg-ink px-3 py-2 font-serif text-sm text-[var(--page)]" style={{ left: `${x}%`, top: `${y}%` }}>
        {label}
      </span>
    );
  }
  return (
    <span className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
      <span className={`group relative flex items-center rounded-full border bg-[var(--surface-solid)] transition ${small ? "text-xs" : "text-sm"} ${kept ? "border-accent ring-1 ring-accent/40" : "border-ink/25"}`}>
        <button onClick={onClick} className="px-3 py-1.5 transition hover:text-accent">{label}</button>
        <button onClick={onKeep ?? onClick} title="Keep" className={`pr-2.5 ${kept ? "text-accent" : "text-ink/25 hover:text-ink/60"}`}>{kept ? "★" : "☆"}</button>
        {open && <span className="pointer-events-none absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent" />}
      </span>
    </span>
  );
}

function clamp(v: number) { return Math.max(7, Math.min(93, v)); }
