// Step 6 · Exploration — Option D (compact focus + dual-action word rows).
// One word sits in focus; words related to it are listed in groups by HOW they
// relate. Hover any word for two moves: Explore (re-centre on it) or Save (to the
// cross-world shortlist). Each group refreshes for a new set. Wired to naming.relate.
import { useEffect, useMemo, useRef, useState } from "react";
import { naming, type Brief, type Concept, type RelGroupData } from "../lib/namingApi";
import { Thinking, Info } from "./chrome";
import { REL, type RelId } from "./data";
import type { SavedIdea } from "./Shortlist";

const DEFAULT_RELS: RelId[] = ["related", "metaphor", "translation", "root", "mythic"];
const PER_GROUP = 5;

// Persisted across step navigation (held by CosmosFlow) so leaving and returning
// to exploration restores the board + prefetch cache instead of refetching.
export interface ExploreStore {
  cache: Map<string, { word: string; def: string; groups: RelGroupData[] }>;
  seen: Set<string>;
  focus: { word: string; def: string } | null;
  groups: RelGroupData[];
  active: number;
  hist: string[];
  future: string[];
}

export function Explore({ brief, concepts, saved, setSaved, onDone, initial, store }: {
  brief: Brief; concepts: Concept[]; saved: SavedIdea[];
  setSaved: React.Dispatch<React.SetStateAction<SavedIdea[]>>; onDone: () => void;
  initial?: { focus: { word: string; def: string }; groups: RelGroupData[] };
  store?: ExploreStore;
}) {
  // A restored board (we've been here before) takes priority over the test seed.
  const restored = store && store.focus ? store : null;
  const [active, setActive] = useState(restored?.active ?? 0);
  const world = concepts[active]?.title || "your idea";

  const [focus, setFocus] = useState<{ word: string; def: string }>(restored?.focus ?? initial?.focus ?? { word: "", def: "" });
  const [groups, setGroups] = useState<RelGroupData[]>(restored?.groups ?? initial?.groups ?? []);
  const [loading, setLoading] = useState(!(restored || initial));
  // Which concept index we already have a board for. StrictMode-safe: re-running
  // the mount effect is a no-op; only a real concept change refetches.
  const loadedFor = useRef<number | null>((restored || initial) ? (restored?.active ?? 0) : null);
  const [pending, setPending] = useState("");   // the word currently being explored (for the loading line)
  const [offset, setOffset] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState<Set<RelId>>(new Set());
  const [hist, setHist] = useState<string[]>(restored?.hist ?? []);    // explored words (back stack)
  const [future, setFuture] = useState<string[]>(restored?.future ?? []);
  const reqId = useRef(0);
  // Cache relate results per (world + seed) so back/forward and re-clicking an
  // already-explored word are instant instead of refetching.
  type Entry = { word: string; def: string; groups: RelGroupData[] };
  const cache = useRef<Map<string, Entry>>(store?.cache ?? new Map());
  const cacheKey = (seed: string) => world + "::" + (seed || "").toLowerCase();
  // Every word we've ever surfaced this session, so each new board can ask for
  // fresh words and avoid repeating (uniqueness).
  const seen = useRef<Set<string>>(store?.seen ?? new Set());
  // In-flight relate calls, so a click and a prefetch for the same word share one
  // request instead of firing twice.
  const inflight = useRef<Map<string, Promise<Entry | null>>>(new Map());
  // A concurrency-limited prefetch queue: when a board loads we fetch its children
  // in the background so the next click is instant. Each item carries a remaining
  // depth so the strongest path is pre-loaded several steps ahead.
  const queue = useRef<{ w: string; depth: number }[]>([]);
  const running = useRef(0);
  const MAX_CONC = 10;
  const enqueue = (w: string, depth: number) => {
    const key = cacheKey(w);
    if (!w || cache.current.has(key) || inflight.current.has(key) || queue.current.some((q) => q.w === w)) return;
    queue.current.push({ w, depth });
  };

  const markSeen = (e: Entry) => {
    seen.current.add((e.word || "").toLowerCase());
    for (const g of e.groups) for (const w of g.words) seen.current.add((w.w || "").toLowerCase());
  };
  const excludeList = () => Array.from(seen.current).slice(-50);

  const remember = (entry: Entry, ...seeds: string[]) => {
    // Key by both the requested seed and the resolved focus word so back/forward
    // and re-clicking a word both hit the cache.
    [...seeds, entry.word].forEach((s) => cache.current.set(cacheKey(s), entry));
  };
  if (initial && !cache.current.size) {
    const e = { word: initial.focus.word, def: initial.focus.def, groups: initial.groups };
    remember(e, ""); markSeen(e);
  }

  // Fetch (or reuse) a relate board for a seed in the current world. Caches the
  // result, records its words as "seen", and dedupes concurrent calls.
  function fetchRelate(seed: string): Promise<Entry | null> {
    const key = cacheKey(seed);
    const cached = cache.current.get(key);
    if (cached) return Promise.resolve(cached);
    const pend = inflight.current.get(key);
    if (pend) return pend;
    const p = (async () => {
      try {
        const res = await naming.relate(brief, seed, world, excludeList());
        const entry = { word: res.word, def: res.def, groups: res.groups || [] };
        remember(entry, seed); markSeen(entry);
        return entry;
      } catch { return null; }
      finally { inflight.current.delete(key); }
    })();
    inflight.current.set(key, p);
    return p;
  }

  // Background prefetch: keep one level ahead of the founder. Capped concurrency
  // so we don't fire dozens of requests at once.
  function pump() {
    while (running.current < MAX_CONC && queue.current.length) {
      const item = queue.current.shift()!;
      const key = cacheKey(item.w);
      if (cache.current.has(key) || inflight.current.has(key)) continue;
      running.current++;
      fetchRelate(item.w).then((e) => {
        // Keep going down the strongest path so 2-3 clicks ahead stay instant.
        if (e && item.depth > 0) for (const g of e.groups) enqueue(g.words[0]?.w, item.depth - 1);
      }).finally(() => { running.current--; pump(); });
    }
  }
  function prefetchChildren(e: Entry) {
    // Every visible word is a likely next click, so pre-load them all; the top word
    // of each group also chains two more levels, so the likely path is 3 steps ahead.
    for (const g of e.groups) g.words.slice(0, PER_GROUP).forEach((w, i) => enqueue(w.w, i === 0 ? 2 : 0));
    pump();
  }

  function applyBoard(e: Entry) {
    setFocus({ word: e.word, def: e.def });
    setGroups(e.groups);
    setOffset({});
    setLoading(false);
  }

  // Load relations for a seed (instant from cache; otherwise a single fetch).
  async function load(seed: string) {
    const hit = cache.current.get(cacheKey(seed));
    if (hit) {
      reqId.current++;
      applyBoard(hit);
      prefetchChildren(hit);
      return;
    }
    const id = ++reqId.current;
    setPending(seed || world);
    setLoading(true);
    const entry = await fetchRelate(seed);
    if (id !== reqId.current) return;
    if (entry) { applyBoard(entry); prefetchChildren(entry); }
    else setLoading(false);
  }

  // Mirror the live board into the persisted store so returning to this step
  // restores it (the cache + seen set are already the store's own instances).
  useEffect(() => {
    if (!store) return;
    store.active = active; store.focus = focus; store.groups = groups; store.hist = hist; store.future = future;
  });

  // Load the board when the active world changes (and on first mount unless it
  // was pre-seeded for test mode or restored from the store).
  useEffect(() => {
    if (loadedFor.current === active) return;
    loadedFor.current = active;
    setHist([]); setFuture([]);
    queue.current = [];            // drop pending prefetches from the previous world
    load("");
    /* eslint-disable-next-line */
  }, [active]);

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
  // Refresh a single column with genuinely fresh words: refetch relations for the
  // current focus (excluding everything already shown) and swap in that one group.
  async function refresh(rel: RelId) {
    if (refreshing.has(rel) || !focus.word) return;
    setRefreshing((s) => new Set(s).add(rel));
    try {
      const res = await naming.relate(brief, focus.word, world, excludeList());
      const ng = (res.groups || []).find((g) => g.rel === rel);
      if (ng?.words?.length) {
        // Never resurface a word that has already appeared anywhere this session.
        const fresh = ng.words.filter((w) => !seen.current.has((w.w || "").toLowerCase()));
        const words = fresh.length ? fresh : ng.words;
        setGroups((gs) => gs.map((g) => (g.rel === rel ? { ...g, words } : g)));
        setOffset((p) => ({ ...p, [rel]: 0 }));
        for (const w of words) seen.current.add((w.w || "").toLowerCase());
        // Pre-load the fresh words so opening any of them is instant.
        words.forEach((w, i) => enqueue(w.w, i === 0 ? 2 : 0));
        pump();
      }
    } catch { /* keep the current set */ }
    finally { setRefreshing((s) => { const n = new Set(s); n.delete(rel); return n; }); }
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", flex: "0 0 auto" }}>
        <h1 className="h1" style={{ fontSize: 24, display: "inline-flex", alignItems: "center", gap: 8 }}>
          One word in focus. <em>Its world, listed.</em>
          <Info>Each column groups words by <b>how they relate</b> to your focus word, by meaning, sound, roots, translation, and more. Hover a word for two moves: <b>explore</b> it (make it the new focus) or <b>save</b> it to your shortlist.</Info>
        </h1>
        <span className="sub" style={{ fontSize: 14, flex: 1, minWidth: 200 }}>
          Hover any word to explore it deeper, or save it for later.
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

        {/* CENTER — explore input + focus + word lists (all relation groups always shown) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0, minWidth: 0 }}>
          <ExploreInput onSubmit={explore} />

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
                {DEFAULT_RELS.map((rel) => (
                  <div key={rel} className="relgroup">
                    <div className="gh">
                      <span className="g">{REL[rel].glyph}</span><span className="t">{REL[rel].label}</span>
                      <button className={"refresh-rel" + (refreshing.has(rel) ? " spin" : "")} disabled={refreshing.has(rel)}
                        onClick={() => refresh(rel)} title="Refresh, show a new set">↻</button>
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
