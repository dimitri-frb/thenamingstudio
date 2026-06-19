// Step 6 · Exploration — Option D (compact focus + dual-action word rows).
// One word sits in focus; words related to it are listed in groups by HOW they
// relate. Hover any word for two moves: Explore (re-centre on it) or Save (to the
// cross-world shortlist). Each group refreshes for a new set. Wired to naming.relate.
import { useEffect, useMemo, useRef, useState } from "react";
import { naming, type Brief, type Concept, type RelGroupData } from "../lib/namingApi";
import { Thinking } from "./chrome";
import { RELATIONS, REL, type RelId } from "./data";
import type { SavedIdea } from "./Shortlist";

const DEFAULT_RELS: RelId[] = ["related", "metaphor", "translation", "root", "mythic"];
const PER_GROUP = 5;

export function Explore({ brief, concepts, saved, setSaved, onDone }: {
  brief: Brief; concepts: Concept[]; saved: SavedIdea[];
  setSaved: React.Dispatch<React.SetStateAction<SavedIdea[]>>; onDone: () => void;
}) {
  const [active, setActive] = useState(0);
  const world = concepts[active]?.title || "your idea";

  const [focus, setFocus] = useState<{ word: string; def: string }>({ word: "", def: "" });
  const [groups, setGroups] = useState<RelGroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");   // the word currently being explored (for the loading line)
  const [shown, setShown] = useState<Set<RelId>>(new Set(DEFAULT_RELS));
  const [offset, setOffset] = useState<Record<string, number>>({});
  const [hist, setHist] = useState<string[]>([]);          // explored words (back stack)
  const [future, setFuture] = useState<string[]>([]);
  const reqId = useRef(0);

  // Load relations for a seed in the current world.
  async function load(seed: string) {
    const id = ++reqId.current;
    setPending(seed || world);
    setLoading(true);
    try {
      const res = await naming.relate(brief, seed, world);
      if (id !== reqId.current) return;
      setFocus({ word: res.word, def: res.def });
      setGroups(res.groups || []);
      setOffset({});
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }

  // First load + whenever the active world changes.
  useEffect(() => { setHist([]); setFuture([]); load(""); /* eslint-disable-next-line */ }, [active]);

  function explore(word: string) {
    if (word === focus.word) return;
    setHist((h) => [...h, focus.word].filter(Boolean));
    setFuture([]);
    load(word);
  }
  function back() {
    setHist((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [focus.word, ...f].filter(Boolean));
      load(prev);
      return h.slice(0, -1);
    });
  }
  function fwd() {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      setHist((h) => [...h, focus.word].filter(Boolean));
      load(next);
      return f.slice(1);
    });
  }

  const savedSet = useMemo(() => new Set(saved.map((s) => s.w.toLowerCase())), [saved]);
  const isSaved = (w: string) => savedSet.has(w.toLowerCase());
  function toggleSave(w: string) {
    setSaved((prev) => prev.some((s) => s.w.toLowerCase() === w.toLowerCase())
      ? prev.filter((s) => s.w.toLowerCase() !== w.toLowerCase())
      : [...prev, { w, concept: world }]);
  }
  function addManual(w: string) {
    const t = w.trim();
    if (t && !isSaved(t)) setSaved((prev) => [...prev, { w: t, concept: world, mine: true }]);
  }

  const groupFor = (rel: RelId) => groups.find((g) => g.rel === rel)?.words || [];
  const wordsFor = (rel: RelId) => {
    const all = groupFor(rel);
    if (!all.length) return [];
    const off = offset[rel] || 0;
    return Array.from({ length: Math.min(PER_GROUP, all.length) }, (_, i) => all[(off + i) % all.length]);
  };
  const refresh = (rel: RelId) => setOffset((p) => ({ ...p, [rel]: (p[rel] || 0) + PER_GROUP }));

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", flex: "0 0 auto" }}>
        <h1 className="h1" style={{ fontSize: 24 }}>One word in focus. <em>Its world, listed.</em></h1>
        <span className="sub" style={{ fontSize: 12.5, flex: 1, minWidth: 200 }}>
          Hover a word for two moves — explore it, or save it. Each word carries why it relates; refresh any group for a fresh set.
        </span>
      </div>

      <div className="explore-cols">

        {/* LEFT — nav + concept worlds */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="bf">
              <span className={"nv" + (hist.length ? "" : " off")} onClick={back} title="Back">←</span>
              <span className={"nv" + (future.length ? "" : " off")} onClick={fwd} title="Forward">→</span>
            </span>
          </div>
          <span className="lbl">Concept · world</span>
          <div className="cswitch">
            {concepts.map((c, i) => (
              <button key={c.title} className={"cbtn" + (i === active ? " on" : "")} onClick={() => setActive(i)}>
                <span className="ct">{c.title}</span>
                <span className="cg">{i === active ? "exploring this world" : c.lane}</span>
              </button>
            ))}
          </div>
        </div>

        {/* CENTER — explore input + filters + focus + word lists */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0, minWidth: 0 }}>
          <ExploreInput onSubmit={explore} />
          <div className="relbar">
            <span className="lbl" style={{ marginRight: 2 }}>Show</span>
            {RELATIONS.filter((r) => r.id !== "coin").map((r) => (
              <span key={r.id} className={"relchip " + (shown.has(r.id) ? "on" : "off")}
                onClick={() => setShown((s) => { const n = new Set(s); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; })}>
                <span className="g">{r.glyph}</span><span className="t">{r.label}</span><span className="s">{r.sub}</span>
              </span>
            ))}
          </div>

          {loading ? (
            <div className="focusD" style={{ alignItems: "center", justifyContent: "center" }}>
              <Thinking lines={[`Exploring the world around “${pending}”`, "Tracing how words relate"]} />
            </div>
          ) : (
            <div className="focusD">
              <div className="focusD-head">
                <div className="seedmark">
                  <span className="k">Exploring</span>
                  <span className="w">{focus.word}</span>
                  <span className="src">← from {world}</span>
                </div>
                <p className="seeddef">{focus.def}</p>
                <span className="acts seedsave" style={{ opacity: 1 }}>
                  <span className="a savebtn" style={{ fontSize: 12, padding: "7px 14px" }} onClick={() => toggleSave(focus.word)}>
                    {isSaved(focus.word) ? "✓ saved" : `★ save “${focus.word}”`}
                  </span>
                </span>
              </div>
              <div className="relcolsD">
                {DEFAULT_RELS.filter((rel) => shown.has(rel)).map((rel) => (
                  <div key={rel} className="relgroup">
                    <div className="gh">
                      <span className="g">{REL[rel].glyph}</span><span className="t">{REL[rel].label}</span>
                      <button className="refresh-rel" onClick={() => refresh(rel)} title="Refresh — show a new set">↻</button>
                    </div>
                    <div className="items">
                      {wordsFor(rel).map((w, wi) => {
                        const sv = isSaved(w.w);
                        return (
                          <div key={w.w + wi} className={"rwrow" + (sv ? " saved" : "")}>
                            <span className="rw">{w.w}</span>
                            <span className="rn">{w.lang ? w.lang + " · " : ""}{w.note}</span>
                            {sv && <span className="savedflag">★</span>}
                            <span className="acts">
                              <span className="a go" title={`Explore “${w.w}”`} onClick={() => explore(w.w)}>→</span>
                              <span className="a savebtn" title={sv ? "Saved" : "Save to shortlist"} onClick={() => toggleSave(w.w)}>{sv ? "✓" : "★"}</span>
                            </span>
                          </div>
                        );
                      })}
                      {!groupFor(rel).length && <span className="rn" style={{ padding: "4px 9px" }}>—</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — saved ideas */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          <SavedIdeas saved={saved} onRemove={(w) => toggleSave(w)} onAdd={addManual} />
          <button className="btn solid lg" style={{ justifyContent: "center", ...(saved.length ? {} : { opacity: 0.4, cursor: "not-allowed" }) }}
            disabled={!saved.length} onClick={onDone}>Arrange the shortlist →</button>
        </div>
      </div>
    </>
  );
}

function ExploreInput({ onSubmit }: { onSubmit: (w: string) => void }) {
  const [v, setV] = useState("");
  return (
    <label className="addidea" style={{ borderColor: "var(--ink-3)", background: "var(--surface)" }}>
      <span className="plus" style={{ fontSize: 15 }}>⌕</span>
      <input
        className="ph"
        style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontFamily: "var(--sans)", fontSize: 13.5, color: "var(--ink)" }}
        placeholder="Type any word to explore its relations…"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && v.trim()) { onSubmit(v.trim()); setV(""); } }}
      />
      <span className="lbl" style={{ color: "var(--ink-3)" }}>↵ explore</span>
    </label>
  );
}

function SavedIdeas({ saved, onRemove, onAdd }: { saved: SavedIdea[]; onRemove: (w: string) => void; onAdd: (w: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r3)", background: "var(--surface)", padding: "16px 16px 14px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontFamily: "var(--serif)", fontSize: 19, fontStyle: "italic" }}>Saved ideas</span>
        <span className="lbl" style={{ flex: "0 0 auto" }}>cross-world</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 14, overflow: "auto", flex: 1, alignContent: "flex-start" }}>
        {saved.length === 0 && <span className="rn">Save words and they gather here.</span>}
        {saved.map((s) => (
          <span key={s.w} className="chip" style={{ fontSize: 14 }}>
            {s.mine && <span style={{ color: "var(--ink-4)", fontSize: 11 }}>✎</span>}
            {s.w}
            <span className="x" onClick={() => onRemove(s.w)}>×</span>
          </span>
        ))}
      </div>
      <div style={{ height: 1, background: "var(--line-2)", margin: "12px 0 10px" }} />
      <label className="addidea">
        <span className="plus">＋</span>
        <input className="ph" style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontFamily: "var(--sans)", fontSize: 13.5, color: "var(--ink)" }}
          placeholder="Add an idea directly…" value={v} onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && v.trim()) { onAdd(v.trim()); setV(""); } }} />
      </label>
    </div>
  );
}
