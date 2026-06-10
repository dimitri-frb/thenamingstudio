// Phase 4 — the exploration board. The concepts you chose seed a global mind-map
// of related words and quotes, but the concepts themselves drop away: you play
// with the material directly. Double-click any node to bloom its related words
// (to any depth), hover to read what it evokes, and click + to keep it. Kept
// words and quotes gather in the bar on the right and become the raw material
// for your shortlist. Sits under the same phase progress bar as every phase.

import { useEffect, useMemo, useRef, useState } from "react";
import type { NameBrief, Territory } from "../types";
import { studio } from "../studioApi";
import { describeNode, expandItem } from "../studioEngine";
import { PhaseHeader, StudioNote, Thinking } from "../ui";

interface BNode {
  id: string;
  label: string;
  kind: "word" | "quote";
  concept: string;
  description: string;
  lineage: string[]; // ancestor labels (concept first), for the kept-trail
}

const NODE_W = 156;
const NODE_H = 42;
const COL_W = 212;
const ROW_H = 66;
const PAD = 32;

export function Generate({ brief, territories, initialKept, onBack, onDone }: {
  brief: NameBrief;
  territories: Territory[];
  initialKept?: string[];
  onBack: () => void;
  onDone: (keptWords: string[]) => void;
}) {
  const selectedTerritories = useMemo(() => territories.filter((t) => t.selected), [territories]);
  const [roots, setRoots] = useState<BNode[] | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [kept, setKept] = useState<Map<string, { label: string; kind: string; trail: string[] }>>(() => {
    const m = new Map<string, { label: string; kind: string; trail: string[] }>();
    (initialKept || []).forEach((l, i) => m.set("k" + i, { label: l, kind: "word", trail: [] }));
    return m;
  });
  const [hover, setHover] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const cache = useRef<Map<string, BNode[]>>(new Map());

  useEffect(() => {
    let live = true;
    studio.board(brief, selectedTerritories).then((seeds) => {
      if (!live) return;
      setRoots(seeds.map((s, i) => ({ id: "s" + i, label: s.label, kind: s.kind, concept: s.concept, description: s.description, lineage: [s.concept] })));
    });
    return () => { live = false; };
  }, [brief, selectedTerritories]);

  function childrenOf(node: BNode): BNode[] {
    const hit = cache.current.get(node.id);
    if (hit) return hit;
    const kids = expandItem(node.label).map((label, j) => ({
      id: `${node.id}/${j}`,
      label,
      kind: "word" as const,
      concept: node.concept,
      description: describeNode(label, node.concept, "word"),
      lineage: [...node.lineage, node.label],
    }));
    cache.current.set(node.id, kids);
    return kids;
  }

  const { placed, links, width, height } = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>();
    const placed: { node: BNode; x: number; y: number }[] = [];
    let leaf = 0;
    const visit = (node: BNode, depth: number): number => {
      const jitter = (hashNum(node.id) % 17) - 8; // gentle organic offset
      const x = PAD + depth * COL_W + jitter;
      const kids = expanded.has(node.id) ? childrenOf(node) : [];
      let y: number;
      if (!kids.length) { y = PAD + leaf * ROW_H; leaf++; }
      else { const ys = kids.map((k) => visit(k, depth + 1)); y = (ys[0] + ys[ys.length - 1]) / 2; }
      pos.set(node.id, { x, y });
      placed.push({ node, x, y });
      return y;
    };
    (roots || []).forEach((r) => visit(r, 0));
    const links: { key: string; d: string }[] = [];
    placed.forEach(({ node, x, y }) => {
      if (!expanded.has(node.id)) return;
      childrenOf(node).forEach((k) => {
        const p = pos.get(k.id);
        if (!p) return;
        const x1 = x + NODE_W, y1 = y + NODE_H / 2, x2 = p.x, y2 = p.y + NODE_H / 2;
        links.push({ key: `${node.id}>${k.id}`, d: `M${x1} ${y1} C ${x1 + 50} ${y1}, ${x2 - 50} ${y2}, ${x2} ${y2}` });
      });
    });
    const width = Math.max(440, ...placed.map((o) => o.x + NODE_W)) + PAD;
    const height = Math.max(260, ...placed.map((o) => o.y + NODE_H)) + PAD;
    return { placed, links, width, height };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, roots]);

  function toggleExpand(id: string) {
    setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleKeep(node: BNode) {
    setKept((m) => {
      const n = new Map(m);
      if (n.has(node.id)) n.delete(node.id);
      else n.set(node.id, { label: node.label, kind: node.kind, trail: [...node.lineage, node.label] });
      return n;
    });
  }
  function removeKeep(id: string) {
    setKept((m) => { const n = new Map(m); n.delete(id); return n; });
  }

  const keptList = [...kept.entries()];
  const hovered = placed.find((p) => p.node.id === hover)?.node;

  if (!roots) {
    return (
      <div className="animate-in mx-auto max-w-3xl">
        <PhaseHeader phase={4} title="Opening" accent="the space." />
        <Thinking lines={["Scattering the words your concepts suggest…", "A whole board to play with"]} />
      </div>
    );
  }

  return (
    <div className="animate-in mx-auto max-w-5xl">
      <PhaseHeader phase={4} title="Grow the idea" accent="outward." />
      <StudioNote>
        Your concepts have dissolved into the words they suggest. Wander the board, double-click any word to bloom what it relates to, and hover to read what it evokes. Click + to keep the words and quotes that pull at you, they gather on the right.
      </StudioNote>

      {/* breadcrumb of the hovered node */}
      <div className="mt-4 h-5 font-mono text-[11px] text-ink/45">
        {hovered ? (
          <span>{[...hovered.lineage, hovered.label].map((s, i, a) => (
            <span key={i}>{i === a.length - 1 ? <b className="text-accent">{s}</b> : s}{i < a.length - 1 ? " · " : ""}</span>
          ))}</span>
        ) : (
          <span className="text-ink/30">hover a word to trace where it came from</span>
        )}
      </div>

      <div className="mt-2 grid gap-5 lg:grid-cols-[1fr_290px]">
        {/* the board */}
        <div
          className="relative h-[580px] overflow-auto rounded-[24px] border border-ink/12 shadow-inner"
          style={{ background: "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0) 0 0 / 24px 24px, var(--surface-solid)" }}
        >
          <div style={{ width: width * zoom, height: height * zoom, position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width, height, transform: `scale(${zoom})`, transformOrigin: "0 0" }}>
              <svg className="pointer-events-none absolute inset-0" width={width} height={height}>
                {links.map((l) => (
                  <path key={l.key} d={l.d} fill="none" stroke="var(--c-accent)" strokeOpacity={0.3} strokeWidth={1.5} />
                ))}
              </svg>
              {placed.map(({ node, x, y }) => (
                <Node
                  key={node.id}
                  node={node}
                  x={x}
                  y={y}
                  open={expanded.has(node.id)}
                  kept={kept.has(node.id)}
                  onExpand={() => toggleExpand(node.id)}
                  onKeep={() => toggleKeep(node)}
                  onHover={(on) => setHover(on ? node.id : (h) => (h === node.id ? null : h))}
                />
              ))}
              {hovered && <Tooltip node={hovered} pos={placed.find((p) => p.node.id === hovered.id)!} />}
            </div>
          </div>

          {/* zoom toolbar */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full border border-ink/12 bg-[var(--page)]/90 px-2 py-1 font-mono text-xs text-ink/55 shadow-sm">
            <button onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))} className="grid h-5 w-5 place-items-center rounded-full hover:bg-ink/10">−</button>
            <span className="w-9 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(1.4, +(z + 0.15).toFixed(2)))} className="grid h-5 w-5 place-items-center rounded-full hover:bg-ink/10">+</button>
          </div>
          <span className="pointer-events-none absolute bottom-3 right-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/30">
            double-click to grow · + to keep
          </span>
        </div>

        {/* kept words & quotes */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[20px] border border-ink/12 bg-[var(--surface-solid)] p-5">
            <div className="flex items-baseline justify-between">
              <p className="font-serif text-lg italic">Kept</p>
              <span className="font-mono text-[10px] uppercase tracking-widest text-accent">{keptList.length} words & quotes</span>
            </div>

            <div className="mt-4 space-y-3">
              {keptList.length ? keptList.map(([id, k]) => (
                <div key={id} className="group border-t border-ink/8 pt-3 first:border-0 first:pt-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`leading-tight ${k.kind === "quote" ? "font-serif text-base italic" : "font-serif text-xl"}`}>{k.label}</p>
                    <button onClick={() => removeKeep(id)} className="mt-1 text-ink/30 opacity-0 transition group-hover:opacity-100 hover:text-rose-600">×</button>
                  </div>
                  {k.trail.length > 1 && (
                    <p className="mt-1 font-mono text-[10px] text-ink/40">{k.trail.join(" · ")}</p>
                  )}
                </div>
              )) : (
                <p className="text-xs italic text-ink/40">Click + on the words and quotes you love. They collect here, with the path that led you to them.</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-ink/10 pt-6">
        <button onClick={onBack} className="text-sm text-ink/50 transition hover:text-ink">← Back to directions</button>
        <button
          onClick={() => onDone([...new Set(keptList.map(([, k]) => k.label))])}
          disabled={keptList.length < 1}
          className="rounded-xl bg-accent px-6 py-3 font-serif text-lg italic text-white shadow-lg shadow-accent/20 transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Build the shortlist →
        </button>
      </div>
    </div>
  );
}

function hashNum(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function Node({ node, x, y, open, kept, onExpand, onKeep, onHover }: {
  node: BNode; x: number; y: number; open: boolean; kept: boolean; onExpand: () => void; onKeep: () => void; onHover: (on: boolean) => void;
}) {
  const quote = node.kind === "quote";
  return (
    <div
      className="absolute"
      style={{ left: x, top: y, width: NODE_W, height: NODE_H }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <button
        onDoubleClick={onExpand}
        className={`flex h-full w-full items-center gap-1.5 rounded-full border px-3 text-left transition ${
          kept
            ? "border-ink bg-ink text-[var(--page)] shadow"
            : "border-ink/15 bg-[var(--surface-solid)] shadow-sm hover:border-accent/40 hover:shadow"
        }`}
      >
        <span
          onClick={(e) => { e.stopPropagation(); onKeep(); }}
          className={`grid h-4 w-4 shrink-0 cursor-pointer place-items-center rounded-full text-[11px] transition ${
            kept ? "bg-accent text-white" : "border border-ink/25 text-ink/45 hover:border-accent hover:text-accent"
          }`}
          title={kept ? "Remove" : "Keep"}
        >
          {kept ? "✓" : "+"}
        </span>
        <span className={`truncate ${quote ? "font-serif text-[13px] italic" : "font-serif text-[15px]"}`}>{node.label}</span>
        {open && <span className="ml-auto shrink-0 text-[9px] opacity-50">●</span>}
      </button>
    </div>
  );
}

function Tooltip({ node, pos }: { node: BNode; pos: { x: number; y: number } }) {
  // Sit the card just above the node; clamp to the left edge so it stays on board.
  const left = Math.max(8, pos.x - 20);
  const top = Math.max(4, pos.y - 56);
  return (
    <div className="pointer-events-none absolute z-20 w-56 rounded-xl border border-ink/10 bg-ink px-3 py-2 text-[var(--page)] shadow-xl" style={{ left, top }}>
      <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--page)]/50">{node.kind === "quote" ? "Quote" : "Word"} · from {node.concept.toLowerCase()}</p>
      <p className="mt-1 font-serif text-[13px] italic leading-snug">{node.description}</p>
    </div>
  );
}
