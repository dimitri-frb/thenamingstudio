// Step 10 · Decision. The signals sit in one table — SMILE, domain, trademark —
// and the founder makes the call. The chosen name gets the hero treatment and the
// "make it real" steps (register, buy the domain, brand book) update to match.
import { useEffect } from "react";
import type { Comparison, CompareRow } from "../lib/namingApi";
import { Dots, Foot, Head } from "./chrome";
import { availableDomains, slugify } from "./data";

function smileOf(r: CompareRow) { return Math.max(1, Math.min(5, Math.round((r.intuitive + r.visual + r.sound + r.emotional) / 4))); }
function verdictOf(r: CompareRow) { const t = r.intuitive + r.visual + r.sound + r.emotional; return t >= 20 ? "Strong" : t >= 15 ? "Solid" : "Risky"; }
// The single best domain that is actually available for this name.
const bestDomain = (r: CompareRow) => availableDomains(r.name, r.domains, r.suggested)[0];

export function Decide({ comp, chosen, setChosen, onBack, onBrandBook }: {
  comp: Comparison | null; chosen: string; setChosen: (n: string) => void;
  onBack: () => void; onBrandBook: () => void;
}) {
  const rows = comp ? [...comp.rows].sort((a, b) => smileOf(b) - smileOf(a)) : [];

  useEffect(() => { if (!chosen && comp) setChosen(comp.recommended || comp.rows[0]?.name || ""); /* eslint-disable-next-line */ }, [comp]);

  if (!comp) return <Head eyebrow="The decision" title={<>Make the call.</>} />;

  const pick = rows.find((r) => r.name === chosen) || rows[0];
  const slug = slugify(pick?.name || "");
  const best = pick ? bestDomain(pick) : undefined;
  const godaddy = `https://www.godaddy.com/domainsearch/find?domainToCheck=${best?.domain || slug + ".com"}`;
  const inpi = "https://procedures.inpi.fr/?/";

  return (
    <>
      <Head eyebrow="The decision" title={<>The signals are in. <em>You make the call.</em></>}
        sub="SMILE, domain and trademark sit side by side as the case for each name. Pick the row that's right; the next steps update to match." />
      <div className="decide-cols">
        <div className="table-wrap">
          <div className="table-scroll">
            <table className="cmp">
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th>Name</th>
                  <th>SMILE</th>
                  <th>Domain</th>
                  <th>INPI</th>
                  <th>Verdict</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((n) => {
                  const isChosen = n.name === chosen;
                  const v = verdictOf(n);
                  return (
                    <tr key={n.name} className={isChosen ? "win" : ""} style={{ cursor: "pointer" }} onClick={() => setChosen(n.name)}>
                      <td className="c">
                        <span style={{ width: 18, height: 18, borderRadius: "50%", border: "1.5px solid " + (isChosen ? "var(--ink)" : "var(--line)"), background: isChosen ? "var(--ink)" : "transparent", display: "inline-grid", placeItems: "center" }}>
                          {isChosen && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--surface)" }} />}
                        </span>
                      </td>
                      <td><span className="nm" style={{ fontSize: 21 }}>{n.name}</span></td>
                      <td className="c"><Dots score={smileOf(n)} /></td>
                      <td className="c">{(() => { const d = bestDomain(n); return d
                        ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}><span style={{ color: "var(--good)", fontSize: 12 }}>✓</span><span style={{ fontFamily: "var(--serif)", fontSize: 15 }}>{d.domain}</span></span>
                        : <span style={{ color: "var(--ink-4)" }}>—</span>; })()}</td>
                      <td className="c"><span className={"tag " + (n.inpi ? "good" : "watch")}>{n.inpi ? "Clear" : "Check"}</span></td>
                      <td className="c"><span className={"tag " + (v === "Strong" ? "fill" : v === "Solid" ? "" : "bad")}>{v}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "11px 16px", borderTop: "1px solid var(--line-2)", background: "var(--surface-2)", display: "flex", alignItems: "center", gap: 10 }}>
            <span className="lbl">Note</span>
            <span style={{ fontSize: 13, color: "var(--ink-3)" }}>Trust the whole row, not one column — a strong name you can own beats a clever one you can't.</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
          <div style={{ border: "1px solid var(--ink)", borderRadius: "var(--r3)", background: "var(--surface)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="lbl">Your choice</span>
            <div style={{ fontFamily: "var(--serif)", fontSize: 60, lineHeight: 0.92, letterSpacing: "-0.025em" }}>{pick?.name}</div>
            {pick && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className="tag good">SMILE {smileOf(pick)}</span>
                {best && <span className="tag good" style={{ textTransform: "none" }}>{best.domain} · {best.price}</span>}
                <span className={"tag " + (pick.inpi ? "good" : "watch")}>INPI {pick.inpi ? "clear" : "check"}</span>
              </div>
            )}
          </div>
          <span className="lbl">Make it real</span>
          {[
            { a: "Register the name", b: "Protect it at INPI 🇫🇷", c: "OPEN INPI →", href: inpi },
            { a: "Buy the domain", b: best?.domain || `${slug}.com`, c: "GODADDY →", href: godaddy },
            { a: "Brand book & logo", b: "Story, voice, type", c: "CREATE →", onClick: onBrandBook },
          ].map((s, i) => {
            const inner = (
              <>
                <span className="lbl" style={{ fontSize: 9.5, flex: "0 0 auto" }}>{String(i + 1).padStart(2, "0")}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--serif)", fontSize: 17, letterSpacing: "-0.01em" }}>{s.a}</div>
                  <p style={{ fontSize: 12, color: "var(--ink-3)", margin: 0 }}>{s.b}</p>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", color: "var(--ink-2)", flex: "0 0 auto" }}>{s.c}</span>
              </>
            );
            const style = { display: "flex", alignItems: "center", gap: 14, border: "1px solid var(--line)", borderRadius: "var(--r2)", background: "var(--surface)", padding: "13px 16px", cursor: "pointer", textDecoration: "none", color: "inherit" } as const;
            return s.href
              ? <a key={i} href={s.href} target="_blank" rel="noreferrer" style={style}>{inner}</a>
              : <div key={i} style={style} onClick={s.onClick}>{inner}</div>;
          })}
        </div>
      </div>
      <Foot back="Share & vote" onBack={onBack} next={<>Lock in {pick?.name} ✓</>} onNext={onBrandBook} />
    </>
  );
}
