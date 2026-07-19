// Beta exploration (05, design 1e) and name ideas (06, design 1j).
import { useEffect, useRef, useState } from "react";
import { naming, type Brief, type Concept, type NameIdea, type RelGroupData } from "../../lib/namingApi";
import { REL } from "../../cosmos/data";
import { type SavedIdea } from "../../cosmos/Shortlist";
import { type ExploreStore } from "../../cosmos/Explore";
import { BHead, BFoot, Skel, SkelCard, LoadBar } from "../atoms";

const QUADS: { id: string; glyph: string; label: string }[] = [
  { id: "related", glyph: "≈", label: "Related" },
  { id: "metaphor", glyph: "✶", label: "Metaphor" },
  { id: "translation", glyph: "⇄", label: "Translation" },
  { id: "root", glyph: "⌂", label: "Root" },
];

// 05 — Exploration (design 1e): a concept banner over four word quadrants + a saved rail.
export function BetaExplore({ brief, concept, saved, setSaved, store, initial, onBack, onDone }: {
  brief: Brief; concept?: Concept; saved: SavedIdea[]; setSaved: React.Dispatch<React.SetStateAction<SavedIdea[]>>;
  store: ExploreStore; initial?: { focus: { word: string; def: string }; groups: RelGroupData[] };
  onBack?: () => void; onDone: () => void;
}) {
  const world = concept?.title || "your idea";
  const [groups, setGroups] = useState<RelGroupData[]>(initial?.groups ?? store.groups ?? []);
  const [busy, setBusy] = useState(!initial && !groups.length);
  const [focus, setFocus] = useState("");
  const [focusDef, setFocusDef] = useState("");
  const did = useRef(false);
  // Prefetch cache: word → resolved groups + def (background fetch as each grid renders)
  const cache = useRef<Map<string, RelGroupData[]>>(new Map());
  const defs = useRef<Map<string, string>>(new Map());
  const pending = useRef<Set<string>>(new Set());
  // World groups are the original concept-level groups; sub-explore overwrites store.groups
  // so we keep a separate ref so resetToWorld always goes back to the right root.
  const worldGroups = useRef<RelGroupData[]>(initial?.groups ?? store.groups ?? []);

  // Wait for the concept if the flow is still shaping it (we land here immediately
  // now and show the skeleton), then draw the world of words.
  useEffect(() => {
    if (did.current || initial || groups.length || !concept) return;
    did.current = true; setBusy(true);
    naming.relate(brief, "", world, []).then((r) => {
      const gs = r.groups || [];
      setGroups(gs); store.groups = gs; worldGroups.current = gs;
    }).catch(() => { /* leave empty */ }).finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concept]);

  // As soon as a grid of words renders, silently fetch their sub-worlds in the background
  // so that clicking "Explore →" can swap instantly from the cache.
  const wordsFor = (id: string) => groups.find((g) => g.rel === id)?.words || [];
  useEffect(() => {
    if (!groups.length) return;
    QUADS.forEach((q) => wordsFor(q.id).slice(0, 4).forEach(({ w }) => {
      if (cache.current.has(w) || pending.current.has(w)) return;
      pending.current.add(w);
      naming.relate(brief, w, world, [])
        .then((r) => { cache.current.set(w, r.groups || []); if (r.def) defs.current.set(w, r.def); })
        .catch(() => { /* ignore prefetch failure */ })
        .finally(() => { pending.current.delete(w); });
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  const isSaved = (w: string) => saved.some((s) => s.w.toLowerCase() === w.toLowerCase());
  const toggle = (w: string) => setSaved((p) => isSaved(w) ? p.filter((s) => s.w.toLowerCase() !== w.toLowerCase()) : [...p, { w, concept: world }]);
  const explore = (w: string) => {
    setFocus(w);
    setFocusDef(defs.current.get(w) || "");
    const hit = cache.current.get(w);
    if (hit?.length) {
      // Instant: data already prefetched
      setGroups(hit); store.groups = hit;
    } else {
      // Fallback: fetch now (cache miss, user was very fast)
      setBusy(true);
      naming.relate(brief, w, world, [])
        .then((r) => {
          setGroups(r.groups || []); store.groups = r.groups || []; cache.current.set(w, r.groups || []);
          if (r.def) { defs.current.set(w, r.def); setFocusDef(r.def); }
        })
        .finally(() => setBusy(false));
    }
  };
  const resetToWorld = () => {
    setFocus(""); setFocusDef("");
    if (worldGroups.current.length) {
      setGroups(worldGroups.current);
    } else {
      setBusy(true);
      naming.relate(brief, "", world, []).then((r) => {
        const gs = r.groups || [];
        setGroups(gs); store.groups = gs; worldGroups.current = gs;
      }).finally(() => setBusy(false));
    }
  };
  // The initial "charging" state: no words yet (concept still shaping, or first
  // relate in flight) — the page renders its own skeleton per the design.
  const charging = !groups.length && (busy || !concept);

  const fallback = "An AI naming studio that finds a brand name with a strategist's rigor, in minutes not months.";

  return (
    <>
      <div className="bbody" style={{ paddingBottom: 26 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
            {charging ? "Reading your brief, finding the words…" : "Save the words that feel like your brand."}
          </span>
          {!charging && (
            <span style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
              Tap <span style={{ fontWeight: 600 }}>+ Save</span> on any word that inspires you — we'll shape your picks into brand names on the next step. Tap <span style={{ fontWeight: 600 }}>Explore &rarr;</span> to dig into a word's world.
            </span>
          )}
        </div>
        <div className="bexplore-body" style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="bconcept-banner">
              {charging ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className="bspin" style={{ width: 20, height: 20 }} />
                      <span className="bconcept-k">Shaping the concept</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--accent)" }}>Thinking&hellip;</span>
                  </div>
                  <Skel w="46%" h={18} blue />
                </>
              ) : (
                <>
                  <div className="bconcept-row">
                    <span className="bconcept-k">{focus ? "Exploring" : "Concept"}</span>
                    <span className="bconcept-w">{focus || world}</span>
                  </div>
                  {focus ? (
                    <span className="bconcept-q">
                      {focusDef || concept?.blurb || ""}
                      <span style={{ color: "var(--accent)", fontWeight: 600, cursor: "pointer", marginLeft: 8, whiteSpace: "nowrap" }} onClick={resetToWorld}>&larr; back to {world}</span>
                    </span>
                  ) : (
                    <span className="bconcept-q">&ldquo;{brief.does || fallback}&rdquo;</span>
                  )}
                </>
              )}
            </div>
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)", margin: 0 }}>
              {charging ? "Words that fit the brief" : <>Words in the world of <span style={{ color: "var(--ink-2)" }}>{focus || world}</span></>}
            </p>
            {charging || (busy && !groups.length) ? (
              <div className="bquads">
                {QUADS.map((q) => (
                  <div key={q.id} className="bquad">
                    <div className="bquad-h"><span style={{ color: "var(--accent)" }}>{REL[q.id]?.glyph || q.glyph}</span>{REL[q.id]?.label || q.label}</div>
                    {Array.from({ length: 3 }).map((_, i) => <SkelCard key={i} lines={3} />)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bquads">
                {QUADS.map((q) => (
                  <div key={q.id} className="bquad">
                    <div className="bquad-h"><span style={{ color: "var(--accent)" }}>{REL[q.id]?.glyph || q.glyph}</span>{REL[q.id]?.label || q.label}</div>
                    {wordsFor(q.id).slice(0, 4).map((w, i) => {
                      const on = isSaved(w.w);
                      return (
                        <div key={w.w + i} className={"bword" + (on ? " on" : "")} onClick={() => toggle(w.w)}>
                          <span className="bword-w">{w.w}</span>
                          <span className="bword-g">{w.lang ? w.lang + " · " : ""}{w.note}</span>
                          <div className="bword-foot">
                            <span className="bword-explore" onClick={(e) => { e.stopPropagation(); explore(w.w); }}>Explore &rarr;</span>
                            <span className={"bword-save" + (on ? " on" : "")}>{on ? "✓ Saved" : "+ Save"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bexplore-saved" style={{ width: 208, flex: "0 0 auto" }}>
            <div className="bsaved">
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Saved</span>
                <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>{saved.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {saved.map((s) => (
                  <div key={s.w} className="bsaved-row"><span style={{ color: "var(--accent)", fontSize: 11 }}>★</span>{s.w}
                    <span style={{ marginLeft: "auto", color: "var(--ink-4)", cursor: "pointer" }} onClick={() => toggle(s.w)}>&times;</span>
                  </div>
                ))}
                {!saved.length && (
                  charging ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "18px 0" }}>
                      <span className="bspin" style={{ width: 22, height: 22 }} />
                      <span style={{ fontSize: 12.5, color: "var(--ink-3)", textAlign: "center" }}>Save words as they appear</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>Save words you like and they gather here.</span>
                  )
                )}
              </div>
              <button className="bbtn" style={{ width: "100%", marginTop: 14, justifyContent: "center" }}
                disabled={!saved.length} onClick={onDone}>Shape into names &rarr;</button>
            </div>
          </div>
        </div>
      </div>
      {onBack && (
        <BFoot
          next={saved.length ? `Shape ${saved.length} word${saved.length === 1 ? "" : "s"} into names →` : "Save some words first"}
          disabled={!saved.length} onNext={onDone} />
      )}
    </>
  );
}

// 06+07 — Names & Comparison (merged): one hero card for the top pick, 2-col grid for the rest.
export function BetaNamesCompare({ brief, saved, shortlist: _shortlist, setShortlist: _setShortlist, initialRows, onVote, onNext }: {
  brief: Brief; saved: SavedIdea[];
  shortlist: string[]; setShortlist: React.Dispatch<React.SetStateAction<string[]>>;
  initialRows?: { seed: string; concept: string; ideas: NameIdea[] }[];
  onVote: (name: string, allNames: string[]) => void; onNext: (name: string, allNames: string[]) => void;
}) {
  const byScore = (a: NameIdea, b: NameIdea) => (b.score || 0) - (a.score || 0);
  const seedIdeas = () => (initialRows || []).flatMap((r) => r.ideas).sort(byScore);
  const [ideas, setIdeas] = useState<NameIdea[]>(seedIdeas());
  const [busy, setBusy] = useState(!ideas.length);
  const [chosen, setChosen] = useState("");
  const [keptWords, setKeptWords] = useState<string[]>([]);
  const did = useRef(false);

  // "Generate more" KEEPS the current list and appends the new batch under it
  // (each batch score-sorted within itself); the initial batch is score-sorted.
  const generate = (more: boolean) => {
    setBusy(true);
    const words = saved.map((s) => s.w);
    naming.names(brief, { concepts: [], words } as any, more ? ideas.map((i) => i.name) : [])
      .then((res) => { setIdeas((p) => more ? dedupe([...p, ...[...res].sort(byScore)]) : [...res].sort(byScore)); })
      .catch(() => { /* keep */ }).finally(() => setBusy(false));
  };
  useEffect(() => { if (did.current || ideas.length) return; did.current = true; generate(false); /* eslint-disable-next-line */ }, []);

  // Order NEVER changes once shown: rank-1 stays at top, new batches append under.
  const sorted = ideas;
  const hero = sorted[0];
  const rest = sorted.slice(1);
  // pick defaults to hero; clicking any card OR a kept word selects it without reordering.
  const pick = chosen || hero?.name || keptWords[0] || "";
  const genNames = new Set(sorted.map((i) => i.name.toLowerCase()));
  const toggleKept = (w: string) => {
    const isKept = keptWords.includes(w);
    if (!isKept) {
      setKeptWords((p) => [...p, w]);
      setChosen(w); // auto-select as pick when first kept
    } else if (chosen === w) {
      setKeptWords((p) => p.filter((x) => x !== w));
      setChosen("");
    } else {
      setChosen(w);
    }
  };
  const pct = (idea: NameIdea) => Math.min(99, Math.max(40, Math.round(idea.score || 70)));

  const Bar = ({ p, sel }: { p: number; sel: boolean }) => (
    <div style={{ height: 3, borderRadius: 999, background: "var(--sep)", marginTop: 8 }}>
      <div style={{ height: "100%", width: p + "%", borderRadius: 999, background: sel ? "var(--accent)" : "var(--ink-3)", transition: "width 0.5s ease" }} />
    </div>
  );

  return (
    <>
      <div className="bbody">
        {busy && !ideas.length ? (
          <BHead eyebrow="Names & comparison" title={<>Scoring your names&hellip;</>}
            sub="Building names from your saved words and grading each against the brief." />
        ) : (
          <BHead eyebrow="Names & comparison" title={<>Every name, already scored.</>} />
        )}
        {brief.does && !(busy && !ideas.length) && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 16px", borderRadius: 12, background: "var(--accent-soft, #EEF3FF)", border: "1px solid var(--accent)" }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", flex: "0 0 auto", paddingTop: 2 }}>Brief</span>
            <span style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5 }}>&ldquo;{brief.does}&rdquo;</span>
          </div>
        )}
        {busy && !ideas.length ? (
          <>
            <LoadBar text="Generating candidates &amp; scoring against the brief&hellip;" />
            {/* Hero placeholder — the top pick's card, still thinking */}
            <div className="bcmp lead" style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 22px" }}>
              <span style={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: "50%", background: "var(--surface)", flex: "0 0 auto" }}>
                <span className="bspin" />
              </span>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
                <Skel w="34%" h={15} blue />
                <Skel w="82%" />
                <Skel w="46%" h={5} blue />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
              <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", whiteSpace: "nowrap" }}>Other contenders</span>
              <div style={{ flex: 1, height: 1, background: "var(--sep)" }} />
            </div>
            <div className="bcmp-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bskel-card" style={{ padding: "16px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <Skel w="42%" h={13} />
                    <Skel w={30} h={13} />
                  </div>
                  <Skel w="78%" />
                  <Skel w="55%" h={5} blue />
                </div>
              ))}
            </div>
          </>
        ) : hero ? (
          <>
            {/* Rank-1 card — always at top, always shows crown, clickable to re-select */}
            {(() => {
              const heroSel = pick === hero.name;
              const p = pct(hero);
              return (
                <div className={"bcmp" + (heroSel ? " lead chosen" : "")}
                  style={{ cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 14, padding: "18px 20px" }}
                  onClick={() => setChosen(hero.name)}>
                  <span className={"bcmp-rank" + (heroSel ? " lead" : "")} style={{ flexShrink: 0, marginTop: 3 }}>♔</span>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                    <span className={"bcmp-name" + (heroSel ? " lead" : "")}>{hero.name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {hero.seed && <span style={{ fontSize: 12.5, fontFamily: "var(--mono)", color: "var(--accent)" }}>{hero.seed}</span>}
                      {hero.type && <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-2)", background: "var(--surface)", border: "1px solid var(--sep)", padding: "3px 8px", borderRadius: 6 }}>{hero.type}</span>}
                    </div>
                    {hero.rationale && <span style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.45 }}>{hero.rationale}</span>}
                    <Bar p={p} sel={heroSel} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, flexShrink: 0, width: 72, marginTop: 3 }}>
                    <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: heroSel ? "var(--accent)" : "var(--ink)", lineHeight: 1 }}>{p}%</span>
                    <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>Brief fit</span>
                  </div>
                </div>
              );
            })()}

            {/* Other contenders — fixed order, click to select, no reorder */}
            {rest.length > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                    Other contenders &middot; tap to compare
                  </span>
                  <div style={{ flex: 1, height: 1, background: "var(--sep)" }} />
                </div>
                <div className="bcmp-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {rest.map((idea) => {
                    const sel = pick === idea.name;
                    const p = pct(idea);
                    return (
                      <div key={idea.name} className={"bcmp" + (sel ? " lead chosen" : "")}
                        style={{ cursor: "pointer", padding: "14px 16px", display: "flex", flexDirection: "column", alignItems: "stretch", gap: 6 }}
                        onClick={() => setChosen(idea.name)}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                          <div style={{ minWidth: 0 }}>
                            <span style={{ fontSize: 17, fontWeight: 600, color: sel ? "var(--accent)" : "var(--ink)", letterSpacing: "-0.01em" }}>{idea.name}</span>
                            {idea.seed && <span style={{ fontSize: 11.5, color: "var(--accent)", marginLeft: 7 }}>{idea.seed}</span>}
                          </div>
                          <span style={{ fontSize: 15, fontWeight: 700, color: sel ? "var(--accent)" : "var(--ink)", flexShrink: 0 }}>{p}%</span>
                        </div>
                        {idea.rationale && <span style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.4 }}>{idea.rationale}</span>}
                        <Bar p={p} sel={sel} />
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Generate more — directly under the list of names, appends below */}
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 2 }}>
              <button className="bbtn ghost bgen-more" onClick={() => generate(true)} disabled={busy}
                style={busy ? { opacity: 0.6, cursor: "default" } : undefined}>
                {busy ? <><span className="bspin" style={{ width: 13, height: 13 }} /> Generating&hellip;</> : <>&#8635; Generate more</>}
              </button>
            </div>
          </>
        ) : null}

        {/* Saved exploration words — keep any verbatim as a name candidate */}
        {saved.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
              <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                From your exploration &middot; keep a word as-is
              </span>
              <div style={{ flex: 1, height: 1, background: "var(--sep)" }} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {saved.map((s) => {
                const kept = keptWords.includes(s.w);
                const sel = pick === s.w;
                if (genNames.has(s.w.toLowerCase())) return null;
                return (
                  <button key={s.w} onClick={() => toggleKept(s.w)}
                    style={{
                      padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontSize: 13.5, fontWeight: kept ? 600 : 400,
                      border: `1px solid ${sel ? "transparent" : kept ? "var(--accent)" : "var(--sep)"}`,
                      background: sel ? "var(--accent)" : kept ? "var(--accent-soft, #EEF3FF)" : "var(--surface-2)",
                      color: sel ? "var(--on-accent, #fff)" : kept ? "var(--accent)" : "var(--ink-2)",
                      display: "flex", alignItems: "center", gap: 6, transition: "all 0.12s",
                    }}>
                    <span style={{ fontSize: 10, opacity: 0.7 }}>&#9733;</span>
                    {s.w}
                    {kept && <span style={{ fontSize: 11, opacity: 0.7 }}>&middot; {sel ? "pick" : "kept"}</span>}
                  </button>
                );
              })}
            </div>
            {keptWords.length > 0 && (
              <p style={{ fontSize: 12, color: "var(--ink-3)", margin: "-4px 0 0", lineHeight: 1.5 }}>
                Kept words go through the same domain &amp; trademark scoring as generated names.
              </p>
            )}
          </>
        )}
      </div>
      <BFoot
        secondary="Vote" onSecondary={() => {
          const extra = keptWords.filter((w) => !genNames.has(w.toLowerCase()));
          onVote(pick, [...sorted.map((i) => i.name), ...extra]);
        }}
        next={pick ? "Check domains for " + pick + " →" : "Select a name first"} disabled={!pick}
        onNext={() => {
          const extra = keptWords.filter((w) => !genNames.has(w.toLowerCase()));
          onNext(pick, [...sorted.map((i) => i.name), ...extra]);
        }} />
    </>
  );
}

function dedupe(list: NameIdea[]): NameIdea[] {
  const seen = new Set<string>(); const out: NameIdea[] = [];
  for (const i of list) { const k = i.name.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(i); } }
  return out;
}
