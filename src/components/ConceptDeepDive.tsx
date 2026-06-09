import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { TerritoryWorld } from "../lib/namingApi";
import { StudioNote, Kicker } from "./Guide";

// Immersive exploration. Each chosen concept is a "world": its name swells in
// and dissolves over a deep night sky, revealing a constellation of words. Tap
// the ones that pull at you, they glow and open related words. A layout pass
// measures every word and pushes them apart so none overlap or leave the box.

const PAPER = "#f0ece3";   // cream, words on the dark canvas
const GOLD = "#e6b489";    // warm glow for kept words
const PAD = 16;            // keep words this far from the edges
const GAP_X = 14, GAP_Y = 9; // min breathing room between words
const pad = (n: number) => String(n).padStart(2, "0");
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
function hashStr(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rngFrom(seed: number) { return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

interface Node { key: string; label: string; child: boolean; parent?: string; size: string; dx: string; dy: string; dur: string; delay: string; seedIndex: number }

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
  const [posPx, setPosPx] = useState<Record<string, { x: number; y: number }>>({});
  const [resizeTick, setResizeTick] = useState(0);

  const boxRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef(new Map<string, HTMLButtonElement>());
  const world = worlds[active];

  // The visible word nodes: every seed, plus the related words of opened seeds.
  const nodes = useMemo<Node[]>(() => {
    if (!world) return [];
    const r = rngFrom(hashStr(world.title));
    const n = world.words.length;
    const seeds: Node[] = world.words.map((wn, i) => {
      const rad = Math.sqrt((i + 0.5) / n);
      const size = rad < 0.4 ? "text-[1.6rem] sm:text-3xl" : rad < 0.64 ? "text-xl sm:text-2xl" : rad < 0.84 ? "text-base sm:text-lg" : "text-sm";
      return { key: wn.word, label: wn.word, child: false, size, seedIndex: i, dx: (r() * 5 - 2.5).toFixed(1) + "px", dy: (r() * 5 - 2.5).toFixed(1) + "px", dur: (7 + r() * 6).toFixed(1) + "s", delay: (r() * 1.2).toFixed(2) + "s" };
    });
    const children: Node[] = world.words.filter((w) => expanded.has(w.word)).flatMap((wn) =>
      wn.related.map((rel) => ({ key: wn.word + "__" + rel, label: rel, child: true, parent: wn.word, size: "text-sm", seedIndex: -1, dx: "2px", dy: "-2px", dur: "8s", delay: "0s" })),
    );
    return [...seeds, ...children];
  }, [world, expanded]);

  // Measure + relax: no overlaps, everything inside the box.
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box || revealing || !world || !nodes.length) return;
    const W = box.clientWidth, H = box.clientHeight;
    const r = rngFrom(hashStr(world.title));
    const cx = W / 2, cy = H / 2, Rx = W * 0.42, Ry = H * 0.4;

    const size: Record<string, { w: number; h: number }> = {};
    const p: Record<string, { x: number; y: number }> = {};
    for (const node of nodes) {
      const el = wordRefs.current.get(node.key);
      size[node.key] = { w: el ? el.offsetWidth : 70, h: el ? el.offsetHeight : 26 };
      if (posPx[node.key]) { p[node.key] = { ...posPx[node.key] }; continue; }
      if (!node.child) {
        const rad = Math.sqrt((node.seedIndex + 0.5) / world.words.length);
        const ang = node.seedIndex * 2.39996323;
        p[node.key] = { x: cx + Rx * rad * Math.cos(ang) + (r() - 0.5) * 18, y: cy + Ry * rad * Math.sin(ang) + (r() - 0.5) * 18 };
      } else {
        const base = posPx[node.parent!] || p[node.parent!] || { x: cx, y: cy };
        p[node.key] = { x: base.x + (r() - 0.5) * 90, y: base.y + (r() - 0.5) * 70 };
      }
    }

    // Relax: separate overlapping boxes, clamp inside the canvas.
    for (let it = 0; it < 140; it++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = p[nodes[i].key], b = p[nodes[j].key];
          const sa = size[nodes[i].key], sb = size[nodes[j].key];
          const minX = (sa.w + sb.w) / 2 + GAP_X, minY = (sa.h + sb.h) / 2 + GAP_Y;
          const dx = b.x - a.x, dy = b.y - a.y;
          const ox = minX - Math.abs(dx), oy = minY - Math.abs(dy);
          if (ox > 0 && oy > 0) {
            if (ox < oy) { const push = (ox / 2 + 0.5) * (dx < 0 ? -1 : 1); a.x -= push; b.x += push; }
            else { const push = (oy / 2 + 0.5) * (dy < 0 ? -1 : 1); a.y -= push; b.y += push; }
          }
        }
      }
      for (const node of nodes) {
        const s = size[node.key], q = p[node.key];
        q.x = clamp(q.x, PAD + s.w / 2, W - PAD - s.w / 2);
        q.y = clamp(q.y, PAD + s.h / 2, H - PAD - s.h / 2);
      }
    }
    setPosPx(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, revealing, world, resizeTick]);

  // Re-relax on resize.
  useEffect(() => {
    const box = boxRef.current; if (!box) return;
    let first = true;
    const ro = new ResizeObserver(() => { if (first) { first = false; return; } setPosPx({}); setResizeTick((t) => t + 1); });
    ro.observe(box);
    return () => ro.disconnect();
  }, [active, started]);

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

  function enterWorld(i: number) { setActive(i); setExpanded(new Set()); setPosPx({}); setRevealing(true); }

  // ---- intro ----
  if (!started) {
    return (
      <div className="animate-in">
        <Kicker>The exploration</Kicker>
        <h2 className="mt-2 text-3xl leading-snug sm:text-4xl">Into the <span className="italic text-accent">worlds</span>.</h2>
        <StudioNote>
          Now we go deep into each of your concepts to see how they inspire you. Let us guide you, simply wander each world and tap the words that pull at you. The ones you keep become the raw material for your name.
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

  const openSeeds = nodes.filter((n) => !n.child && expanded.has(n.key));
  const last = active >= worlds.length - 1;

  return (
    <div className="animate-in">
      <Kicker>World {pad(active + 1)} / {pad(worlds.length)}</Kicker>

      {/* the night sky */}
      <div
        ref={boxRef}
        className="relative mt-3 h-[460px] w-full overflow-hidden rounded-[28px] shadow-2xl ring-1 ring-black/20 sm:h-[500px]"
        style={{ background: "radial-gradient(125% 100% at 50% 28%, #2c2723 0%, #1b1815 64%, #131110 100%)" }}
      >
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(48% 42% at 50% 40%, rgba(201,125,90,0.18), transparent 72%)" }} />
        <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 120px 24px rgba(0,0,0,0.45)" }} />

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

            {/* connection lines (px space) */}
            <svg className="pointer-events-none absolute inset-0 h-full w-full">
              {openSeeds.flatMap((n) => {
                const a = posPx[n.key]; if (!a) return [];
                return nodes.filter((c) => c.parent === n.key).map((c) => {
                  const b = posPx[c.key]; if (!b) return null;
                  return <line key={c.key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={GOLD} strokeWidth="1" opacity="0.35" />;
                });
              })}
            </svg>

            {nodes.map((n) => {
              const q = posPx[n.key];
              return (
                <Word key={n.key} setRef={(el) => { if (el) wordRefs.current.set(n.key, el); else wordRefs.current.delete(n.key); }}
                  x={q?.x} y={q?.y} ready={!!q} size={n.size} dx={n.dx} dy={n.dy} dur={n.dur} delay={n.delay}
                  label={n.label} kept={kept.has(n.label)} child={n.child}
                  onClick={() => { onToggle(n.label); if (!n.child) setExpanded((s) => new Set(s).add(n.label)); }} />
              );
            })}

            <span className="pointer-events-none absolute bottom-4 left-0 right-0 text-center font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: PAPER, opacity: 0.35 }}>
              Tap a word to keep it · tap again to go deeper
            </span>
          </>
        )}
      </div>

      <p className="mt-4 text-center font-serif text-base italic text-ink/55">{world.blurb}</p>

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

interface Speck { x: string; y: string; s: string; o: string; tw: boolean; dur: string; delay: string }

function Word({ setRef, x, y, ready, size, dx, dy, dur, delay, label, kept, child, onClick }: {
  setRef: (el: HTMLButtonElement | null) => void;
  x?: number; y?: number; ready: boolean; size: string; dx: string; dy: string; dur: string; delay: string;
  label: string; kept: boolean; child?: boolean; onClick: () => void;
}) {
  return (
    <button ref={setRef} onClick={onClick} className="absolute"
      style={{ left: x != null ? `${x}px` : "50%", top: y != null ? `${y}px` : "50%", transform: "translate(-50%, -50%)", opacity: ready ? 1 : 0, transition: "opacity 0.4s, left 0.4s ease, top 0.4s ease" }}>
      <span className="drift inline-block" style={{ ["--dx" as string]: dx, ["--dy" as string]: dy, ["--dur" as string]: dur, animationDelay: delay } as React.CSSProperties}>
        <span
          className={`${size} whitespace-nowrap font-serif transition-transform duration-300 hover:scale-[1.08]`}
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
