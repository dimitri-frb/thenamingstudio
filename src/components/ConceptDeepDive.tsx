import { useEffect, useMemo, useState } from "react";
import type { TerritoryWorld } from "../lib/namingApi";
import { StudioNote, Kicker } from "./Guide";

// Immersive exploration. Each chosen concept becomes a "world": its name swells
// in and dissolves, revealing a drifting constellation of words. Tap the ones
// that pull at you — they light up and open related words to go deeper. The kept
// words become the raw material for the name.

const SIZES = ["text-base", "text-lg", "text-xl", "text-2xl", "text-[1.7rem]"];
const pad = (n: number) => String(n).padStart(2, "0");
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
function hashStr(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rngFrom(seed: number) { return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function ConceptDeepDive({ worlds, kept, onToggle, onBack, onGenerate }: {
  worlds: TerritoryWorld[];
  kept: Set<string>;
  onToggle: (word: string) => void;
  onBack: () => void;
  onGenerate: () => void;
}) {
  const [started, setStarted] = useState(false);
  const [active, setActive] = useState(0);
  const [revealing, setRevealing] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const world = worlds[active];

  const layout = useMemo(() => {
    if (!world) return [] as Layout[];
    const r = rngFrom(hashStr(world.title));
    return world.words.map((wn, i) => {
      const ring = i % 3;
      const radius = [15, 27, 39][ring] + r() * 5;
      const ang = (i * 137.508 + r() * 26) * (Math.PI / 180);
      return {
        wn,
        x: clamp(50 + radius * Math.cos(ang) * 1.55, 7, 93),
        y: clamp(50 + radius * Math.sin(ang), 12, 88),
        size: SIZES[Math.floor(r() * SIZES.length)],
        dx: (r() * 8 - 4).toFixed(1) + "px",
        dy: (r() * 8 - 4).toFixed(1) + "px",
        dur: (6 + r() * 5).toFixed(1) + "s",
        delay: (r() * 1.6).toFixed(2) + "s",
      };
    });
  }, [world]);

  useEffect(() => {
    if (!started || !revealing) return;
    const t = setTimeout(() => setRevealing(false), 1700);
    return () => clearTimeout(t);
  }, [started, revealing, active]);

  function enterWorld(i: number) { setActive(i); setExpanded(new Set()); setRevealing(true); }

  // ---- intro ----
  if (!started) {
    return (
      <div className="animate-in">
        <Kicker>The exploration</Kicker>
        <h2 className="mt-2 text-3xl leading-snug sm:text-4xl">Into the <span className="italic text-accent">worlds</span>.</h2>
        <StudioNote>
          Now we go deep into each of your concepts to see how they inspire you. Let us guide you — simply wander each world and tap the words that pull at you. The ones you keep become the raw material for your name.
        </StudioNote>
        <div className="mt-8 flex items-center justify-between border-t border-ink/10 pt-6">
          <button onClick={onBack} className="text-sm text-ink/50 transition hover:text-ink">← Back</button>
          <button onClick={() => { setStarted(true); enterWorld(0); }}
            className="rounded-xl bg-accent px-6 py-3 font-serif text-lg italic text-white shadow-lg shadow-accent/20 transition hover:brightness-105">
            Step into the first world →
          </button>
        </div>
      </div>
    );
  }
  if (!world) return null;

  const childPos = (p: Layout, j: number, total: number) => {
    const a = (j / total) * 2 * Math.PI + p.x;
    return { x: clamp(p.x + 11 * Math.cos(a) * 1.5, 5, 95), y: clamp(p.y + 11 * Math.sin(a), 8, 92) };
  };
  const openSeeds = layout.filter((n) => expanded.has(n.wn.word));
  const last = active >= worlds.length - 1;

  return (
    <div className="animate-in">
      <Kicker>World {pad(active + 1)} / {pad(worlds.length)}</Kicker>

      {/* the night sky */}
      <div className="relative mt-3 h-[440px] w-full overflow-hidden rounded-3xl border border-ink/10 bg-gradient-to-b from-[var(--surface-solid)] to-[var(--page)]">
        {revealing ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <p className="title-reveal font-serif text-4xl italic leading-tight text-ink sm:text-5xl">{world.title}</p>
          </div>
        ) : (
          <>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
              {openSeeds.flatMap((n) => n.wn.related.map((rel, j) => {
                const c = childPos(n, j, n.wn.related.length);
                return <line key={n.wn.word + rel} x1={n.x} y1={n.y} x2={c.x} y2={c.y} stroke="currentColor" className="text-accent/20" strokeWidth="0.15" />;
              }))}
            </svg>

            {layout.map((n) => (
              <Word key={n.wn.word} x={n.x} y={n.y} size={n.size} dx={n.dx} dy={n.dy} dur={n.dur} delay={n.delay}
                label={n.wn.word} kept={kept.has(n.wn.word)} open={expanded.has(n.wn.word)}
                onClick={() => { onToggle(n.wn.word); setExpanded((s) => new Set(s).add(n.wn.word)); }} />
            ))}

            {openSeeds.flatMap((n) => n.wn.related.map((rel, j) => {
              const c = childPos(n, j, n.wn.related.length);
              return <Word key={n.wn.word + "_" + rel} x={c.x} y={c.y} size="text-sm" dx="3px" dy="-3px" dur="6.5s" delay="0s"
                child label={rel} kept={kept.has(rel)} onClick={() => onToggle(rel)} />;
            }))}

            <span className="pointer-events-none absolute bottom-3 left-0 right-0 text-center font-mono text-[10px] uppercase tracking-widest text-ink/35">
              Tap a word to keep it · tap again to go deeper
            </span>
          </>
        )}
      </div>

      {/* HUD */}
      <p className="mt-3 text-center font-serif text-base italic text-ink/55">{world.blurb}</p>

      <div className="mt-6 flex items-center justify-between border-t border-ink/10 pt-6">
        <button onClick={() => (active > 0 ? enterWorld(active - 1) : setStarted(false))} className="text-sm text-ink/50 transition hover:text-ink">
          ← {active > 0 ? "Previous world" : "Back"}
        </button>
        <span className="font-mono text-xs text-accent">✦ {kept.size} kept</span>
        <button onClick={() => (last ? onGenerate() : enterWorld(active + 1))}
          className="rounded-xl bg-accent px-6 py-3 font-serif text-lg italic text-white shadow-lg shadow-accent/20 transition hover:brightness-105">
          {last ? "Draw up the names →" : "Exploration complete →"}
        </button>
      </div>
    </div>
  );
}

interface Layout { wn: { word: string; related: string[] }; x: number; y: number; size: string; dx: string; dy: string; dur: string; delay: string }

function Word({ x, y, size, dx, dy, dur, delay, label, kept, open, child, onClick }: {
  x: number; y: number; size: string; dx: string; dy: string; dur: string; delay: string;
  label: string; kept: boolean; open?: boolean; child?: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="star-in absolute" style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}>
      <span className="drift inline-block" style={{ "--dx": dx, "--dy": dy, "--dur": dur, animationDelay: delay } as React.CSSProperties}>
        <span className={`${size} whitespace-nowrap font-serif transition ${kept ? "text-accent" : child ? "text-ink/45 hover:text-ink/75" : "text-ink/70 hover:text-accent"}`}>
          {kept ? "✦ " : ""}{label}{open && !kept ? <span className="ml-0.5 text-accent/40">·</span> : ""}
        </span>
      </span>
    </button>
  );
}
