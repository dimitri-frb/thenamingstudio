// The living brief. A single panel docked to the right of the studio that fills
// in continuously as the founder moves through the phases: the brief basics
// first, then the chosen directions, the words and quotes kept, and the
// finalists. It only ever reads SessionState, so it is always in sync.

import type { SessionState } from "./types";

export function BriefPanel({ session }: { session: SessionState }) {
  const b = session.brief;
  const directions = session.territories.filter((t) => t.selected).map((t) => t.name);
  const words = session.keptWords;
  const finalists = session.candidates.filter((c) => session.finalists.includes(c.id)).map((c) => c.name);

  const started = !!(b?.whatItDoes || b?.audience || directions.length || words.length);

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 rounded-[20px] border border-ink/12 bg-[var(--surface-solid)] p-5">
        <div className="flex items-baseline justify-between">
          <p className="font-serif text-lg italic">The brief</p>
          <span className="font-mono text-[10px] uppercase tracking-widest text-accent">live</span>
        </div>

        {!started && (
          <p className="mt-4 text-xs italic leading-relaxed text-ink/40">
            As you answer, your brief takes shape here, and sharpens with every step you take.
          </p>
        )}

        {b?.whatItDoes && (
          <Section label="What it does"><p className="line-clamp-3 text-sm leading-snug text-ink/65">{b.whatItDoes}</p></Section>
        )}
        {b?.audience && <Section label="For"><p className="text-sm text-ink/65">{b.audience}</p></Section>}
        {b?.oneThingToOwn && <Section label="To own"><p className="text-sm leading-snug text-ink/65">{b.oneThingToOwn}</p></Section>}
        {!!b?.personality?.length && <Section label="Personality"><Chips items={b.personality} /></Section>}
        {b && typeof b.nameJob === "number" && started && (
          <Section label="Name job"><NameJobBar v={b.nameJob} /></Section>
        )}
        {!!b?.targetMarkets?.length && started && <Section label="Markets"><Chips items={b.targetMarkets} /></Section>}

        {directions.length > 0 && <Section label="Directions"><Chips items={directions} serif /></Section>}
        {words.length > 0 && <Section label={`Kept · ${words.length}`}><Chips items={words} /></Section>}
        {finalists.length > 0 && <Section label="Finalists"><Chips items={finalists} accent /></Section>}
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

function Chips({ items, accent, serif }: { items: string[]; accent?: boolean; serif?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <span
          key={it}
          className={`max-w-full truncate rounded-full border px-2.5 py-0.5 text-xs ${
            accent ? "border-accent/40 bg-accent/10 text-ink/80" : "border-ink/15 bg-[var(--page)]/60 text-ink/65"
          } ${serif ? "font-serif italic" : ""}`}
        >
          {it}
        </span>
      ))}
    </div>
  );
}

// descriptive ↔ abstract, the name-job slider position the founder set.
function NameJobBar({ v }: { v: number }) {
  return (
    <div>
      <div className="relative h-1.5 rounded-full bg-ink/10">
        <span className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-accent shadow" style={{ left: `calc(${v}% - 6px)` }} />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[8px] uppercase tracking-wide text-ink/40">
        <span>descriptive</span>
        <span>abstract</span>
      </div>
    </div>
  );
}
