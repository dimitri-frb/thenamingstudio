// The living brief. A single panel docked to the right of the studio that does
// not list fields: it composes the whole brief into one beautiful, inspiring
// sentence that grows and rephrases itself in real time as the founder feeds the
// tool (what it does, who it's for, how it should feel, the directions chosen,
// the words kept, the finalists). It only ever reads SessionState, so it is
// always in sync.

import type { ReactNode } from "react";
import type { SessionState } from "./types";

export function BriefPanel({ session }: { session: SessionState }) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 rounded-[20px] border border-ink/12 bg-[var(--surface-solid)] p-6">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink/40">The brief</p>
          <span className="font-mono text-[10px] uppercase tracking-widest text-accent">live</span>
        </div>
        <div className="mt-4">
          <LivingSentence session={session} />
        </div>
      </div>
    </aside>
  );
}

const em = (s: ReactNode) => <span className="not-italic font-medium text-accent">{s}</span>;

function joinList(arr: string[]): string {
  if (arr.length <= 1) return arr[0] || "";
  return arr.slice(0, -1).join(", ") + " and " + arr[arr.length - 1];
}

// Builds the brief as one evolving sentence. Each clause only appears once its
// information exists, so the line literally grows as the founder progresses.
function LivingSentence({ session }: { session: SessionState }) {
  const b = session.brief;
  const directions = session.territories.filter((t) => t.selected).map((t) => t.name.toLowerCase());
  const words = session.keptWords;
  const finalists = session.candidates.filter((c) => session.finalists.includes(c.id)).map((c) => c.name);

  if (!b?.whatItDoes) {
    return (
      <p className="font-serif text-base italic leading-relaxed text-ink/40">
        Your brief will write itself here, growing into a single line you'd be proud to read aloud, as you tell us more.
      </p>
    );
  }

  const does = b.whatItDoes.trim().replace(/\.$/, "");
  const feel = (b.personality || []).map((p) => p.toLowerCase());
  const flavor = b.nameJob >= 62 ? "a name to grow into" : b.nameJob <= 38 ? "a name that says what it does" : "";

  return (
    <p className="font-serif text-lg italic leading-relaxed text-ink/80">
      A name for {does}
      {b.audience && <>, made for {em(b.audience)}</>}
      {b.oneThingToOwn && <>, here to stand for {b.oneThingToOwn.toLowerCase().replace(/\.$/, "")}</>}.
      {feel.length > 0 && (
        <> It should feel {em(joinList(feel))}{flavor && `, ${flavor}`}.</>
      )}
      {(directions.length > 0 || words.length > 0) && (
        <>
          {" "}
          {directions.length > 0 ? <>Drawn from {em(joinList(directions))}</> : <>Circling words like {em(joinList(words.slice(0, 5)))}</>}
          {directions.length > 0 && words.length > 0 && <>, circling words like {em(joinList(words.slice(0, 5)))}</>}
          .
        </>
      )}
      {finalists.length > 0 && <> It's coming down to {em(joinList(finalists))}.</>}
    </p>
  );
}
