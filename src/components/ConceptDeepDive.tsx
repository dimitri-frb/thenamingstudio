import { useEffect, useMemo, useState } from "react";
import type { TerritoryWorld } from "../lib/namingApi";
import { StudioNote, Kicker } from "./Guide";

// Immersive exploration. Each chosen concept is a "world": its name swells in
// and dissolves over a deep night sky, revealing a constellation of drifting
// words. Tap the ones that pull at you — they glow and open related words. The
// kept words become the raw material for the name.

const PAPER = "#f0ece3";   // cream — words on the dark canvas
const GOLD = "#e6b489";    // warm glow for kept words
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

  // Even, depth-aware layout (phyllotaxis) so words fill the sky and the
  // central ones read largest.
  const layout = useMemo(() => {
    if (!world) return [] as Layout[];
    const r = rngFrom(hashStr(world.title));
    const n = world.words.length;
    return world.words.map((wn, i) => {
      const t = (i + 0.5) / n;
      const rad = Math.sqrt(t);
      const ang = i * 2.39996323; // golden angle
      const size = rad < 0.4 ? "text-[1.7rem] sm:text-3xl" : rad < 0.64 ? "text-xl sm:text-2xl" : rad < 0.84 ? "text-base sm:text-lg" : "text-sm";
      return {
        wn,
        x: clamp(50 + 44 * rad * Math.cos(ang) * 1.5 + (r() - 0.5) * 5, 6, 94),
        y: clamp(50 + 44 * rad * Math.sin(ang) + (r() - 0.5) * 5, 11, 89),
        size,
        dx: (r() * 7 - 3.5).toFixed(1) + "px",
        dy: (r() * 7 - 3.5).toFixed(1) + "px",
        dur: (7 + r() * 6).toFixed(1) + "s",
        delay: (r() * 1.4).toFixed(2) + "s",
      };
    });
  }, [world]);

  const specks = useMemo(() => {
    if (!world) return [] as Speck[];
    const r = rngFrom(hashStr(world.title + "·sky"));
    return Array.from({ length: 54 }, () => ({
      x: (r() * 100).toFixed(1), y: (r() * 100).toFixed(1),
      s: (r() * 1.8 + 0.5).toFixed(1), o: (r() * 0.45 + 0.08).toFixed(2),
      tw: r() > 0.55, dur: (2.2 + r() * 3.5).toFixed(1) + "s", delay: (r() * 3).toFixed(1) + "s",
    }));
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
    return { x: clamp(p.x + 10 * Math.cos(a) * 1.5, 4, 96), y: clamp(p.y + 10 * Math.sin(a), 6, 94) };
  };
  const openSeeds = layout.filter((n) => expanded.has(n.wn.word));
  const last = active >= worlds.length - 1;

  return (
    <div className="animate-in">
      <Kicker>World {pad(active + 1)} / {pad(worlds.length)}</Kicker>

      {/* the night sky */}
      <div
        className="relative mt-3 h-[460px] w-full overflow-hidden rounded-[28px] shadow-2xl ring-1 ring-black/20 sm:h-[500px]"
        style={{ background: "radial-gradient(125% 100% at 50% 28%, #2c2723 0%, #1b1815 64%, #131110 100%)" }}
      >
        {/* warm glow + vignette */}
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(48% 42% at 50% 40%, rgba(201,125,90,0.18), transparent 72%)" }} />
        <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 120px 24px rgba(0,0,0,0.45)" }} />

        {/* twinkling stars */}
        {specks.map((s, i) => (
          <span key={i} className={s.tw ? "twinkle absolute rounded-full" : "absolute rounded-full"}
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.s}px`, height: `${s.s}px`, background: PAPER, opacity: Number(s.o), ["--o" as string]: s.o, ["--tw" as string]: s.dur, animationDelay: s.delay } as React.CSSProperties} />
        ))}

        {revealing ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <p className="title-reveal font-serif text-4xl italic leading-tight sm:text-6xl" style={{ color: PAPER }}>{world.title}</p>
          </div>
        ) : (
          <>
            <span className="pointer-events-none absolute left-5 top-4 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: PAPER, opacity: 0.4 }}>{world.title}</span>

            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
              {openSeeds.flatMap((n) => n.wn.related.map((rel, j) => {
                const c = childPos(n, j, n.wn.related.length);
                return <line key={n.wn.word + rel} x1={n.x} y1={n.y} x2={c.x} y2={c.y} stroke={GOLD} strokeWidth="0.12" opacity="0.4" />;
              }))}
            </svg>

            {layout.map((n) => (
              <Word key={n.wn.word} x={n.x} y={n.y} size={n.size} dx={n.dx} dy={n.dy} dur={n.dur} delay={n.delay}
                label={n.wn.word} kept={kept.has(n.wn.word)}
                onClick={() => { onToggle(n.wn.word); setExpanded((s) => new Set(s).add(n.wn.word)); }} />
            ))}

            {openSeeds.flatMap((n) => n.wn.related.map((rel, j) => {
              const c = childPos(n, j, n.wn.related.length);
              return <Word key={n.wn.word + "_" + rel} x={c.x} y={c.y} size="text-sm" dx="2.5px" dy="-2.5px" dur="7s" delay="0s"
                child label={rel} kept={kept.has(rel)} onClick={() => onToggle(rel)} />;
            }))}

            <span className="pointer-events-none absolute bottom-4 left-0 right-0 text-center font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: PAPER, opacity: 0.35 }}>
              Tap a word to keep it · tap again to go deeper
            </span>
          </>
        )}
      </div>

      {/* caption */}
      <p className="mt-4 text-center font-serif text-base italic text-ink/55">{world.blurb}</p>

      {/* HUD */}
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
interface Speck { x: string; y: string; s: string; o: string; tw: boolean; dur: string; delay: string }

function Word({ x, y, size, dx, dy, dur, delay, label, kept, child, onClick }: {
  x: number; y: number; size: string; dx: string; dy: string; dur: string; delay: string;
  label: string; kept: boolean; child?: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="star-in absolute" style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}>
      <span className="drift inline-block" style={{ ["--dx" as string]: dx, ["--dy" as string]: dy, ["--dur" as string]: dur, animationDelay: delay } as React.CSSProperties}>
        <span
          className={`${size} whitespace-nowrap font-serif transition-all duration-300 hover:scale-[1.08]`}
          style={kept
            ? { color: GOLD, textShadow: `0 0 22px rgba(230,180,137,0.6), 0 0 6px rgba(230,180,137,0.5)` }
            : { color: PAPER, opacity: child ? 0.5 : 0.78 }}
        >
          {kept ? "✦ " : ""}{label}
        </span>
      </span>
    </button>
  );
}
