import { useMemo, useRef, useState } from "react";
import type { Brief, TerritoryWorld } from "../lib/namingApi";
import { expandWord } from "../lib/localStudio";
import { Kicker, StudioNote } from "./Guide";

// The exploration as a whiteboard. Each chosen concept is a node; open it and it
// branches into words and expressions, which open further into related words,
// as deep as you like. Star the ones that resonate. A creative brief panel on
// the right always shows what you've gathered and sharpens as you go, then the
// starred words become the raw material for your names.

interface TreeNode {
  id: string;
  label: string;
  kind: "concept" | "word";
  blurb?: string;
  lane?: string;
  related?: string[]; // provided children (seed words); undefined => generate on open
  world?: TerritoryWorld;
}

const NODE_W = 172;
const NODE_H = 46;
const COL_W = 214;
const ROW_H = 60;
const PAD = 28;

export function Whiteboard({ brief, worlds, kept, onToggle, onBack, onGenerate }: {
  brief: Brief;
  worlds: TerritoryWorld[];
  kept: Set<string>;
  onToggle: (word: string) => void;
  onBack: () => void;
  onGenerate: () => void;
}) {
  // Open every concept by default so all the worlds are on the board at once.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(worlds.map((_, i) => "c" + i)));
  const cache = useRef<Map<string, TreeNode[]>>(new Map());

  const roots = useMemo<TreeNode[]>(
    () => worlds.map((w, i) => ({ id: "c" + i, label: w.title, kind: "concept", blurb: w.blurb, world: w })),
    [worlds],
  );

  function childrenOf(node: TreeNode): TreeNode[] {
    const hit = cache.current.get(node.id);
    if (hit) return hit;
    let kids: TreeNode[];
    if (node.kind === "concept" && node.world) {
      kids = node.world.words.map((wn, j) => ({ id: `${node.id}/${j}`, label: wn.word, kind: "word", related: wn.related }));
    } else {
      const rel = node.related?.length ? node.related : expandWord(node.label);
      kids = rel.map((r, j) => ({ id: `${node.id}/${j}`, label: r, kind: "word" as const }));
    }
    cache.current.set(node.id, kids);
    return kids;
  }

  // Tidy left-to-right tree layout: leaves stack down a column, parents centre
  // on their children. Deterministic, so nothing ever overlaps.
  const { placed, links, width, height } = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>();
    const placed: { node: TreeNode; x: number; y: number }[] = [];
    let leaf = 0;
    const visit = (node: TreeNode, depth: number): number => {
      const x = PAD + depth * COL_W;
      const open = expanded.has(node.id);
      const kids = open ? childrenOf(node) : [];
      let y: number;
      if (!kids.length) {
        y = PAD + leaf * ROW_H;
        leaf++;
      } else {
        const ys = kids.map((k) => visit(k, depth + 1));
        y = (ys[0] + ys[ys.length - 1]) / 2;
      }
      pos.set(node.id, { x, y });
      placed.push({ node, x, y });
      return y;
    };
    roots.forEach((r) => visit(r, 0));

    const links: { key: string; d: string }[] = [];
    placed.forEach(({ node, x, y }) => {
      if (!expanded.has(node.id)) return;
      childrenOf(node).forEach((k) => {
        const p = pos.get(k.id);
        if (!p) return;
        const x1 = x + NODE_W, y1 = y + NODE_H / 2, x2 = p.x, y2 = p.y + NODE_H / 2;
        links.push({ key: `${node.id}>${k.id}`, d: `M${x1} ${y1} C ${x1 + 46} ${y1}, ${x2 - 46} ${y2}, ${x2} ${y2}` });
      });
    });

    const width = Math.max(400, ...placed.map((o) => o.x + NODE_W)) + PAD;
    const height = Math.max(220, ...placed.map((o) => o.y + NODE_H)) + PAD;
    return { placed, links, width, height };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, roots]);

  function toggleExpand(id: string) {
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <div className="animate-in">
      <Kicker>The exploration</Kicker>
      <h2 className="mt-2 text-3xl leading-snug sm:text-4xl">
        Open the <span className="italic text-accent">worlds</span>, gather what resonates.
      </h2>
      <StudioNote>
        Tap a concept to open it into words and expressions. Tap those to go deeper. Star the ones that pull at you, they gather in your brief on the right and become the raw material for your names.
      </StudioNote>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_290px]">
        {/* the board */}
        <div
          className="relative h-[540px] overflow-auto rounded-[24px] border border-ink/12 shadow-inner"
          style={{
            background:
              "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.06) 1px, transparent 0) 0 0 / 22px 22px, var(--surface-solid)",
          }}
        >
          <div className="relative" style={{ width, height }}>
            <svg className="pointer-events-none absolute inset-0" width={width} height={height}>
              {links.map((l) => (
                <path key={l.key} d={l.d} fill="none" stroke="var(--c-accent)" strokeOpacity={0.32} strokeWidth={1.5} />
              ))}
            </svg>
            {placed.map(({ node, x, y }) => (
              <Node
                key={node.id}
                node={node}
                x={x}
                y={y}
                open={expanded.has(node.id)}
                starred={kept.has(node.label)}
                onExpand={() => toggleExpand(node.id)}
                onStar={() => onToggle(node.label)}
              />
            ))}
          </div>

          <span className="pointer-events-none absolute bottom-3 left-0 right-0 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-ink/30">
            tap a node to open · tap ☆ to keep · scroll to roam the board
          </span>
        </div>

        {/* the creative brief */}
        <CreativeBrief brief={brief} worlds={worlds} kept={kept} onUnstar={onToggle} />
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-ink/10 pt-6">
        <button onClick={onBack} className="text-sm text-ink/50 transition hover:text-ink">← Back to concepts</button>
        <button
          onClick={onGenerate}
          disabled={kept.size < 1}
          className="rounded-xl bg-accent px-6 py-3 font-serif text-lg italic text-white shadow-lg shadow-accent/20 transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Create names from your selection →
        </button>
      </div>
    </div>
  );
}

function Node({ node, x, y, open, starred, onExpand, onStar }: {
  node: TreeNode;
  x: number;
  y: number;
  open: boolean;
  starred: boolean;
  onExpand: () => void;
  onStar: () => void;
}) {
  const concept = node.kind === "concept";
  return (
    <div className="absolute" style={{ left: x, top: y, width: NODE_W, height: NODE_H }}>
      <button
        onClick={onExpand}
        title={node.blurb || node.label}
        className={`flex h-full w-full items-center gap-2 rounded-xl border px-3 text-left transition ${
          concept
            ? "border-accent/40 bg-gradient-to-br from-accent/12 to-accent2/[0.06] shadow-sm hover:from-accent/20"
            : starred
              ? "border-accent/50 bg-accent/[0.08] shadow-sm"
              : "border-ink/15 bg-[var(--surface-solid)] shadow-sm hover:border-ink/30"
        }`}
      >
        <span
          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] transition ${
            open ? "border-accent bg-accent text-white" : "border-ink/25 text-ink/45"
          }`}
        >
          {open ? "−" : "+"}
        </span>
        <span className={`truncate ${concept ? "font-serif text-[15px] italic" : "text-sm text-ink/80"}`}>{node.label}</span>
      </button>

      {!concept && (
        <button
          onClick={(e) => { e.stopPropagation(); onStar(); }}
          title={starred ? "Remove from brief" : "Star this"}
          className={`absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full text-[11px] shadow transition ${
            starred ? "bg-accent text-white" : "border border-ink/15 bg-[var(--surface-solid)] text-ink/35 hover:text-accent"
          }`}
        >
          {starred ? "★" : "☆"}
        </button>
      )}
    </div>
  );
}

// Always-visible creative brief that sharpens as the founder gathers material.
function CreativeBrief({ brief, worlds, kept, onUnstar }: {
  brief: Brief;
  worlds: TerritoryWorld[];
  kept: Set<string>;
  onUnstar: (word: string) => void;
}) {
  const words = [...kept];
  const feel = brief.signal.length ? brief.signal : brief.tone;
  // A synthesized direction line that only appears once there's enough to say.
  const direction =
    words.length >= 2
      ? `Leaning ${(feel.slice(0, 2).join(" + ") || "distinctive").toLowerCase()} names from ${worlds
          .map((w) => w.title.toLowerCase())
          .slice(0, 2)
          .join(" and ")}, built around ${words.slice(0, 3).join(", ").toLowerCase()}.`
      : null;

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-[20px] border border-ink/12 bg-[var(--surface-solid)] p-5">
        <div className="flex items-center justify-between">
          <p className="font-serif text-lg italic">Creative brief</p>
          <span className="font-mono text-[10px] uppercase tracking-widest text-accent">live</span>
        </div>

        <Section label="What it does">
          <p className="line-clamp-2 text-sm text-ink/60">{brief.does || "—"}</p>
        </Section>

        {brief.audience && (
          <Section label="For">
            <p className="text-sm text-ink/60">{brief.audience}</p>
          </Section>
        )}

        {feel.length > 0 && (
          <Section label="Should feel">
            <Chips items={feel} />
          </Section>
        )}

        <Section label="Concepts in play">
          <Chips items={worlds.map((w) => w.title)} />
        </Section>

        <Section label={`Starred · ${words.length}`}>
          {words.length ? (
            <div className="flex flex-wrap gap-1.5">
              {words.map((w) => (
                <button
                  key={w}
                  onClick={() => onUnstar(w)}
                  className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 py-0.5 pl-2.5 pr-1.5 text-xs text-ink/80"
                  title="Remove"
                >
                  ★ {w}
                  <span className="grid h-3.5 w-3.5 place-items-center rounded-full text-ink/35 hover:bg-ink/10 hover:text-ink">×</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs italic text-ink/40">Star words on the board to gather them here.</p>
          )}
        </Section>

        {direction && (
          <div className="mt-4 rounded-xl border border-accent/20 bg-accent/[0.04] p-3">
            <p className="font-serif text-sm italic leading-snug text-ink/75">{direction}</p>
          </div>
        )}
      </div>
    </aside>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t border-ink/8 pt-3 first-of-type:mt-3">
      <p className="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-ink/40">{label}</p>
      {children}
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <span key={it} className="rounded-full border border-ink/15 bg-[var(--page)]/60 px-2.5 py-0.5 text-xs text-ink/65">
          {it}
        </span>
      ))}
    </div>
  );
}
