import { useRef, useState } from "react";
import type { Feeling } from "../lib/namingApi";

// A "Tinder of feelings" — swipe through feeling cards generated from the brief.
// ♥ (right) keeps the feeling; ✕ (left) skips it. Kept feelings become the
// emotional signal for the name. Personalized: each card carries a "why it fits
// you" line drawn from what the founder told us.

export function FeelingDeck({ cards, kept, onKeep, onUnkeep, onBack, onContinue }: {
  cards: Feeling[];
  kept: string[];
  onKeep: (word: string) => void;
  onUnkeep: (word: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [i, setI] = useState(0);
  const [hist, setHist] = useState<{ word: string; liked: boolean }[]>([]);
  const [drag, setDrag] = useState(0);
  const startX = useRef<number | null>(null);
  const done = i >= cards.length;
  const card = cards[i];

  function decide(like: boolean) {
    if (done) return;
    if (like) onKeep(cards[i].word);
    setHist((h) => [...h, { word: cards[i].word, liked: like }]);
    setDrag(0);
    setI((x) => x + 1);
  }
  function undo() {
    if (!hist.length) return;
    const last = hist[hist.length - 1];
    if (last.liked) onUnkeep(last.word);
    setHist((h) => h.slice(0, -1));
    setI((x) => Math.max(0, x - 1));
  }
  function onDown(e: React.PointerEvent) { startX.current = e.clientX; }
  function onMove(e: React.PointerEvent) { if (startX.current != null) setDrag(e.clientX - startX.current); }
  function onUp() {
    if (Math.abs(drag) > 100) decide(drag > 0);
    else setDrag(0);
    startX.current = null;
  }

  return (
    <div>
      <div className="relative mx-auto h-[340px] w-full max-w-sm select-none">
        {done ? (
          <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-ink/20 p-6 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">That's the feeling</p>
            <p className="mt-3 font-serif text-2xl leading-snug">
              {kept.length ? <>Your name should feel <span className="italic text-accent">{kept.slice(0, 3).join(", ").toLowerCase()}</span>{kept.length > 3 ? "…" : "."}</> : "Swipe back if you skipped them all."}
            </p>
            <button onClick={() => { setI(0); setHist([]); }} className="mt-4 font-mono text-[10px] uppercase tracking-widest text-ink/45 hover:text-ink">↺ Run through again</button>
          </div>
        ) : (
          <>
            {/* stacked shadow cards */}
            <span className="absolute inset-x-4 top-3 h-full rounded-3xl border border-ink/10 bg-[var(--surface-solid)] opacity-50" />
            <span className="absolute inset-x-2 top-1.5 h-full rounded-3xl border border-ink/10 bg-[var(--surface-solid)] opacity-70" />
            <div
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
              className="absolute inset-0 flex cursor-grab touch-none flex-col items-center justify-center rounded-3xl border border-ink/12 bg-[var(--surface-solid)] p-7 text-center shadow-xl active:cursor-grabbing"
              style={{ transform: `translateX(${drag}px) rotate(${drag / 28}deg)`, transition: startX.current == null ? "transform 0.25s" : "none" }}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink/35">Should it feel…</p>
              <p className="mt-4 font-serif text-5xl leading-none">{card.word}</p>
              <p className="mt-5 max-w-xs font-serif text-lg italic leading-snug text-ink/60">{card.why}</p>
              {drag > 40 && <span className="absolute left-6 top-6 rotate-[-12deg] rounded-lg border-2 border-accent px-2 py-0.5 font-mono text-sm uppercase text-accent">yes</span>}
              {drag < -40 && <span className="absolute right-6 top-6 rotate-[12deg] rounded-lg border-2 border-ink/40 px-2 py-0.5 font-mono text-sm uppercase text-ink/40">skip</span>}
            </div>
          </>
        )}
      </div>

      {/* controls */}
      {!done && (
        <div className="mt-6 flex items-center justify-center gap-5">
          <button onClick={() => decide(false)} className="grid h-14 w-14 place-items-center rounded-full border border-ink/20 bg-[var(--surface-solid)] text-xl text-ink/50 transition hover:border-ink/40" title="Skip">✕</button>
          <button onClick={undo} disabled={!hist.length} className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 bg-[var(--surface-solid)] text-ink/40 transition hover:border-ink/30 disabled:opacity-30" title="Undo">↺</button>
          <button onClick={() => decide(true)} className="grid h-14 w-14 place-items-center rounded-full bg-accent text-xl text-white shadow-lg shadow-accent/30 transition hover:brightness-105" title="Keep">♥</button>
        </div>
      )}

      {/* live "should feel" summary */}
      <div className="mt-6 min-h-[2rem]">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ink/40">{cards.length ? `${i > cards.length ? cards.length : i} of ${cards.length}` : ""} · Your name should feel</p>
        {kept.length ? (
          <div className="flex flex-wrap gap-1.5">
            {kept.map((w) => (
              <button key={w} onClick={() => onUnkeep(w)} className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/5 py-1 pl-3 pr-1.5 text-sm text-ink/75" title="Remove">
                {w}<span className="grid h-4 w-4 place-items-center rounded-full text-ink/35 hover:bg-ink/10 hover:text-ink">×</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm italic text-ink/40">Swipe ♥ on the feelings that fit — they'll gather here.</p>
        )}
      </div>

      {/* nav */}
      <div className="mt-8 flex items-center justify-between border-t border-ink/10 pt-6">
        <button onClick={onBack} className="text-sm text-ink/50 transition hover:text-ink">← Back</button>
        <button onClick={onContinue} disabled={kept.length < 2}
          className="rounded-xl bg-accent px-6 py-3 font-serif text-lg italic text-white shadow-lg shadow-accent/20 transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-30">
          Next · Naming strategy →
        </button>
      </div>
    </div>
  );
}
