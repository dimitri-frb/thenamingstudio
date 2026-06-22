// Step 8 · Comparison — the shortlist side by side in one table: meaning, three
// genuinely-available domains (real, via RDAP) with prices, INPI trademark,
// handle, and a SMILE score. Every name leaves with domains it can register.
import { useEffect, useState } from "react";
import { naming, fetchDomains, fetchInpi, type Brief, type Comparison, type CompareRow, type DomainHit, type SuggestedDomain, type InpiResult } from "../lib/namingApi";
import { Dots, Head, Star, Thinking } from "./chrome";
import { availableDomains, handleOptions, nameTests } from "./data";

type Dom = { domains: DomainHit[]; suggested: SuggestedDomain[] };

function smileOf(r: CompareRow) { return Math.max(1, Math.min(5, Math.round((r.intuitive + r.visual + r.sound + r.emotional) / 4))); }
function verdictOf(r: CompareRow) { const t = r.intuitive + r.visual + r.sound + r.emotional; return t >= 20 ? "Strong" : t >= 15 ? "Solid" : "Risky"; }

export function Compare({ brief, shortlist, comp, setComp, onBack, onDone, onLockIn }: {
  brief: Brief; shortlist: string[]; comp: Comparison | null;
  setComp: (c: Comparison) => void; onBack: () => void; onDone: () => void; onLockIn: () => void;
}) {
  const [sortSmile, setSortSmile] = useState(false);
  // Real domain availability, fetched per-name in parallel so the scored table
  // appears instantly and domains fill in as they land.
  const [dom, setDom] = useState<Record<string, Dom>>({});
  // Real INPI trademark verdicts per name (class-aware), filled in as they land.
  const [inpi, setInpi] = useState<Record<string, InpiResult>>({});

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

  // Real INPI trademark check per name, filtered to the brand's Nice classes.
  useEffect(() => {
    if (!comp) return;
    let live = true;
    const classes = comp.niceClasses || [];
    comp.rows.map((r) => r.name).filter((n) => !(n in inpi)).forEach(async (name) => {
      const res = await fetchInpi(name, classes);
      if (live) setInpi((prev) => ({ ...prev, [name]: res }));
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
        <Thinking lines={["Scoring each name and hunting available domains…", "SMILE · domains · INPI · handle"]} />
      </div>
    </>
  );

  let rows = [...comp.rows];
  if (sortSmile) rows.sort((a, b) => smileOf(b) - smileOf(a));

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
                <th style={{ width: "20%" }}>Available domains</th>
                <th>Trademark · INPI</th>
                <th style={{ width: "13%" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><InstagramGlyph size={12} /> Instagram</span></th>
                <th style={{ width: "12%" }}>Name tests</th>
                <th>SMILE</th>
                <th>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => {
                const verdict = verdictOf(n);
                const win = n.name === comp.recommended;
                const dinfo = dom[n.name];
                const domains = dinfo ? availableDomains(n.name, dinfo.domains, dinfo.suggested) : [];
                return (
                  <tr key={n.name} className={win ? "win" : ""}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="nm">{n.name}</span>{win && <Star on />}
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.4 }}>{n.verdict}</td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {!dinfo && <span className="meta">checking…</span>}
                        {dinfo && domains.length === 0 && <span className="meta">none found</span>}
                        {domains.map((d) => (
                          <span key={d.domain} style={{ display: "flex", alignItems: "baseline", gap: 8, whiteSpace: "nowrap" }}>
                            <span style={{ color: "var(--good)", fontSize: 12, flex: "0 0 auto" }}>✓</span>
                            <span style={{ fontFamily: "var(--serif)", fontSize: 15 }}>{d.domain}</span>
                            <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{d.price}{d.premium ? " · premium" : ""}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="c">{(() => {
                      const ip = inpi[n.name];
                      if (ip?.ok && ip.verdict !== "unknown") {
                        const cl = ip.hits[0]?.classes?.[0];
                        if (ip.verdict === "conflict") return <span className="tag bad" title={`Live mark "${ip.hits[0]?.name}" in class ${ip.hits.flatMap((h) => h.classes).join(", ")}`}>Taken{cl ? ` · cl.${cl}` : ""}</span>;
                        if (ip.verdict === "adjacent") return <span className="tag good" title={`Exists, but only in other classes (${ip.hits.flatMap((h) => h.classes).join(", ")})`}>Clear here</span>;
                        return <span className="tag good" title="No conflicting mark found in your class (INPI)">Clear</span>;
                      }
                      return <span className={"tag " + (n.inpi ? "good" : "watch")} title="Heuristic estimate (INPI check unavailable)">{n.inpi ? "Clear?" : "Check"}</span>;
                    })()}</td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {handleOptions(n.name, domains).map((h) => (
                          <a key={h} href={`https://instagram.com/${h.slice(1)}`} target="_blank" rel="noreferrer"
                            title={`Check ${h} on Instagram`}
                            style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink-2)", textDecoration: "none", whiteSpace: "nowrap" }}>
                            <span style={{ color: "var(--ink-3)", display: "inline-flex", flex: "0 0 auto" }}><InstagramGlyph size={13} /></span>
                            <span style={{ fontFamily: "var(--serif)", fontSize: 14 }}>{h}</span>
                          </a>
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
                    <td className="c"><Dots score={smileOf(n)} /></td>
                    <td className="c"><span className={"tag " + (verdict === "Strong" ? "fill" : verdict === "Solid" ? "" : "bad")}>{verdict}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--line-2)", display: "flex", alignItems: "center", gap: 14, background: "var(--surface-2)" }}>
          <span className="lbl">SMILE</span>
          <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
            <b style={{ color: "var(--ink-2)" }}>S</b>uggestive · <b style={{ color: "var(--ink-2)" }}>M</b>emorable · <b style={{ color: "var(--ink-2)" }}>I</b>magery · <b style={{ color: "var(--ink-2)" }}>L</b>egs · <b style={{ color: "var(--ink-2)" }}>E</b>motional
          </span>
          <span style={{ flex: 1 }} />
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
      sub="We analyse each name for you: domain availability, French trademark (INPI), Instagram handles, and a SMILE score, all in one table. Where the plain domain is gone, we surface close ones you can still claim." />
  );
}

function InstagramGlyph({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
