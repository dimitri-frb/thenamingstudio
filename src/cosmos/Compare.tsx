// Step 8 · Comparison — the shortlist side by side in one table: meaning, three
// genuinely-available domains (real, via RDAP) with prices, INPI trademark,
// handle, and a SMILE score. Every name leaves with domains it can register.
import { useEffect, useState } from "react";
import { naming, type Brief, type Comparison, type CompareRow } from "../lib/namingApi";
import { Dots, Foot, Head, Star, Thinking } from "./chrome";
import { availableDomains } from "./data";

function smileOf(r: CompareRow) { return Math.max(1, Math.min(5, Math.round((r.intuitive + r.visual + r.sound + r.emotional) / 4))); }
function verdictOf(r: CompareRow) { const t = r.intuitive + r.visual + r.sound + r.emotional; return t >= 20 ? "Strong" : t >= 15 ? "Solid" : "Risky"; }

export function Compare({ brief, shortlist, comp, setComp, onBack, onDone }: {
  brief: Brief; shortlist: string[]; comp: Comparison | null;
  setComp: (c: Comparison) => void; onBack: () => void; onDone: () => void;
}) {
  const [sortSmile, setSortSmile] = useState(false);

  useEffect(() => {
    if (comp) return;
    let live = true;
    const names = shortlist.map((name) => ({ name, type: "", rationale: "", score: 0 }));
    naming.compare(brief, names).then((c) => { if (live) setComp(c); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                <th style={{ width: "13%" }}>Name</th>
                <th style={{ width: "24%" }}>Why it works</th>
                <th style={{ width: "26%" }}>Available domains</th>
                <th>Trademark · INPI</th>
                <th>Handle</th>
                <th>SMILE</th>
                <th>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => {
                const verdict = verdictOf(n);
                const win = n.name === comp.recommended;
                const domains = availableDomains(n.name, n.domains, n.suggested);
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
                        {domains.length === 0 && <span className="meta">checking…</span>}
                        {domains.map((d) => (
                          <span key={d.domain} style={{ display: "flex", alignItems: "baseline", gap: 8, whiteSpace: "nowrap" }}>
                            <span style={{ color: "var(--good)", fontSize: 12, flex: "0 0 auto" }}>✓</span>
                            <span style={{ fontFamily: "var(--serif)", fontSize: 15 }}>{d.domain}</span>
                            <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{d.price}{d.premium ? " · premium" : ""}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="c"><span className={"tag " + (n.inpi ? "good" : "watch")}>{n.inpi ? "Clear" : "Check"}</span></td>
                    <td className="c"><span className={"tag " + (n.instagram ? "good" : "bad")}>{n.instagram ? "free" : "taken"}</span></td>
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

      <Foot back="Name ideas" onBack={onBack} next="Get a gut-check →" onNext={onDone} />
    </>
  );
}

function HeadC() {
  return (
    <Head eyebrow="The comparison" title={<>Your shortlist, <em>side by side</em>.</>}
      sub="Meaning, three available domains (with price), French trademark (INPI), handle, and SMILE — in one table. We always surface domains you can register, tweaking the name where the plain .com is gone." />
  );
}
