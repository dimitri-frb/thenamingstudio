// Internal request log (/admin). One line per process, expandable to a compact
// summary: the brief the founder gave, the names they shortlisted, the final
// selection (if they locked one in), and their email. Two sources:
//  · Central  — every process from every user, read from the Worker's KV store.
//  · This browser — the localStorage log (works offline / in dev).
import { useCallback, useEffect, useMemo, useState } from "react";
import { getRequests, type ReqLog } from "../lib/requestLog";
import "../cosmos/cosmos.css";

const WORKER = (import.meta.env.VITE_NAMING_API || "").replace(/\/$/, "");
const KEY_STORE = "ns.admin.key";

function fmtTime(t: number) {
  const d = new Date(t);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Everything we want to show per process, distilled from its requests.
function procInfo(entries: ReqLog[]) {
  const brief: any = Object.assign({}, ...entries.map((e) => e.input?.brief).filter(Boolean));
  const does = brief.does || "(no brief captured)";
  const cmp = [...entries].reverse().find((e) => e.phase === "compare");
  const selected: string[] = (cmp?.input?.payload?.names || []).map((n: any) => n?.name || n).filter(Boolean);
  const recommended = cmp?.output?.recommended || "";
  const leads = entries.filter((e) => e.phase === "lead").map((e) => e.input?.payload || {});
  const email = leads.map((p: any) => p.email).find(Boolean) || "";
  const fromName = leads.map((p: any) => p.fromName).find(Boolean) || "";
  const chosen = leads.map((p: any) => p.name).find(Boolean) || entries.find((e) => e.phase === "brandbook")?.input?.payload?.name || "";
  const feedback = [...entries].reverse().find((e) => e.phase === "feedback")?.input?.payload || null;
  const started = Math.min(...entries.map((e) => e.at));
  return { brief, does, selected, recommended, email, fromName, chosen, feedback, started };
}

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
    // .cx provides all CSS tokens (--ink, --surface, --line, etc.) and utility classes (btn, lbl, eyebrow…)
    // Override the grid layout so admin renders as a normal scrollable page.
    <div className="cx" style={{ display: "block", minHeight: "100vh", height: "auto", overflow: "auto", background: "var(--surface-2)" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 24px 80px" }}>

        {/* header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <span className="eyebrow" style={{ color: "var(--bad)" }}>● Internal</span>
            <h1 style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 400, fontStyle: "italic", letterSpacing: "-0.02em", margin: "6px 0 0", color: "var(--ink)" }}>
              Processes
            </h1>
            <p style={{ color: "var(--ink-3)", margin: "6px 0 0", fontSize: 13 }}>
              {loading ? "Loading…" : `${groups.length} process${groups.length === 1 ? "" : "es"}`}
              {mode === "central" ? " · central (all users)" : " · this browser"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
            <button onClick={load} className="btn">↻ Refresh</button>
            <a href={`${import.meta.env.BASE_URL || "/"}?test`} target="_blank" rel="noreferrer" className="btn" style={{ textDecoration: "none" }}>↗ Test classic</a>
            <a href={`${import.meta.env.BASE_URL || "/"}?test&beta`} target="_blank" rel="noreferrer" className="btn" style={{ textDecoration: "none" }}>↗ Test beta</a>
            <button onClick={onExit} className="btn">← Studio</button>
          </div>
        </div>

        {/* source toggle + admin key */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
          <AdminChip active={mode === "central"} onClick={() => setMode("central")} label="Central (everyone)" />
          <AdminChip active={mode === "local"} onClick={() => setMode("local")} label="This browser" />
          {mode === "central" && (
            <input type="password" placeholder="admin key (if set)" value={adminKey}
              onChange={(e) => { setAdminKey(e.target.value); try { localStorage.setItem(KEY_STORE, e.target.value); } catch { /* ignore */ } }}
              style={{ fontSize: 13, padding: "7px 11px", borderRadius: "var(--r2)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", outline: "none", minWidth: 160 }} />
          )}
        </div>

        {error && (
          <div style={{ marginTop: 14, padding: "11px 15px", borderRadius: "var(--r2)", border: "1px solid var(--bad)", color: "var(--bad)", fontSize: 13, background: "var(--surface)" }}>
            {error}
          </div>
        )}

        {/* one card per process */}
        <div style={{ marginTop: 22, border: "1px solid var(--line)", borderRadius: "var(--r3)", background: "var(--surface)", overflow: "hidden" }}>
          {groups.length === 0 && (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--ink-3)" }}>
              No processes yet. Run a flow and they'll appear here.
            </div>
          )}
          {groups.map((entries) => <ProcessRow key={entries[0].process || entries[0].id} entries={entries} />)}
        </div>
      </div>
    </div>
  );
}

function ProcessRow({ entries }: { entries: ReqLog[] }) {
  const [open, setOpen] = useState(false);
  const i = procInfo(entries);
  return (
    <div style={{ borderBottom: "1px solid var(--line)" }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: open ? "var(--surface-2)" : "none", border: "none", cursor: "pointer", textAlign: "left", color: "inherit" }}>
        <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 11.5, color: "var(--ink-3)", flex: "0 0 116px" }}>{fmtTime(i.started)}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: "var(--serif)", fontSize: 15.5, color: "var(--ink)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {i.chosen
              ? <>{i.chosen} <span style={{ fontFamily: "var(--sans)", fontSize: 9.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--good)", marginLeft: 4 }}>chosen</span></>
              : i.does}
          </span>
          <span style={{ fontSize: 11.5, color: "var(--ink-3)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {i.chosen ? `${i.does} · ` : ""}{i.selected.length ? `${i.selected.length} shortlisted` : "in progress"}
          </span>
        </span>
        {i.email && <span style={{ fontSize: 12, color: "var(--good)", flex: "0 0 auto" }}>✉</span>}
        <span style={{ color: "var(--ink-3)", flex: "0 0 auto" }}>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div style={{ background: "var(--surface-2)", padding: "6px 16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <Lbl>Brief</Lbl>
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
          <div>
            <Lbl>Names shortlisted</Lbl>
            {i.selected.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
                {i.selected.map((n) => (
                  <span key={n} style={{ fontFamily: "var(--serif)", fontSize: 14, padding: "3px 10px", borderRadius: 999, background: n === i.chosen ? "var(--ink)" : "var(--surface)", color: n === i.chosen ? "var(--surface)" : "var(--ink)", border: `1px solid ${n === i.chosen ? "var(--ink)" : "var(--line)"}` }}>{n}</span>
                ))}
              </div>
            ) : <p style={{ color: "var(--ink-3)", fontSize: 13, margin: 0 }}>None shortlisted yet.</p>}

            <div style={{ marginTop: 16 }}>
              <Lbl>Final selection</Lbl>
              <p style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 17, color: i.chosen ? "var(--ink)" : "var(--ink-3)" }}>{i.chosen || "Not chosen yet"}</p>
            </div>

            <div style={{ marginTop: 16 }}>
              <Lbl>Founder</Lbl>
              <p style={{ margin: 0, fontSize: 13.5, color: i.fromName ? "var(--ink)" : "var(--ink-3)" }}>{i.fromName || "—"}</p>
              <p style={{ margin: "2px 0 0", fontSize: 13.5, color: i.email ? "var(--good)" : "var(--ink-3)" }}>{i.email || "—"}</p>
            </div>

            {i.feedback && (
              <div style={{ marginTop: 16 }}>
                <Lbl>Feedback</Lbl>
                {([["Experience", "experience", "experienceNote"], ["UX", "ux", "uxNote"], ["Found a name", "found", "foundNote"]] as const).map(([label, sk, nk]) => (
                  <div key={sk} style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--ink-2)", flex: "0 0 96px" }}>{label}</span>
                    <span style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--ink)" }}>{(i.feedback as any)[sk] ?? "–"}/5</span>
                    {(i.feedback as any)[nk] && <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>· {(i.feedback as any)[nk]}</span>}
                  </div>
                ))}
                {(i.feedback as any).improve && <Kv k="Improve" v={(i.feedback as any).improve} />}
                {(i.feedback as any).free && <Kv k="Else" v={(i.feedback as any).free} />}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <p className="lbl" style={{ margin: "0 0 8px" }}>{children}</p>;
}
function Kv({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 5, fontSize: 12.5, lineHeight: 1.4 }}>
      <span style={{ flex: "0 0 120px", color: "var(--ink-3)" }}>{k}</span>
      <span style={{ flex: 1, color: "var(--ink)" }}>{v}</span>
    </div>
  );
}
function AdminChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} style={{ fontSize: 12, fontWeight: 500, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
      border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`, background: active ? "var(--ink)" : "var(--surface)", color: active ? "var(--surface)" : "var(--ink-2)" }}>{label}</button>
  );
}
