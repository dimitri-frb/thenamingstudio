// Internal request log (/admin). Styled to match the beta flow design system.
import { useCallback, useEffect, useMemo, useState } from "react";
import { getRequests, type ReqLog } from "../lib/requestLog";
import "../cosmos/cosmos.css";
import "../cosmos/beta.css";

const WORKER = (import.meta.env.VITE_NAMING_API || "").replace(/\/$/, "");
const KEY_STORE = "ns.admin.key";

function fmtTime(t: number) {
  const d = new Date(t);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function procInfo(entries: ReqLog[]) {
  const brief: any = Object.assign({}, ...entries.map((e) => e.input?.brief).filter(Boolean));
  const does = brief.does || "(no brief captured)";
  const cmp = [...entries].reverse().find((e) => e.phase === "compare");
  const selected: string[] = (cmp?.input?.payload?.names || []).map((n: any) => n?.name || n).filter(Boolean);
  const recommended = cmp?.output?.recommended || "";
  const leads = entries.filter((e) => e.phase === "lead").map((e) => e.input?.payload || {});
  const email = leads.map((p: any) => p.email).find(Boolean) || "";
  const fromName = leads.map((p: any) => p.fromName).find(Boolean) || "";
  const chosen = entries.find((e) => e.phase === "decision")?.input?.payload?.name
    || leads.map((p: any) => p.name).find(Boolean)
    || entries.find((e) => e.phase === "brandbook")?.input?.payload?.name || "";
  const feedback = [...entries].reverse().find((e) => e.phase === "feedback")?.input?.payload || null;
  const sat = [...entries].reverse().find((e) => e.phase === "satisfaction")?.input?.payload || null;
  const started = Math.min(...entries.map((e) => e.at));
  return { brief, does, selected, recommended, email, fromName, chosen, feedback, sat, started };
}

// ─── colour helpers ───────────────────────────────────────────────────────────
const SAT_COLOR = (s: number) =>
  s <= 3 ? "var(--bad)" : s <= 5 ? "#b07a12" : "var(--good)";

function SatBadge({ score, large }: { score: number; large?: boolean }) {
  const c = SAT_COLOR(score);
  return (
    <span style={{
      fontVariantNumeric: "tabular-nums", fontWeight: 700, lineHeight: 1,
      fontSize: large ? 17 : 11.5, color: c,
      background: "color-mix(in srgb, currentColor 10%, transparent)",
      padding: large ? "4px 10px" : "2px 7px", borderRadius: 999,
      letterSpacing: "0.01em",
    }}>{score}<span style={{ fontWeight: 400, opacity: 0.6, fontSize: large ? 12 : 9 }}>/10</span></span>
  );
}

// ─── shared primitives ────────────────────────────────────────────────────────
function Kv({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 6, fontSize: 12.5, lineHeight: 1.5 }}>
      <span style={{ flex: "0 0 110px", color: "var(--ink-3)", paddingTop: 1 }}>{k}</span>
      <span style={{ flex: 1, color: "var(--ink)" }}>{v}</span>
    </div>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 12.5, fontWeight: 500, padding: "6px 14px", borderRadius: 999, cursor: "pointer",
      border: `1px solid ${active ? "var(--accent)" : "var(--sep)"}`,
      background: active ? "var(--accent-soft)" : "transparent",
      color: active ? "var(--accent)" : "var(--ink-3)",
      transition: "all .12s",
    }}>{label}</button>
  );
}

function GhostBtn({ onClick, children, href }: { onClick?: () => void; children: React.ReactNode; href?: string }) {
  const s: React.CSSProperties = {
    fontSize: 12.5, fontWeight: 500, padding: "7px 14px", borderRadius: 10, cursor: "pointer",
    border: "1px solid var(--sep)", background: "var(--surface-2)", color: "var(--ink-2)",
    textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5,
    transition: "background .12s",
  };
  if (href) return <a href={href} target="_blank" rel="noreferrer" style={s}>{children}</a>;
  return <button onClick={onClick} style={s}>{children}</button>;
}

// ─── main page ────────────────────────────────────────────────────────────────
export function AdminPage({ onExit }: { onExit: () => void }) {
  const [mode, setMode] = useState<"central" | "local">(WORKER ? "central" : "local");
  const [items, setItems] = useState<ReqLog[]>([]);
  const [adminKey, setAdminKey] = useState<string>(() => { try { return localStorage.getItem(KEY_STORE) || ""; } catch { return ""; } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    if (mode === "local") { setItems(getRequests()); return; }
    if (!WORKER) { setError("No Worker endpoint in this build — central log is only available on the deployed site."); setItems([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${WORKER}/?log=1&limit=300${adminKey ? `&key=${encodeURIComponent(adminKey)}` : ""}`);
      if (res.status === 401) throw new Error("Unauthorized — check the admin key.");
      if (!res.ok) throw new Error(`Server returned ${res.status}.`);
      const data = await res.json();
      setItems(data.items || []);
      if (data.note) setError(data.note);
    } catch (e: any) { setError(e?.message || String(e)); setItems([]); }
    finally { setLoading(false); }
  }, [mode, adminKey]);

  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, ReqLog[]>();
    for (const e of items) { const k = e.process || e.id; const a = map.get(k) || []; a.push(e); map.set(k, a); }
    const arr = [...map.values()].map((es) => [...es].sort((a, b) => a.at - b.at));
    arr.sort((a, b) => Math.max(...b.map((e) => e.at)) - Math.max(...a.map((e) => e.at)));
    return arr;
  }, [items]);

  return (
    <div className="cx skin-beta" style={{ display: "block", minHeight: "100vh", height: "auto", overflow: "auto", background: "var(--bg)" }}>

      {/* ── top bar ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        height: 52, display: "flex", alignItems: "center", gap: 14, padding: "0 22px",
        background: "var(--glass)", backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        borderBottom: "1px solid var(--sep2)",
      }}>
        {/* brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 24, height: 24, borderRadius: 7, background: "var(--accent)", color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M12 4.5v15M5.5 8.25l13 7.5M18.5 8.25l-13 7.5" />
            </svg>
          </span>
          <span style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)" }}>the naming studio</span>
        </div>
        <div style={{ flex: 1 }} />
        {/* internal badge */}
        <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--bad)" }}>● Internal</span>
        {/* actions */}
        <div style={{ display: "flex", gap: 6 }}>
          <GhostBtn href={`${import.meta.env.BASE_URL || "/"}?test`}>↗ Classic</GhostBtn>
          <GhostBtn href={`${import.meta.env.BASE_URL || "/"}?test&beta`}>↗ Beta</GhostBtn>
          <GhostBtn onClick={load}>↻{loading ? " …" : ""}</GhostBtn>
          <GhostBtn onClick={onExit}>← Studio</GhostBtn>
        </div>
      </div>

      {/* ── content ── */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* heading */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)", margin: "0 0 4px" }}>Processes</h1>
          <p style={{ fontSize: 13, color: "var(--ink-3)", margin: 0 }}>
            {loading ? "Loading…" : `${groups.length} process${groups.length === 1 ? "" : "es"}`}
            {" · "}{mode === "central" ? "central (all users)" : "this browser"}
          </p>
        </div>

        {/* source toggle + key */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <Chip active={mode === "central"} onClick={() => setMode("central")} label="Central (everyone)" />
          <Chip active={mode === "local"} onClick={() => setMode("local")} label="This browser" />
          {mode === "central" && (
            <input type="password" placeholder="Admin key" value={adminKey}
              onChange={(e) => { setAdminKey(e.target.value); try { localStorage.setItem(KEY_STORE, e.target.value); } catch { /* ignore */ } }}
              style={{ fontSize: 13, padding: "6px 12px", borderRadius: 10, border: "1px solid var(--sep)", background: "var(--surface-2)", color: "var(--ink)", outline: "none", minWidth: 160, fontFamily: "var(--mono)" }} />
          )}
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: "11px 16px", borderRadius: 12, border: "1px solid var(--bad)", color: "var(--bad)", fontSize: 13, background: "color-mix(in srgb, var(--bad) 6%, transparent)" }}>
            {error}
          </div>
        )}

        {/* process list */}
        <div style={{ border: "1px solid var(--sep)", borderRadius: 16, background: "var(--surface)", overflow: "hidden" }}>
          {groups.length === 0 ? (
            <div style={{ padding: "56px 24px", textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "var(--ink-3)", margin: 0 }}>No processes yet — run a flow and they'll appear here.</p>
            </div>
          ) : (
            groups.map((entries) => <ProcessRow key={entries[0].process || entries[0].id} entries={entries} />)
          )}
        </div>
      </div>
    </div>
  );
}

// ─── process row ─────────────────────────────────────────────────────────────
function ProcessRow({ entries }: { entries: ReqLog[] }) {
  const [open, setOpen] = useState(false);
  const i = procInfo(entries);

  return (
    <div style={{ borderBottom: "1px solid var(--sep2)" }}>
      {/* collapsed row */}
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
        background: open ? "var(--surface-2)" : "transparent",
        border: "none", cursor: "pointer", textAlign: "left", color: "inherit",
        transition: "background .12s",
      }}>
        {/* timestamp */}
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-4)", flex: "0 0 104px", letterSpacing: "0.01em" }}>
          {fmtTime(i.started)}
        </span>

        {/* main text */}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            {i.chosen ? (
              <>
                {i.chosen}
                <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--good)", background: "color-mix(in srgb, var(--good) 10%, transparent)", padding: "2px 6px", borderRadius: 5 }}>chosen</span>
                {i.sat != null && <SatBadge score={(i.sat as any).score} />}
              </>
            ) : (
              <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>{i.does}</span>
            )}
          </span>
          <span style={{ fontSize: 12, color: "var(--ink-4)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
            {i.chosen ? i.does + " · " : ""}{i.selected.length ? `${i.selected.length} shortlisted` : "in progress"}
          </span>
        </span>

        {/* email indicator */}
        {i.email && (
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--good)", flex: "0 0 auto" }}>✉</span>
        )}

        {/* chevron */}
        <span style={{ color: "var(--ink-4)", fontSize: 12, flex: "0 0 auto" }}>{open ? "▾" : "▸"}</span>
      </button>

      {/* expanded detail */}
      {open && (
        <div style={{ background: "var(--surface-2)", borderTop: "1px solid var(--sep2)", padding: "20px 18px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          {/* left: brief */}
          <div>
            <SectionLabel>Brief</SectionLabel>
            <Kv k="What it does" v={i.brief.does} />
            <Kv k="Industry" v={i.brief.industry} />
            <Kv k="Problem" v={i.brief.problem} />
            <Kv k="Audience" v={i.brief.audience} />
            <Kv k="Unique proposition" v={i.brief.uvp} />
            <Kv k="Signal" v={(i.brief.signal || []).join(", ")} />
            <Kv k="Tone" v={(i.brief.tone || []).join(", ")} />
            <Kv k="Lanes" v={(i.brief.lanes || []).join(", ")} />
            <Kv k="Markets" v={(i.brief.geos || []).join(", ")} />
          </div>

          {/* right: names + outcome */}
          <div>
            <SectionLabel>Names shortlisted</SectionLabel>
            {i.selected.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                {i.selected.map((n) => {
                  const isChosen = n === i.chosen;
                  return (
                    <span key={n} style={{
                      fontSize: 13.5, fontWeight: isChosen ? 600 : 400, padding: "4px 12px", borderRadius: 999,
                      background: isChosen ? "var(--ink)" : "var(--surface)",
                      color: isChosen ? "var(--surface)" : "var(--ink-2)",
                      border: `1px solid ${isChosen ? "var(--ink)" : "var(--sep)"}`,
                    }}>{n}</span>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: "var(--ink-4)", fontSize: 13, margin: "0 0 20px" }}>None shortlisted yet.</p>
            )}

            <SectionLabel>Final selection</SectionLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: i.chosen ? "var(--ink)" : "var(--ink-4)" }}>
                {i.chosen || "Not chosen yet"}
              </span>
              {i.chosen && i.sat != null && <SatBadge score={(i.sat as any).score} large />}
            </div>

            <SectionLabel>Founder</SectionLabel>
            <div style={{ marginBottom: i.sat || i.feedback ? 20 : 0 }}>
              <p style={{ margin: "0 0 2px", fontSize: 13.5, color: i.fromName ? "var(--ink)" : "var(--ink-4)" }}>{i.fromName || "—"}</p>
              <p style={{ margin: 0, fontSize: 13, color: i.email ? "var(--accent)" : "var(--ink-4)" }}>{i.email || "—"}</p>
            </div>

            {i.sat && (
              <>
                <SectionLabel>Satisfaction</SectionLabel>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: (i.sat as any).note ? 6 : 20 }}>
                  <SatBadge score={(i.sat as any).score} large />
                </div>
                {(i.sat as any).note && (
                  <p style={{ fontSize: 13, color: "var(--ink-2)", margin: "0 0 20px", lineHeight: 1.5, fontStyle: "italic" }}>
                    "{(i.sat as any).note}"
                  </p>
                )}
              </>
            )}

            {i.feedback && (
              <>
                <SectionLabel>Feedback (classic)</SectionLabel>
                {([["Experience", "experience", "experienceNote"], ["UX", "ux", "uxNote"], ["Found a name", "found", "foundNote"]] as const).map(([label, sk, nk]) => (
                  <div key={sk} style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "var(--ink-3)", flex: "0 0 100px" }}>{label}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--ink)", fontWeight: 600 }}>{(i.feedback as any)[sk] ?? "–"}<span style={{ fontWeight: 400, color: "var(--ink-3)" }}>/5</span></span>
                    {(i.feedback as any)[nk] && <span style={{ fontSize: 12, color: "var(--ink-3)", fontStyle: "italic" }}>· {(i.feedback as any)[nk]}</span>}
                  </div>
                ))}
                {(i.feedback as any).improve && <Kv k="Improve" v={(i.feedback as any).improve} />}
                {(i.feedback as any).free && <Kv k="Else" v={(i.feedback as any).free} />}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-4)", margin: "0 0 8px" }}>
      {children}
    </p>
  );
}

