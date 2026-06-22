// Step 7 · Name ideas (converge). Left: the words the founder saved while exploring
// (their raw material). Right: our brand-name recommendations, coined from those
// words. Pick the strongest (the seed words themselves, or our names) into the
// shortlist that flows to the comparison.
import { useEffect, useRef, useState } from "react";
import { naming, type Brief, type NameIdea } from "../lib/namingApi";
import { Head, Thinking, Info } from "./chrome";

export interface SavedIdea { w: string; concept: string; mine?: boolean }
export interface SeedRow { seed: string; concept: string; ideas: NameIdea[]; loading?: boolean }

const MAX_SEEDS = 8;
const MAX_PICK = 10;

export function Shortlist({ brief, saved, shortlist, setShortlist, onDone, initialRows }: {
  brief: Brief; saved: SavedIdea[]; shortlist: string[];
  setShortlist: React.Dispatch<React.SetStateAction<string[]>>; onDone: () => void; initialRows?: SeedRow[];
}) {
  const seeds = useRef(saved.slice(0, MAX_SEEDS));
  // Our recommendations (one Opus call across all saved words), strongest first.
  const [ideas, setIdeas] = useState<NameIdea[] | null>(initialRows ? initialRows.flatMap((r) => r.ideas) : null);
  const [busy, setBusy] = useState(false);

  async function generate(more = false) {
    setBusy(true);
    try {
      const got = await naming.names(
        brief,
        { concepts: Array.from(new Set(seeds.current.map((s) => s.concept))), words: seeds.current.map((s) => s.w) },
        more && ideas ? ideas.map((i) => i.name) : [],
      );
      setIdeas((prev) => {
        const merged = more && prev ? [...prev, ...got] : got;
        const seen = new Set<string>();
        return merged.filter((i) => { const k = i.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
      });
    } catch { if (!ideas) setIdeas([]); }
    finally { setBusy(false); }
  }

  useEffect(() => { if (!initialRows) generate(false); /* eslint-disable-next-line */ }, []);

  const pick = (name: string) =>
    setShortlist((p) => p.includes(name) ? p.filter((x) => x !== name) : p.length >= MAX_PICK ? p : [...p, name]);

  const sorted = (ideas || []).slice().sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <>
      <Head eyebrow={<>Name ideas <Info>On the <b>left</b> are the words you saved while exploring. On the <b>right</b> are brand names we coined from them. Click any to add it to your shortlist.</Info></>}
        title={<>Your words, <em>turned into names.</em></>}
        sub="Left: what you picked. Right: our recommendations. Add your favourites (max 10) to compare." />

      <div className="namecols">
        {/* LEFT — the founder's saved words */}
        <div className="namecol">
          <span className="lbl">Your words · {seeds.current.length}</span>
          <div className="wordpick">
            {seeds.current.map((s) => (
              <span key={s.w} className={"wchip" + (shortlist.includes(s.w) ? " on" : "")} onClick={() => pick(s.w)} title="Add this exact word to your shortlist">
                {s.w}{shortlist.includes(s.w) && <span className="tk">✓</span>}
              </span>
            ))}
            {!seeds.current.length && <span className="rn">No words saved, step back to explore.</span>}
          </div>
          <p className="namehint">These are your raw material. Keep a word as-is, or pick a name we shaped from it.</p>
        </div>

        {/* RIGHT — our recommendations */}
        <div className="namecol">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="lbl" style={{ flex: 1 }}>Our recommendations</span>
            <button className="btn" style={{ fontSize: 12.5 }} disabled={busy} onClick={() => generate(true)}>
              {busy ? "Coining…" : "Show me more"}
            </button>
          </div>
          {!ideas ? (
            <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
              <Thinking lines={["Coining brand names from your words…", "Blending, bending, inventing"]} />
            </div>
          ) : (
            <div className="namegrid">
              {sorted.map((idea) => {
                const on = shortlist.includes(idea.name);
                return (
                  <button key={idea.name} className={"namecard" + (on ? " on" : "")} onClick={() => pick(idea.name)}>
                    <div className="nc-top">
                      <span className="nc-name">{idea.name}</span>
                      {on ? <span className="nc-star">★</span> : <span className="nc-add">+</span>}
                    </div>
                    <p className="nc-why">{idea.rationale}</p>
                    {idea.type && <span className="nc-type">{idea.type}</span>}
                  </button>
                );
              })}
              {busy && <div className="namecard ghost"><span className="rn">coining…</span></div>}
              {!sorted.length && !busy && <span className="rn">No names yet, try Show me more.</span>}
            </div>
          )}
        </div>
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
    </>
  );
}
