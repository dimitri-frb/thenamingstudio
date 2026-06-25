// Step 8 · Comparison — the shortlist side by side in one table: meaning, three
// genuinely-available domains (real, via RDAP) with prices, name tests, and a
// SMILE score. Every name leaves with domains it can register.
import { useEffect, useState } from "react";
import { naming, fetchDomains, type Brief, type Comparison, type CompareRow, type DomainHit, type SuggestedDomain } from "../lib/namingApi";
import { Head, Star, Thinking, Info } from "./chrome";

// A lively SMILE score: coloured pips (green/amber by strength) plus the number,
// far friendlier than flat black dots.
function SmileScore({ score }: { score: number }) {
  const color = score >= 4 ? "var(--good)" : score >= 3 ? "var(--watch)" : "var(--bad)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      <span style={{ display: "inline-flex", gap: 3 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: i < score ? color : "var(--line)", transition: "background .2s ease" }} />
        ))}
      </span>
      <span style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 500, color }}>{score}</span>
    </span>
  );
}
import { availableDomains, nameTests, slugify, comTaken, godaddyUrl } from "./data";

type Dom = { domains: DomainHit[]; suggested: SuggestedDomain[] };

function smileOf(r: CompareRow) { return Math.max(1, Math.min(5, Math.round((r.intuitive + r.visual + r.sound + r.emotional) / 4))); }
function verdictOf(r: CompareRow) { const t = r.intuitive + r.visual + r.sound + r.emotional; return t >= 20 ? "Perfect" : t >= 16 ? "Great" : "Solid"; }
const verdictClass = (v: string) => (v === "Perfect" ? "fill" : v === "Great" ? "good" : "");

export function Compare({ brief, shortlist, comp, setComp, onBack, onDone, onLockIn }: {
  brief: Brief; shortlist: string[]; comp: Comparison | null;
  setComp: (c: Comparison) => void; onBack: () => void; onDone: () => void; onLockIn: () => void;
}) {
  const [sortSmile, setSortSmile] = useState(false);
  // The founder's pick (starred). Defaults to our recommendation; click any name to change it.
  const [starred, setStarred] = useState("");
  // Real domain availability, fetched per-name in parallel so the scored table
  // appears instantly and domains fill in as they land.
  const [dom, setDom] = useState<Record<string, Dom>>({});

  useEffect(() => {
    if (comp) return;
    let live = true;
    const names = shortlist.map((name) => ({ name, type: "", rationale: "", score: 0 }));
    naming.compare(brief, names).then((c) => { if (live) setComp(c); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch real domains for every name (each its own fast request), then persist
  // them back into comp so the Decision and Share screens have them too.
  useEffect(() => {
    if (!comp) return;
    let live = true;
    const todo = comp.rows.map((r) => r.name).filter((n) => !(n in dom));
    if (!todo.length) return;
    todo.forEach(async (name) => {
      const res = await fetchDomains(name);
      if (live) setDom((prev) => ({ ...prev, [name]: res }));
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comp]);

  useEffect(() => {
    if (!comp || !comp.rows.length) return;
    if (!comp.rows.every((r) => dom[r.name])) return;
    if (!comp.rows.some((r) => !r.suggested && dom[r.name]?.suggested)) return;
    setComp({ ...comp, rows: comp.rows.map((r) => ({ ...r, domains: dom[r.name]?.domains ?? r.domains, suggested: dom[r.name]?.suggested ?? r.suggested })) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dom, comp]);

  if (!comp) return (
    <>
      <HeadC />
      <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
        <Thinking lines={["Scoring each name and hunting available domains…", "SMILE · domains · handle"]} />
      </div>
    </>
  );

  const star = starred || comp.recommended || comp.rows[0]?.name || "";
  // Starring a name makes it the founder's pick everywhere downstream (lock-in, decision).
  const chooseStar = (name: string) => { setStarred(name); setComp({ ...comp, recommended: name }); };
  let rows = [...comp.rows];
  if (sortSmile) rows.sort((a, b) => smileOf(b) - smileOf(a));
  // The founder's starred pick always sits at the top (stable for the rest).
  rows.sort((a, b) => (a.name === star ? -1 : b.name === star ? 1 : 0));

  return (
    <>
      <HeadC />
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span className="lbl">Each name shows three domains you can actually register today</span>
        <span style={{ flex: 1 }} />
        <button className="btn" style={{ fontSize: 13 }} onClick={() => setSortSmile((s) => !s)}>Sort by SMILE {sortSmile ? "↓" : "·"}</button>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table className="cmp">
            <thead>
              <tr>
                <th style={{ width: "12%" }}>Name</th>
                <th style={{ width: "19%" }}>Why it works</th>
                <th style={{ width: "24%" }}>Available domains</th>
                <th style={{ width: "14%" }}>Name tests</th>
                <th><span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>SMILE <Info align="right">A quick brand-name score out of 5: <b>S</b>uggestive, <b>M</b>emorable, <b>I</b>magery, <b>L</b>egs, <b>E</b>motional.</Info></span></th>
                <th>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => {
                const verdict = verdictOf(n);
                const win = n.name === star;
                const dinfo = dom[n.name];
                const domains = dinfo ? availableDomains(n.name, dinfo.domains, dinfo.suggested) : [];
                return (
                  <tr key={n.name} className={win ? "win" : ""}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                        onClick={() => chooseStar(n.name)} title="Make this your pick">
                        <span className="nm">{n.name}</span>
                        <Star on={win} onClick={(e) => { e.stopPropagation(); chooseStar(n.name); }} />
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.4 }}>{n.verdict}</td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {!dinfo && <span className="meta">checking…</span>}
                        {dinfo && domains.length === 0 && (
                          comTaken(dinfo.domains) === true
                            ? <a href={godaddyUrl(`${slugify(n.name)}.com`)} target="_blank" rel="noreferrer" className="meta" style={{ textDecoration: "none", whiteSpace: "nowrap" }} title="Registered, but may be for sale on the aftermarket">.com registered · may be for sale →</a>
                            : <span className="meta">none free</span>
                        )}
                        {domains.map((d) => (
                          <span key={d.domain} style={{ display: "flex", alignItems: "baseline", gap: 8, whiteSpace: "nowrap" }}>
                            <span style={{ color: "var(--good)", fontSize: 12, flex: "0 0 auto" }}>✓</span>
                            <span style={{ fontFamily: "var(--serif)", fontSize: 15 }}>{d.domain}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {(() => { const t = nameTests(n.name); return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          {([["Bar test", t.bar], ["Pronounce", t.pronounce], ["Spell", t.spell], ["Short", t.short]] as const).map(([label, ok]) => (
                            <span key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--ink-2)", whiteSpace: "nowrap" }}>
                              <span style={{ color: ok ? "var(--good)" : "var(--bad)", fontSize: 12, flex: "0 0 auto", width: 11, textAlign: "center" }}>{ok ? "✓" : "✗"}</span>
                              {label}
                            </span>
                          ))}
                        </div>
                      ); })()}
                    </td>
                    <td className="c"><SmileScore score={smileOf(n)} /></td>
                    <td className="c"><span className={"tag " + verdictClass(verdict)}>{verdict}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--line-2)", display: "flex", alignItems: "center", gap: 14, background: "var(--surface-2)" }}>
          <span className="lbl" style={{ flex: "0 0 auto" }}>Our take</span>
          <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 16, color: "var(--ink-2)" }}>{comp.why}</span>
        </div>
      </div>

      <div className="cx-foot">
        <span className="link" onClick={onBack}>← Name ideas</span>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button className="btn" onClick={onLockIn}>Lock in my selection →</button>
          <button className="btn lg solid" onClick={onDone}>Get a gut check →</button>
        </div>
      </div>
    </>
  );
}

function HeadC() {
  return (
    <Head eyebrow="The comparison" title={<>Your shortlist, <em>side by side</em>.</>}
      sub="We analyse each name for you: domain availability and a SMILE score, all in one table. Where the plain domain is gone, we surface close ones you can still claim." />
  );
}
