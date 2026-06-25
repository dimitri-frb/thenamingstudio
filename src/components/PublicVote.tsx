import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../cosmos/cosmos.css"; // the .votepage reskin lives here

// "Public vote", a swipe deck to gut-check the shortlist (the Figma mock).
// Single-device for now (no backend); shows a tally at the end.

export interface VoteItem { name: string; type?: string; note?: string }

export function PublicVote({ items, onClose, by, about }: { items: VoteItem[]; onClose: () => void; by?: string; about?: string }) {
  const [i, setI] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const [hist, setHist] = useState<boolean[]>([]);
  const [secs, setSecs] = useState(0);
  const [drag, setDrag] = useState(0);
  const [intro, setIntro] = useState<boolean>(!!about); // shown to friends arriving via a shared link
  const startX = useRef<number | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const t = window.setInterval(() => setSecs((s) => s + 1), 1000);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") vote(true); if (e.key === "ArrowLeft") vote(false); };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.clearInterval(t); document.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, liked]);

  const done = i >= items.length;
  const item = items[i];

  function vote(like: boolean) {
    if (done) return;
    if (like) setLiked((l) => [...l, items[i].name]);
    setHist((h) => [...h, like]);
    setDrag(0);
    setI((x) => x + 1);
  }
  function undo() {
    if (i === 0) return;
    const last = hist[hist.length - 1];
    if (last) setLiked((l) => l.slice(0, -1));
    setHist((h) => h.slice(0, -1));
    setI((x) => x - 1);
  }

  function onDown(e: React.PointerEvent) { startX.current = e.clientX; }
  function onMove(e: React.PointerEvent) { if (startX.current != null) setDrag(e.clientX - startX.current); }
  function onUp() {
    if (Math.abs(drag) > 110) vote(drag > 0);
    else setDrag(0);
    startX.current = null;
  }

  return createPortal(
    <div className="votepage fixed inset-0 z-50 flex flex-col bg-[var(--page)]">
      {/* top */}
      <div className="mx-auto flex w-full max-w-md items-center justify-between px-5 py-5 font-mono text-xs uppercase tracking-widest text-ink/45">
        <button onClick={onClose} className="hover:text-ink">✕</button>
        <span className="font-serif text-base italic normal-case tracking-normal text-ink/70">the naming studio</span>
        <span>{intro ? "Help vote" : done ? "Done" : `Vote · ${i + 1} of ${items.length}`}</span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        {intro ? (
          <Intro by={by} about={about} count={items.length} onStart={() => setIntro(false)} />
        ) : done ? (
          <Result liked={liked} items={items} onClose={onClose} />
        ) : (
          <>
            {/* card stack */}
            <div className="relative h-[440px] w-full max-w-sm">
              <span className="absolute inset-x-4 top-3 h-full rounded-3xl border border-ink/10 bg-[var(--surface-solid)] opacity-50" />
              <span className="absolute inset-x-2 top-1.5 h-full rounded-3xl border border-ink/10 bg-[var(--surface-solid)] opacity-70" />
              <div
                onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
                className="absolute inset-0 flex cursor-grab touch-none select-none flex-col items-center justify-center rounded-3xl border border-ink/12 bg-[var(--surface-solid)] p-8 text-center shadow-xl active:cursor-grabbing"
                style={{ transform: `translateX(${drag}px) rotate(${drag / 28}deg)`, transition: startX.current == null ? "transform 0.25s" : "none" }}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink/40">{item.type || "candidate"}</p>
                <p className="mt-6 font-serif text-6xl leading-none">{item.name}</p>
                {item.note && <p className="mt-5 max-w-xs font-serif text-lg italic leading-snug text-ink/55">"{item.note}"</p>}
                <p className="mt-8 font-mono text-[10px] uppercase tracking-widest text-ink/35">swipe to vote</p>
                {/* like/skip hint overlays */}
                {drag > 40 && <span className="absolute left-6 top-6 rotate-[-12deg] rounded-lg border-2 border-emerald-500 px-2 py-0.5 font-mono text-sm uppercase text-emerald-500">keep</span>}
                {drag < -40 && <span className="absolute right-6 top-6 rotate-[12deg] rounded-lg border-2 border-ink/40 px-2 py-0.5 font-mono text-sm uppercase text-ink/40">pass</span>}
              </div>
            </div>

            {/* controls */}
            <div className="mt-8 flex items-center gap-6">
              <button onClick={() => vote(false)} className="grid h-14 w-14 place-items-center rounded-full border border-ink/20 bg-[var(--surface-solid)] text-xl text-ink/50 transition hover:border-ink/40" title="Pass">✕</button>
              <button onClick={undo} disabled={i === 0} className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 bg-[var(--surface-solid)] text-ink/40 transition hover:border-ink/30 disabled:opacity-30" title="Undo">↺</button>
              <button onClick={() => vote(true)} className="grid h-14 w-14 place-items-center rounded-full bg-accent text-xl text-white shadow-lg shadow-accent/30 transition hover:brightness-105" title="Keep">♥</button>
            </div>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-ink/35">anonymous · {secs} second{secs === 1 ? "" : "s"}</p>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Intro({ by, about, count, onStart }: { by?: string; about?: string; count: number; onStart: () => void }) {
  const who = by && by.trim() ? by.trim() : "A founder";
  const desc = about ? about.charAt(0).toLowerCase() + about.slice(1) : "";
  return (
    <div className="animate-in w-full max-w-md text-center">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">Help name a company</p>
      <h2 className="mt-4 font-serif text-4xl leading-tight">
        {who} is looking to name their new project{desc ? <>, <span className="italic text-accent2">{desc}</span></> : ""}.
      </h2>
      <p className="mt-4 font-serif text-2xl italic text-ink/70">They need your help.</p>
      <p className="mt-5 leading-relaxed text-ink/55">
        Here's how it works: swipe <span className="text-accent">♥</span> on the {count} names you love, and <span className="text-ink/70">✕</span> on the ones you don't. Your favourites help them decide.
      </p>
      <button onClick={onStart} className="mt-8 rounded-xl bg-accent px-7 py-3.5 font-serif text-lg italic text-white shadow-lg shadow-accent/20 transition hover:brightness-105">
        Start voting →
      </button>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-ink/35">Anonymous · takes 30 seconds</p>
    </div>
  );
}

function Result({ liked, items, onClose }: { liked: string[]; items: VoteItem[]; onClose: () => void }) {
  return (
    <div className="animate-in w-full max-w-sm text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-ink/40">Your vote</p>
      <h2 className="mt-3 text-3xl">You kept {liked.length} of {items.length}.</h2>
      <div className="mt-6 space-y-2 text-left">
        {liked.length === 0 && <p className="text-center text-ink/45">No favourites this round, that's a signal too.</p>}
        {liked.map((n, idx) => (
          <div key={n} className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
            <span className="font-mono text-xs text-accent">{String(idx + 1).padStart(2, "0")}</span>
            <span className="font-serif text-2xl">{n}</span>
            <span className="ml-auto text-accent">♥</span>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-ink/45">Share this link with 3–5 people and compare. (Multi-person tallies come with the backend.)</p>
      <button onClick={onClose} className="mt-6 rounded-xl bg-ink px-6 py-3 font-serif text-lg italic text-[var(--page)] transition hover:opacity-90">Back to the studio</button>
    </div>
  );
}
