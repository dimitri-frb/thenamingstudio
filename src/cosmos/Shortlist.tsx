// Step 7 · Shortlist (converge). Every saved idea is a SEED — keep the seed word
// itself, or grow coined name ideas from it (refreshable). Pick the strongest into
// the shortlist dock (max 10); that's what flows into the comparison.
import { useEffect, useRef, useState } from "react";
import { naming, type Brief, type NameIdea } from "../lib/namingApi";
import { Anno, Head, Thinking, Info } from "./chrome";

export interface SavedIdea { w: string; concept: string; mine?: boolean }

const MAX_SEEDS = 8;
const PER_SEED = 6;
const MAX_PICK = 10;

export interface SeedRow { seed: string; concept: string; ideas: NameIdea[]; loading?: boolean }

export function Shortlist({ brief, saved, shortlist, setShortlist, onDone, initialRows }: {
  brief: Brief; saved: SavedIdea[]; shortlist: string[];
  setShortlist: React.Dispatch<React.SetStateAction<string[]>>; onDone: () => void; initialRows?: SeedRow[];
}) {
  const [rows, setRows] = useState<SeedRow[] | null>(initialRows ?? null);
  const seeds = useRef(saved.slice(0, MAX_SEEDS));

  // ONE name call for the whole shortlist (every saved word at once), then sort
  // the names back under the seed each one grew from. Far faster and steadier than
  // firing a separate Opus call per seed.
  useEffect(() => {
    if (initialRows) return;        // test mode: rows are pre-seeded, skip the live fetch
    let live = true;
    (async () => {
      const base: SeedRow[] = seeds.current.map((s) => ({ seed: s.w, concept: s.concept, ideas: [] }));
      try {
        const ideas = await naming.names(brief, {
          concepts: Array.from(new Set(seeds.current.map((s) => s.concept))),
          words: seeds.current.map((s) => s.w),
        });
        const bySeed = (w?: string) => {
          const i = seeds.current.findIndex((s) => s.w.toLowerCase() === (w || "").toLowerCase());
          return i >= 0 ? i : 0;     // unmatched names fall under the first seed
        };
        for (const idea of ideas) base[bySeed(idea.seed)].ideas.push(idea);
      } catch { /* keep empty rows; the founder can still keep seeds or swap a row */ }
      if (live) setRows(base);
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pick(name: string) {
    setShortlist((p) => p.includes(name) ? p.filter((x) => x !== name) : p.length >= MAX_PICK ? p : [...p, name]);
  }
  async function refresh(i: number) {
    const s = seeds.current[i];
    setRows((rs) => rs!.map((r, j) => j === i ? { ...r, loading: true } : r));
    let ideas: NameIdea[] = [];
    try { ideas = (await naming.names(brief, { concepts: [s.concept], words: [s.w] })).slice(0, PER_SEED); } catch { /* keep */ }
    setRows((rs) => rs!.map((r, j) => j === i ? { ...r, ideas, loading: false } : r));
  }

  if (!rows) return (
    <>
      <Header />
      <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
        <Thinking lines={["Growing name ideas from each keeper…", "Coining, blending, shaping"]} />
      </div>
    </>
  );

  return (
    <>
      <Header />
      <div style={{ flex: 1, minHeight: 0, overflow: "auto", border: "1px solid var(--line)", borderRadius: "var(--r3)", background: "var(--surface)", padding: "4px 22px" }}>
        {rows.map((row, i) => (
          <div key={row.seed} className="seed-row">
            <div className="seed-head">
              <span className="sw">{row.seed}</span>
              <span className="sc">seed · {row.concept}</span>
              <span className="refresh" onClick={() => refresh(i)} title="Replace this row with a fresh set">↻ swap for a new set</span>
            </div>
            <div className="idea-wrap">
              <span className={"idea seed" + (shortlist.includes(row.seed) ? " picked" : "")} onClick={() => pick(row.seed)}>
                <span className="seedtag">seed</span>
                <span className="in">{row.seed}</span>
                {shortlist.includes(row.seed) && <span style={{ color: "var(--surface)", fontSize: 12 }}>★</span>}
              </span>
              <span style={{ width: 1, background: "var(--line)", alignSelf: "stretch", margin: "2px 4px" }} />
              {row.loading
                ? <span className="idea" style={{ color: "var(--ink-4)" }}><span className="in" style={{ fontSize: 14, fontFamily: "var(--sans)" }}>growing…</span></span>
                : row.ideas.map((idea) => (
                  <span key={idea.name} className={"idea" + (shortlist.includes(idea.name) ? " picked" : "")} onClick={() => pick(idea.name)}>
                    <span className="in">{idea.name}</span>
                    <span className="ig">✦</span>
                    {shortlist.includes(idea.name) && <span style={{ color: "var(--surface)", fontSize: 12 }}>★</span>}
                  </span>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="dock">
        <div className="cap">
          <span className="lbl" style={{ fontSize: 9.5 }}>Shortlist</span>
          <span className="big">{shortlist.length} <span style={{ color: "var(--ink-4)", fontSize: 13 }}>/ {MAX_PICK}</span></span>
        </div>
        <div className="meter">{Array.from({ length: MAX_PICK }).map((_, i) => <i key={i} className={i < shortlist.length ? "on" : ""} />)}</div>
        <div className="items">
          {shortlist.map((n) => <span key={n} className="chip dark">{n}<span className="x" style={{ color: "rgba(255,255,255,0.5)" }} onClick={() => pick(n)}>×</span></span>)}
        </div>
        <button className="btn solid lg" style={{ flex: "0 0 auto", ...(shortlist.length ? {} : { opacity: 0.4, cursor: "not-allowed" }) }} disabled={!shortlist.length} onClick={onDone}>
          Compare {shortlist.length || ""} →
        </button>
      </div>

      <Anno pos="down" k="Diverge, then converge" style={{ position: "static", maxWidth: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
        Seeds and their ideas sit at the <b>same level</b>: keep a raw word, or a coined idea.
      </Anno>
    </>
  );
}

function Header() {
  return (
    <Head eyebrow={<>Shortlist · converge <Info>A <b>seed</b> is a word you saved while exploring. An <b>idea</b> is a name built from it, generated or typed by you. Both can go on your shortlist.</Info></>}
      title={<>Grow each keeper. <em>Cut to ten.</em></>}
      sub="Keep a seed as-is, or grow name ideas from it. Pick your strongest (max 10) to compare." />
  );
}
