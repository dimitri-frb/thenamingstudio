import type { Feeling } from "../lib/namingApi";

// The emotional step: every feeling the studio drew from the brief, laid out so
// you can SEE them all at once and tap the ones that fit (no more one-at-a-time
// cards). Each tile leads with the feeling word and carries a personalized "why
// it fits you" line. Kept feelings become the emotional signal for the name.

export function FeelingDeck({ cards, kept, onKeep, onUnkeep, onContinue }: {
  cards: Feeling[];
  kept: string[];
  onKeep: (word: string) => void;
  onUnkeep: (word: string) => void;
  onBack?: () => void;
  onContinue: () => void;
}) {
  const isKept = (w: string) => kept.includes(w);
  const toggle = (w: string) => (isKept(w) ? onUnkeep(w) : onKeep(w));

  return (
    <div>
      {/* the board of feelings */}
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => {
          const on = isKept(c.word);
          return (
            <button
              key={c.word}
              onClick={() => toggle(c.word)}
              className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition ${
                on
                  ? "border-accent/45 bg-accent/[0.07] shadow-sm"
                  : "border-ink/12 bg-[var(--surface-solid)] hover:-translate-y-0.5 hover:border-ink/25 hover:shadow-sm"
              }`}
            >
              <span
                className={`absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full text-sm transition ${
                  on ? "bg-accent text-white shadow-sm shadow-accent/30" : "border border-ink/15 text-ink/30 group-hover:text-ink/45"
                }`}
              >
                {on ? "♥" : "♡"}
              </span>
              <p className="font-serif text-3xl leading-none">{c.word}</p>
              <p className="mt-3 max-w-[24ch] font-serif text-[15px] italic leading-snug text-ink/60">{c.why}</p>
            </button>
          );
        })}
      </div>

      {/* live "should feel" summary */}
      <div className="mt-7 min-h-[2.5rem] rounded-2xl border border-ink/10 bg-[var(--page)]/50 p-4">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ink/40">
          {kept.length ? "Your name should feel" : "Tap the feelings that fit"}
        </p>
        {kept.length ? (
          <div className="flex flex-wrap gap-1.5">
            {kept.map((w) => (
              <button
                key={w}
                onClick={() => onUnkeep(w)}
                className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/5 py-1 pl-3 pr-1.5 text-sm text-ink/75"
                title="Remove"
              >
                {w}
                <span className="grid h-4 w-4 place-items-center rounded-full text-ink/35 hover:bg-ink/10 hover:text-ink">×</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm italic text-ink/40">Pick at least two, they'll gather here and shape every name.</p>
        )}
      </div>

      {/* nav */}
      <div className="mt-8 flex items-center justify-between border-t border-ink/10 pt-6">
        <span className="font-mono text-xs text-accent">♥ {kept.length} kept</span>
        <button
          onClick={onContinue}
          disabled={kept.length < 2}
          className="rounded-xl bg-accent px-6 py-3 font-serif text-lg italic text-white shadow-lg shadow-accent/20 transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Next · Naming strategy →
        </button>
      </div>
    </div>
  );
}
