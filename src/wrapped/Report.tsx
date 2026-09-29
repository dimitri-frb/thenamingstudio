// The naming report: 4 A4 pages built purely from a saved search (no model
// call): the brief wrapped, the shortlist with scores, and the decision.
// Printed via the same #bk-print rules as the brand book.
import type { SavedSearch } from "./api";
import { DEFAULT_PALETTE, toPalette } from "./logos";

const K = { fontSize: "8.5pt", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, opacity: 0.5 };
const H = { fontFamily: "var(--serif)", fontWeight: 500, letterSpacing: "-0.02em" };
const BODY = { fontSize: "10.5pt", lineHeight: 1.6 };

export function ReportPrint({ s }: { s: SavedSearch }) {
  const pal = toPalette(s.palette || null) || DEFAULT_PALETTE;
  const name = s.picked?.name || "Untitled";
  const date = new Date(s.updated || s.at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const grad = `linear-gradient(120deg, ${pal.dawn}, ${pal.haze} 50%, ${pal.nova})`;
  const foot = (n: number) => (
    <div className="bk-foot"><span>{name} · Naming report</span><span>Built by The Naming Studio · {n}</span></div>
  );
  return (
    <div id="bk-print" style={{ position: "absolute", left: -99999, top: 0 }}>
      {/* 1 · cover */}
      <div className="bk-page dark" style={{ background: pal.night }}>
        <div style={K}>Naming report · {date}</div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", gap: 18 }}>
          <div style={{ width: 110, height: 55, borderRadius: "110px 110px 0 0", background: grad }} />
          <div style={{ ...H, fontSize: "42pt", lineHeight: 1 }}>{name}</div>
          <p style={{ ...BODY, opacity: 0.8, maxWidth: "70%" }}>{s.sentence}</p>
          {s.concept?.concept && <div style={{ ...H, fontStyle: "italic", fontSize: "13pt", opacity: 0.85 }}>“{s.concept.concept}”</div>}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8pt", opacity: 0.55 }}>
          <span>{s.domain || ""}</span><span>Built by The Naming Studio</span>
        </div>
      </div>
      {/* 2 · the brief, wrapped */}
      <div className="bk-page">
        <div style={K}>01 · The brief, wrapped</div>
        <h2 style={{ ...H, fontSize: "24pt", margin: "16pt 0 12pt" }}>What you told us</h2>
        <p style={{ ...BODY, fontSize: "12pt" }}>“{s.sentence}”</p>
        {!!s.chips?.length && <p style={{ ...BODY, opacity: 0.6 }}>{s.chips.join(" · ")}</p>}
        {s.concept && (
          <>
            <div style={{ ...K, margin: "18pt 0 6pt" }}>What we heard</div>
            <p style={{ ...H, fontSize: "16pt", margin: "0 0 8pt" }}>Your name should feel like <i>{s.concept.concept}</i></p>
            <p style={BODY}>{s.concept.para}</p>
            <div style={{ ...K, margin: "18pt 0 8pt" }}>The inspirations</div>
            {s.concept.territories?.map((t) => (
              <div key={t.name} style={{ borderTop: "1px solid rgba(0,0,0,.12)", padding: "7pt 0", display: "flex", gap: "14pt" }}>
                <b style={{ ...H, flex: "0 0 90pt", fontSize: "12pt" }}>{t.name}</b>
                <span style={{ ...BODY, opacity: 0.7 }}>{t.desc}</span>
              </div>
            ))}
          </>
        )}
        {!!s.starred?.length && (
          <p style={{ ...BODY, marginTop: "auto", paddingBottom: "24pt", opacity: 0.7 }}>
            Starred words: {s.starred.map((w) => w.w).join(", ")}.
          </p>
        )}
        {foot(2)}
      </div>
      {/* 3 · the shortlist */}
      <div className="bk-page">
        <div style={K}>02 · The shortlist</div>
        <h2 style={{ ...H, fontSize: "24pt", margin: "16pt 0 14pt" }}>Every name, scored</h2>
        {(s.names || []).slice(0, 12).map((n) => (
          <div key={n.name} style={{ borderTop: "1px solid rgba(0,0,0,.12)", padding: "8pt 0", display: "flex", gap: "12pt", alignItems: "baseline" }}>
            <b style={{ ...H, flex: "0 0 92pt", fontSize: "14pt" }}>{n.name}</b>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: "7.5pt", opacity: 0.55 }}>{n.roots}</span>
              {n.tagline && <em style={{ ...H, display: "block", fontStyle: "italic", fontSize: "10pt", opacity: 0.8 }}>{n.tagline}</em>}
              {n.dom?.domain && <span style={{ fontFamily: "var(--mono)", fontSize: "7.5pt", opacity: 0.55 }}>{n.dom.domain} free</span>}
            </span>
            <span style={{ flex: "0 0 70pt", textAlign: "right" }}>
              <b style={{ fontSize: "12pt" }}>{n.score}</b><span style={{ fontSize: "8pt", opacity: 0.5 }}>/100</span>
              <span style={{ display: "block", height: 3, background: "rgba(0,0,0,.1)", borderRadius: 2, marginTop: 3 }}>
                <i style={{ display: "block", height: "100%", width: `${Math.min(100, n.score)}%`, background: "#1a1823", borderRadius: 2 }} />
              </span>
            </span>
          </div>
        ))}
        {foot(3)}
      </div>
      {/* 4 · the decision */}
      <div className="bk-page">
        <div style={K}>03 · The decision</div>
        <h2 style={{ ...H, fontSize: "24pt", margin: "16pt 0 10pt" }}>{name}, chosen {date}</h2>
        {s.picked?.tagline && <p style={{ ...H, fontStyle: "italic", fontSize: "14pt", margin: "0 0 12pt", opacity: 0.85 }}>{s.picked.tagline}</p>}
        {(s.picked?.parts || []).map((p) => (
          <div key={p.part} style={{ borderTop: "1px solid rgba(0,0,0,.12)", padding: "7pt 0", display: "flex", gap: "14pt" }}>
            <b style={{ ...H, fontStyle: "italic", flex: "0 0 90pt", fontSize: "12pt" }}>{p.part}</b>
            <span style={{ ...BODY, opacity: 0.75 }}>{p.note}</span>
          </div>
        ))}
        <div style={{ ...K, margin: "18pt 0 8pt" }}>Where it stands</div>
        {[
          ["Domain", s.domain ? `${s.domain} · registered` : s.steps?.domain === "skipped" ? "Skipped for now" : "Open"],
          ["Logo", s.logo ? `${s.logo.title} concept · pack exported` : "Open"],
          ["Brand book", s.steps?.book === "done" ? "Generated · 10 pages" : "Open"],
          ["Socials", s.steps?.socials === "done" ? "Set up" : "Open"],
        ].map(([k, v]) => (
          <div key={k as string} style={{ borderTop: "1px solid rgba(0,0,0,.12)", padding: "7pt 0", display: "flex", gap: "14pt" }}>
            <b style={{ ...K, flex: "0 0 90pt", opacity: 0.45 }}>{k}</b>
            <span style={BODY}>{v}</span>
          </div>
        ))}
        <p style={{ ...BODY, marginTop: "auto", paddingBottom: "24pt", opacity: 0.6 }}>
          Everything in this report was generated from your brief in one session at The Naming Studio.
        </p>
        {foot(4)}
      </div>
    </div>
  );
}
