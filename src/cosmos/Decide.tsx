// Step 10 · Decision. The signals sit in one table — SMILE, domain, trademark —
// and the founder makes the call. The chosen name gets the hero treatment and the
// "make it real" steps (register, buy the domain, brand book) update to match.
import { useEffect, useState } from "react";
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
  // Which available domains the founder has ticked to go register.
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => { if (!chosen && comp) setChosen(comp.recommended || comp.rows[0]?.name || ""); /* eslint-disable-next-line */ }, [comp]);

  const pick = rows.find((r) => r.name === chosen) || rows[0];
  const doms = pick ? availableDomains(pick.name, pick.domains, pick.suggested) : [];
  // Default-tick the top available domain whenever the chosen name changes.
  useEffect(() => { setPicked(doms[0] ? new Set([doms[0].domain]) : new Set()); /* eslint-disable-next-line */ }, [chosen, doms[0]?.domain]);

  if (!comp) return <Head eyebrow="The decision" title={<>Make the call.</>} />;

  const slug = slugify(pick?.name || "");
  const best = pick ? bestDomain(pick) : undefined;
  const buyList = doms.filter((d) => picked.has(d.domain)).map((d) => d.domain);
  const godaddy = `https://www.godaddy.com/domainsearch/bulk-domain-search?domainsToCheck=${(buyList.length ? buyList : [best?.domain || slug + ".com"]).join(",")}`;
  const inpi = "https://procedures.inpi.fr/?/";
  const toggle = (d: string) => setPicked((p) => { const n = new Set(p); n.has(d) ? n.delete(d) : n.add(d); return n; });

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
            <span style={{ fontSize: 13, color: "var(--ink-3)" }}>Trust the whole row, not one column. A strong name you can own beats a clever one you can't.</span>
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

          {/* Domain checklist — tick the ones to register, then grab them in one go. */}
          <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r2)", background: "var(--surface)", padding: "13px 16px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
              <span className="lbl" style={{ fontSize: 9.5 }}>01</span>
              <div style={{ fontFamily: "var(--serif)", fontSize: 17, letterSpacing: "-0.01em" }}>Grab the domains</div>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{picked.size} selected</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {doms.length === 0 && <span style={{ fontSize: 13, color: "var(--ink-4)" }}>Checking availability…</span>}
              {doms.map((d) => {
                const on = picked.has(d.domain);
                return (
                  <label key={d.domain} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px", cursor: "pointer" }}>
                    <span style={{ width: 17, height: 17, flex: "0 0 auto", borderRadius: 5, border: "1.5px solid " + (on ? "var(--ink)" : "var(--line)"), background: on ? "var(--ink)" : "transparent", display: "grid", placeItems: "center" }}>
                      {on && <span style={{ color: "var(--surface)", fontSize: 11, lineHeight: 1 }}>✓</span>}
                    </span>
                    <input type="checkbox" checked={on} onChange={() => toggle(d.domain)} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
                    <span style={{ fontFamily: "var(--serif)", fontSize: 16, flex: 1 }}>{d.domain}</span>
                    <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{d.price}{d.premium ? " · premium" : ""}</span>
                  </label>
                );
              })}
            </div>
            <a href={godaddy} target="_blank" rel="noreferrer"
              style={{ display: "flex", justifyContent: "center", marginTop: 10, padding: "9px 12px", borderRadius: "var(--rp)", background: "var(--ink)", color: "var(--bg)", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.06em", textDecoration: "none", ...(picked.size ? {} : { opacity: 0.45, pointerEvents: "none" }) }}>
              REGISTER {picked.size > 1 ? `${picked.size} DOMAINS` : "AT GODADDY"} →
            </a>
          </div>

          {[
            { n: "02", a: "Register the name", b: "Protect it at INPI 🇫🇷", c: "OPEN INPI →", href: inpi as string | undefined, onClick: undefined as (() => void) | undefined },
            { n: "03", a: "Brand book & logo", b: "Story, voice, type", c: "CREATE →", href: undefined, onClick: onBrandBook },
          ].map((s, i) => {
            const inner = (
              <>
                <span className="lbl" style={{ fontSize: 9.5, flex: "0 0 auto" }}>{s.n}</span>
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
