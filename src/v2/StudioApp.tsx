// The v2 "studio" funnel orchestrator. Owns a single SessionState, threads it
// through the six phases, and persists it to localStorage so a refresh never
// resets progress. Fully isolated from v1: nothing here imports v1's flow.

import { useEffect, useRef, useState } from "react";
import { emptySession, type SessionState } from "./types";
import { markVariant } from "../lib/variant";
import { BrandMark, Wordmark } from "../components/Logo";
import { PhaseRail } from "./ui";
import { Position } from "./phases/Position";
import { Direct } from "./phases/Direct";
import { Generate } from "./phases/Generate";
import { Shortlist } from "./phases/Shortlist";
import { PressureTest } from "./phases/PressureTest";
import { Decide } from "./phases/Decide";

const STORE_KEY = "ns.v2.session";

function load(): SessionState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = { ...emptySession(), ...JSON.parse(raw) } as SessionState;
      // Guard stale sessions saved under the old 7-phase numbering.
      s.phase = Math.min(6, Math.max(1, s.phase || 1)) as SessionState["phase"];
      return s;
    }
  } catch {
    /* ignore */
  }
  return emptySession();
}

export function StudioApp({ onExit }: { onExit: () => void }) {
  const [session, setSession] = useState<SessionState>(load);
  const first = useRef(true);

  useEffect(() => { markVariant("v2"); }, []);

  // Persist on every change (skip the very first render).
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    try { localStorage.setItem(STORE_KEY, JSON.stringify(session)); } catch { /* ignore */ }
  }, [session]);

  const patch = (p: Partial<SessionState>) => setSession((s) => ({ ...s, ...p }));
  const goto = (phase: SessionState["phase"]) => patch({ phase });
  const back = () => goto(Math.max(1, session.phase - 1) as SessionState["phase"]);

  function reset() {
    try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
    setSession(emptySession());
  }

  const finalistCandidates = session.candidates.filter((c) => session.finalists.includes(c.id));

  return (
    <div className="min-h-screen mesh">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-5 py-6">
        <button onClick={onExit} className="group flex items-center gap-2.5">
          <BrandMark />
          <Wordmark />
        </button>
        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-ink/45">
          <span className="hidden rounded-full border border-accent/30 px-3 py-1 text-accent sm:inline">Studio · new</span>
          <button onClick={onExit} className="transition hover:text-ink">↩ flows</button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 pb-24">
        <PhaseRail phase={session.phase} />

        {session.phase === 1 && (
          <Position
            initial={session.brief}
            onBack={onExit}
            onDone={(brief) => patch({ brief, phase: 2 })}
          />
        )}

        {session.phase === 2 && session.brief && (
          <Direct
            brief={session.brief}
            initial={session.territories.length ? session.territories : undefined}
            onBack={back}
            onDone={(territories) => patch({ territories, phase: 3 })}
          />
        )}

        {session.phase === 3 && session.brief && (
          <Generate
            brief={session.brief}
            territories={session.territories}
            initialKept={session.keptWords}
            onBack={back}
            onDone={(keptWords) => patch({ keptWords, phase: 4 })}
          />
        )}

        {session.phase === 4 && session.brief && (
          <Shortlist
            brief={session.brief}
            keptWords={session.keptWords}
            territories={session.territories}
            soundscape={session.soundscape}
            initialCandidates={session.candidates.length ? session.candidates : undefined}
            initialFinalists={session.finalists}
            onBack={back}
            onDone={(candidates, finalists) => patch({ candidates, finalists, phase: 5 })}
          />
        )}

        {session.phase === 5 && session.brief && (
          <PressureTest
            brief={session.brief}
            finalists={finalistCandidates}
            onBack={back}
            onDone={(pressureTests, survivors) => patch({ pressureTests, finalists: survivors.map((c) => c.id), phase: 6 })}
          />
        )}

        {session.phase === 6 && session.brief && (
          <Decide
            brief={session.brief}
            survivors={finalistCandidates}
            onBack={back}
            onRestart={() => { reset(); }}
          />
        )}
      </main>
    </div>
  );
}
