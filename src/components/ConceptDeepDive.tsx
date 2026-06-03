import { useState } from "react";
import type { TerritoryWorld } from "../lib/namingApi";

// Explore each chosen direction as an inspiring "sketch" of the brand. The
// founder reacts — keeping the manifesto lines, reference brands and angles that
// feel right. Every keep sharpens "your brand so far", and that — not a word
// list — is what the names are drawn from.

export type Kind = "quotes" | "brands" | "angles";
export interface Kept { quotes: Set<string>; brands: Set<string>; angles: Set<string> }

export function ConceptDeepDive({ worlds, kept, onToggle, onBack, onGenerate }: {
  worlds: TerritoryWorld[];
  kept: Kept;
  onToggle: (kind: Kind, value: string) => void;
  onBack: () => void;
  onGenerate: () => void;
}) {
  const [active, setActive] = useState(0);
  const world = worlds[active];
  if (!world) return null;
  const total = kept.quotes.size + kept.brands.size + kept.angles.size;

  return (
    <div className="animate-in">
      <h2 className="text-3xl leading-snug sm:text-4xl">Sharpen the <span className="italic text-accent">sketch</span>.</h2>
      <p className="mt-3 max-w-xl text-ink/55">
        This is your brand, drawn in rough. Keep whatever makes your gut say <em>yes</em> — the voice, the company it keeps, the angle.
        The more you react, the clearer the picture gets — and that's what we name from.
      </p>

      {/* your brand so far — the sketch that fills in as they react */}
      <SketchSoFar kept={kept} onToggle={onToggle} />

      {/* direction tabs */}
      {worlds.length > 1 && (
        <div className="mt-7 flex flex-wrap gap-2">
          {worlds.map((w, i) => (
            <button key={w.title} onClick={() => setActive(i)}
              className={`rounded-full border px-3.5 py-1.5 font-serif text-base italic transition ${i === active ? "border-accent bg-accent/10 text-ink" : "border-ink/15 text-ink/55 hover:border-ink/35"}`}>
              {w.title}
            </button>
          ))}
        </div>
      )}

      {/* the world */}
      <div className="mt-5 rounded-2xl border border-ink/12 bg-[var(--surface-solid)] p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">{world.title}</p>
        <p className="mt-2 font-serif text-2xl leading-snug">{world.essence}</p>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">{world.story}</p>
      </div>

      {/* how it talks */}
      <Section label="How it would talk" hint="Manifesto lines in the brand's voice.">
        <div className="grid gap-3">
          {world.quotes.map((q) => (
            <KeepCard key={q} kept={kept.quotes.has(q)} onClick={() => onToggle("quotes", q)}>
              <p className="pr-8 font-serif text-xl italic leading-snug text-ink/85">“{q}”</p>
            </KeepCard>
          ))}
        </div>
      </Section>

      {/* brands that live here */}
      <Section label="Brands that live here" hint="The company your brand would keep.">
        <div className="grid gap-3 sm:grid-cols-2">
          {world.brands.map((b) => (
            <KeepCard key={b.name} kept={kept.brands.has(b.name)} onClick={() => onToggle("brands", b.name)}>
              <p className="pr-8 font-serif text-lg">{b.name}</p>
              <p className="mt-1 text-sm leading-snug text-ink/55">{b.why}</p>
            </KeepCard>
          ))}
        </div>
      </Section>

      {/* angles within */}
      <Section label="Angles within" hint="Narrower takes — niche down toward what fits.">
        <div className="grid gap-3 sm:grid-cols-2">
          {world.angles.map((a) => (
            <KeepCard key={a.title} kept={kept.angles.has(a.title)} onClick={() => onToggle("angles", a.title)}>
              <p className="pr-8 font-serif text-lg">{a.title}</p>
              <p className="mt-1 text-sm leading-snug text-ink/55">{a.note}</p>
            </KeepCard>
          ))}
        </div>
      </Section>

      {/* nav */}
      <div className="mt-9 flex items-center justify-between border-t border-ink/10 pt-6">
        <button onClick={onBack} className="text-sm text-ink/50 transition hover:text-ink">← Back</button>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-widest text-ink/45">{total} kept</span>
          <button onClick={onGenerate} disabled={total < 1}
            className="rounded-xl bg-accent px-6 py-3 font-serif text-lg italic text-white shadow-lg shadow-accent/20 transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-30">
            Draw up the names →
          </button>
        </div>
      </div>
    </div>
  );
}

function SketchSoFar({ kept, onToggle }: { kept: Kept; onToggle: (kind: Kind, value: string) => void }) {
  const total = kept.quotes.size + kept.brands.size + kept.angles.size;
  return (
    <div className="mt-6 rounded-2xl border border-accent/25 bg-accent/[0.04] p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">Your brand so far</p>
      {total === 0 ? (
        <p className="mt-2 text-sm italic text-ink/45">Nothing kept yet — start tapping the things below that feel right, and the picture will fill in here.</p>
      ) : (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {[...kept.quotes].map((q) => <Chip key={"q" + q} onRemove={() => onToggle("quotes", q)}>“{trunc(q, 34)}”</Chip>)}
          {[...kept.brands].map((b) => <Chip key={"b" + b} onRemove={() => onToggle("brands", b)}>like {b}</Chip>)}
          {[...kept.angles].map((a) => <Chip key={"a" + a} onRemove={() => onToggle("angles", a)}>{a}</Chip>)}
        </div>
      )}
    </div>
  );
}

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-[var(--surface-solid)] py-1 pl-3 pr-1.5 text-sm text-ink/75">
      {children}
      <button onClick={onRemove} className="grid h-4 w-4 place-items-center rounded-full text-ink/35 transition hover:bg-ink/10 hover:text-ink" title="Remove">×</button>
    </span>
  );
}

function Section({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="mt-7">
      <div className="mb-2.5 flex items-baseline gap-3">
        <h3 className="font-serif text-xl">{label}</h3>
        <span className="text-sm text-ink/45">{hint}</span>
      </div>
      {children}
    </div>
  );
}

function KeepCard({ kept, onClick, children }: { kept: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`group relative w-full rounded-2xl border p-4 text-left transition ${kept ? "border-accent bg-accent/[0.07]" : "border-ink/15 bg-[var(--surface-solid)] hover:border-ink/30"}`}>
      <span className={`absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full text-xs transition ${kept ? "bg-accent text-white" : "border border-ink/20 text-ink/35 group-hover:border-ink/40"}`}>
        {kept ? "♥" : "+"}
      </span>
      {children}
    </button>
  );
}

function trunc(s: string, n: number) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }
