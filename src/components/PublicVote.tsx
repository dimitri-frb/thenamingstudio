import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// The page a friend lands on from a shared link. Simple and clean: the ask up top,
// a tap-to-pick list of names, then a short thank-you. No swiping, no backend.

export interface VoteItem { name: string; type?: string; note?: string }

export function PublicVote({ items, onClose, by, about }: { items: VoteItem[]; onClose: () => void; by?: string; about?: string }) {
  const [liked, setLiked] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (n: string) => setLiked((l) => (l.includes(n) ? l.filter((x) => x !== n) : [...l, n]));
  const who = by && by.trim() ? by.trim() : "A founder";
  const desc = about ? about.charAt(0).toLowerCase() + about.slice(1) : "";

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-auto bg-[var(--page)] text-ink" style={{ fontFamily: "var(--font-sans)" }}>
      <div className="mx-auto w-full max-w-lg px-6 py-8">
        {/* header */}
        <div className="flex items-center justify-between">
          <span className="text-[15px] italic text-ink/70">the naming studio</span>
          <button onClick={onClose} className="font-mono text-xs uppercase tracking-widest text-ink/40 hover:text-ink">✕ close</button>
        </div>

        {done ? (
          <Result liked={liked} total={items.length} who={who} onClose={onClose} />
        ) : (
          <>
            {/* the ask */}
            <div className="mt-12">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/45">Help name a company</p>
              <h1 className="mt-3 text-3xl font-medium leading-[1.15] sm:text-4xl">
                {who} needs a name{desc ? <>, for <span className="italic">{desc}</span></> : ""}.
              </h1>
              <p className="mt-3 text-[15px] text-ink/55">Tap the names you'd back. Your picks help them decide.</p>
            </div>

            {/* the list */}
            <div className="mt-8 flex flex-col gap-2.5">
              {items.map((it) => {
                const on = liked.includes(it.name);
                return (
                  <button key={it.name} onClick={() => toggle(it.name)}
                    className={"flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition " +
                      (on ? "border-ink bg-ink text-[var(--page)]" : "border-ink/15 bg-[var(--surface-solid)] hover:border-ink/40")}>
                    <div className="min-w-0 flex-1">
                      <div className="text-[22px] leading-tight">{it.name}</div>
                      {it.note && <div className={"mt-0.5 truncate text-[13px] italic " + (on ? "text-[var(--page)]/70" : "text-ink/50")}>"{it.note}"</div>}
                    </div>
                    <span className={"grid h-9 w-9 flex-none place-items-center rounded-full border text-base " +
                      (on ? "border-[var(--page)]/40 text-[var(--page)]" : "border-ink/20 text-ink/40")}>{on ? "♥" : "+"}</span>
                  </button>
                );
              })}
            </div>

            {/* send */}
            <button onClick={() => setDone(true)} disabled={!liked.length}
              className="mt-8 w-full rounded-full bg-ink py-4 text-[15px] font-medium text-[var(--page)] transition enabled:hover:opacity-90 disabled:opacity-40">
              {liked.length ? `Send my picks (${liked.length}) →` : "Pick at least one"}
            </button>
            <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest text-ink/35">Anonymous · 30 seconds</p>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Result({ liked, total, who, onClose }: { liked: string[]; total: number; who: string; onClose: () => void }) {
  return (
    <div className="mt-16 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/45">Sent</p>
      <h2 className="mt-3 text-3xl font-medium">Thank you.</h2>
      <p className="mt-2 text-[15px] text-ink/55">You backed {liked.length} of {total}. {who.split(" ")[0]} will see your picks.</p>
      <div className="mx-auto mt-7 flex max-w-xs flex-col gap-2 text-left">
        {liked.map((n) => (
          <div key={n} className="flex items-center gap-3 rounded-xl border border-ink/12 px-4 py-3">
            <span className="text-[19px]">{n}</span>
            <span className="ml-auto text-ink/40">♥</span>
          </div>
        ))}
      </div>
      <button onClick={onClose} className="mt-8 rounded-full border border-ink/20 px-6 py-3 text-[14px] transition hover:border-ink/40">Close</button>
    </div>
  );
}
