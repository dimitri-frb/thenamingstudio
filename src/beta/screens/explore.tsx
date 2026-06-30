// Beta exploration (05, design 1e) and name ideas (06, design 1j).
import { useEffect, useRef, useState } from "react";
import { naming, type Brief, type Concept, type NameIdea, type RelGroupData } from "../../lib/namingApi";
import { REL } from "../../cosmos/data";
import { type SavedIdea } from "../../cosmos/Shortlist";
import { type ExploreStore } from "../../cosmos/Explore";
import { Thinking } from "../../cosmos/chrome";
import { BHead, BFoot } from "../atoms";

const QUADS: { id: string; glyph: string; label: string }[] = [
  { id: "related", glyph: "≈", label: "Related" },
  { id: "metaphor", glyph: "✶", label: "Metaphor" },
  { id: "translation", glyph: "⇄", label: "Translation" },
  { id: "root", glyph: "⌂", label: "Root" },
];

// 05 — Exploration (design 1e): a concept banner over four word quadrants + a saved rail.
export function BetaExplore({ brief, concept, saved, setSaved, store, initial, onDone }: {
  brief: Brief; concept?: Concept; saved: SavedIdea[]; setSaved: React.Dispatch<React.SetStateAction<SavedIdea[]>>;
  store: ExploreStore; initial?: { focus: { word: string; def: string }; groups: RelGroupData[] }; onDone: () => void;
}) {
  const world = concept?.title || "your idea";
  const [groups, setGroups] = useState<RelGroupData[]>(initial?.groups ?? store.groups ?? []);
  const [busy, setBusy] = useState(!initial && !groups.length);
  const [focus, setFocus] = useState("");
  const did = useRef(false);

  useEffect(() => {
    if (did.current || initial || groups.length) return;
    did.current = true; setBusy(true);
    naming.relate(brief, "", world, []).then((r) => { setGroups(r.groups || []); store.groups = r.groups || []; })
      .catch(() => { /* leave empty */ }).finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSaved = (w: string) => saved.some((s) => s.w.toLowerCase() === w.toLowerCase());
  const toggle = (w: string) => setSaved((p) => isSaved(w) ? p.filter((s) => s.w.toLowerCase() !== w.toLowerCase()) : [...p, { w, concept: world }]);
  const explore = (w: string) => {
    setFocus(w); setBusy(true);
    naming.relate(brief, w, world, []).then((r) => { setGroups(r.groups || []); store.groups = r.groups || []; }).finally(() => setBusy(false));
  };
  const resetToWorld = () => {
    setFocus(""); setBusy(true);
    naming.relate(brief, "", world, []).then((r) => { setGroups(r.groups || []); store.groups = r.groups || []; }).finally(() => setBusy(false));
  };
  const wordsFor = (id: string) => groups.find((g) => g.rel === id)?.words || [];

  const fallback = "An AI naming studio that finds a brand name with a strategist's rigor, in minutes not months.";

  return (
    <>
      <div className="bbody" style={{ paddingBottom: 26 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-2)" }}>Your brief, turned into words.</span>
          <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>Click any word to explore its own world &middot; save the ones you like &rarr;</span>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="bconcept-banner">
              <div className="bconcept-row">
                <span className="bconcept-k">{focus ? "Exploring" : "Concept"}</span>
                <span className="bconcept-w">{focus || world}</span>
              </div>
              {focus
                ? <span className="bconcept-q" style={{ cursor: "pointer" }} onClick={resetToWorld}>&larr; back to {world}</span>
                : <span className="bconcept-q">&ldquo;{brief.does || fallback}&rdquo;</span>
              }
            </div>
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)", margin: 0 }}>
              Words in the world of <span style={{ color: "var(--ink-2)" }}>{focus || world}</span>
            </p>
            {busy && !groups.length ? (
              <Thinking lines={["Drawing the world of words…"]} />
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
          <div style={{ width: 208, flex: "0 0 auto" }}>
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
                {!saved.length && <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>Save words you like and they gather here.</span>}
              </div>
              <button className="bbtn" style={{ width: "100%", marginTop: 14, justifyContent: "center" }}
                disabled={!saved.length} onClick={onDone}>Shape into names &rarr;</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// 06 — Name ideas (design 1j): a grid of coined-name cards.
export function BetaNameIdeas({ brief, saved, shortlist, setShortlist, initialRows, onNext }: {
  brief: Brief; saved: SavedIdea[]; shortlist: string[]; setShortlist: React.Dispatch<React.SetStateAction<string[]>>;
  initialRows?: { seed: string; concept: string; ideas: NameIdea[] }[]; onNext: () => void;
}) {
  const seedIdeas = () => (initialRows || []).flatMap((r) => r.ideas);
  const [ideas, setIdeas] = useState<NameIdea[]>(seedIdeas());
  const [busy, setBusy] = useState(!ideas.length);
  const did = useRef(false);

  const generate = (more: boolean) => {
    setBusy(true);
    const words = saved.map((s) => s.w);
    naming.names(brief, { concepts: [], words } as any, more ? ideas.map((i) => i.name) : [])
      .then((res) => { setIdeas((p) => dedupe(more ? [...p, ...res] : res)); })
      .catch(() => { /* keep */ }).finally(() => setBusy(false));
  };
  useEffect(() => { if (did.current || ideas.length) return; did.current = true; generate(false); /* eslint-disable-next-line */ }, []);

  const pick = (name: string) => setShortlist((p) => p.includes(name) ? p.filter((n) => n !== name) : p.length >= 10 ? p : [...p, name]);
  const hear = (name: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(name);
    utt.rate = 0.85;
    const voices = window.speechSynthesis.getVoices();
    const feminine = voices.find((v) => /samantha|victoria|karen|allison|ava|nicky|zira|hazel|google uk english female|female/i.test(v.name))
      || voices.find((v) => v.lang.startsWith("en-") && /\bf\b|female|woman/i.test(v.name))
      || voices.find((v) => /samantha/i.test(v.name));
    if (feminine) utt.voice = feminine;
    window.speechSynthesis.speak(utt);
  };
  const sorted = [...ideas].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 10);

  return (
    <>
      <div className="bbody">
        <BHead eyebrow="The names" title={<>From saved words to real names.</>}
          sub="Ten candidates, built from the words you saved and shaped by your strategy. Shortlist the ones worth comparing." />
        {busy && !ideas.length ? (
          <Thinking lines={["Coining names from your words…"]} />
        ) : (
          <div className="bideas">
            {sorted.map((idea) => {
              const on = shortlist.includes(idea.name);
              return (
                <div key={idea.name} className={"bidea" + (on ? " on" : "")} style={{ cursor: "pointer" }} onClick={() => pick(idea.name)}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                    <span className="bidea-name">{idea.name}</span>
                    <span className="bidea-tag">{idea.type}</span>
                  </div>
                  {idea.seed && <span className="bidea-roots">{idea.seed}</span>}
                  <span className="bidea-why">{idea.rationale}</span>
                  <div className="bidea-foot">
                    <span style={{ fontSize: 12, color: "var(--accent)", cursor: "pointer", fontWeight: 500 }}
                      onClick={(e) => { e.stopPropagation(); hear(idea.name); }}>Hear it &#9658;</span>
                    <span className={"bword-save" + (on ? " on" : "")} onClick={(e) => { e.stopPropagation(); pick(idea.name); }}>{on ? "★ Shortlisted" : "+ Shortlist"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BFoot back="↻ Generate more" onBack={() => generate(true)} next="Compare top picks →"
        disabled={shortlist.length < 1} onNext={onNext} />
    </>
  );
}

// 06+07 — Names & Comparison (merged): one hero card for the top pick, 2-col grid for the rest.
export function BetaNamesCompare({ brief, saved, shortlist: _shortlist, setShortlist: _setShortlist, initialRows, onBack, onVote, onNext }: {
  brief: Brief; saved: SavedIdea[];
  shortlist: string[]; setShortlist: React.Dispatch<React.SetStateAction<string[]>>;
  initialRows?: { seed: string; concept: string; ideas: NameIdea[] }[];
  onBack: () => void; onVote: () => void; onNext: (name: string, allNames: string[]) => void;
}) {
  const seedIdeas = () => (initialRows || []).flatMap((r) => r.ideas);
  const [ideas, setIdeas] = useState<NameIdea[]>(seedIdeas());
  const [busy, setBusy] = useState(!ideas.length);
  const [chosen, setChosen] = useState("");
  const did = useRef(false);

  const generate = (more: boolean) => {
    setBusy(true);
    const words = saved.map((s) => s.w);
    naming.names(brief, { concepts: [], words } as any, more ? ideas.map((i) => i.name) : [])
      .then((res) => { setIdeas((p) => dedupe(more ? [...p, ...res] : res)); })
      .catch(() => { /* keep */ }).finally(() => setBusy(false));
  };
  useEffect(() => { if (did.current || ideas.length) return; did.current = true; generate(false); /* eslint-disable-next-line */ }, []);

  // Order NEVER changes: rank-1 stays at top, rest follows score order.
  const sorted = [...ideas].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 10);
  const hero = sorted[0];
  const rest = sorted.slice(1);
  // pick defaults to hero; clicking any card selects it without reordering.
  const pick = chosen || hero?.name || "";
  const pct = (idea: NameIdea) => Math.min(99, Math.max(40, Math.round(idea.score || 70)));

  const Bar = ({ p, sel }: { p: number; sel: boolean }) => (
    <div style={{ height: 3, borderRadius: 999, background: "var(--sep)", marginTop: 8 }}>
      <div style={{ height: "100%", width: p + "%", borderRadius: 999, background: sel ? "var(--accent)" : "var(--ink-3)", transition: "width 0.5s ease" }} />
    </div>
  );

  return (
    <>
      <div className="bbody">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <BHead eyebrow="Names &amp; Comparison" title={<>Every name, already scored.</>}
            sub="Built from your saved words and graded against the brief the moment they appear. Shortlist as you go." />
          {!busy && (
            <button className="bbtn ghost" onClick={() => generate(true)} style={{ flexShrink: 0, marginTop: 4 }}>
              &#8635; Generate more
            </button>
          )}
        </div>
        {brief.does && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 16px", borderRadius: 12, background: "var(--accent-soft, #EEF3FF)", border: "1px solid var(--accent)" }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", flex: "0 0 auto", paddingTop: 2 }}>Brief</span>
            <span style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5 }}>&ldquo;{brief.does}&rdquo;</span>
          </div>
        )}
        {busy && !ideas.length ? (
          <Thinking lines={["Coining names from your words…", "Grading against your brief…"]} />
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
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                      <span className={"bcmp-name" + (heroSel ? " lead" : "")}>{hero.name}</span>
                      {hero.seed && <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{hero.seed}</span>}
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
                    Other contenders &middot; pick one to compare
                  </span>
                  <div style={{ flex: 1, height: 1, background: "var(--sep)" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
                            {idea.seed && <span style={{ fontSize: 11.5, color: "var(--ink-3)", marginLeft: 7 }}>{idea.seed}</span>}
                          </div>
                          <span style={{ fontSize: 15, fontWeight: 700, color: sel ? "var(--accent)" : "var(--ink)", flexShrink: 0 }}>{p}%</span>
                        </div>
                        {idea.type && <span className="bidea-tag" style={{ fontSize: 10, padding: "2px 7px", width: "fit-content" }}>{idea.type}</span>}
                        {idea.rationale && <span style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.4 }}>{idea.rationale}</span>}
                        <Bar p={p} sel={sel} />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        ) : null}
      </div>
      <BFoot back="&larr; Exploration" onBack={onBack}
        secondary="Take it to a vote &rarr;" onSecondary={onVote}
        next={pick ? "Check domain names for " + pick + " →" : "Select a name first"} disabled={!pick}
        onNext={() => onNext(pick, sorted.map((i) => i.name))} />
    </>
  );
}

function dedupe(list: NameIdea[]): NameIdea[] {
  const seen = new Set<string>(); const out: NameIdea[] = [];
  for (const i of list) { const k = i.name.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(i); } }
  return out;
}
