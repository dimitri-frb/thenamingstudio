// Internal request log (/admin). One line per process, expandable to a compact
// summary: the brief the founder gave, the names they shortlisted, the final
// selection (if they locked one in), and their email. Two sources:
//  · Central  — every process from every user, read from the Worker's KV store.
//  · This browser — the localStorage log (works offline / in dev).
import { useCallback, useEffect, useMemo, useState } from "react";
import { getRequests, clearRequests, type ReqLog } from "../lib/requestLog";

const WORKER = (import.meta.env.VITE_NAMING_API || "").replace(/\/$/, "");
const KEY_STORE = "ns.admin.key";

const C = {
  bg: "#F4F3EF", surface: "#FFFFFF", ink: "#1A1916", ink2: "#55534C", ink3: "#8C887F",
  line: "#E4E2DB", surface2: "#FAF9F6", good: "#4B6B57", bad: "#9A5C50",
  sans: "'DM Sans', ui-sans-serif, system-ui, sans-serif", serif: "'Newsreader', Georgia, serif",
};

function fmtTime(t: number) {
  const d = new Date(t);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Everything we want to show per process, distilled from its requests.
function procInfo(entries: ReqLog[]) {
  // Merge every brief this process logged, latest wins. The step-1 sign-up captures a
  // partial brief (just what-it-does + industry); later generation/lock-in requests
  // carry the full brief, so we always end up with the complete one even once a name
  // is chosen.
  const brief: any = Object.assign({}, ...entries.map((e) => e.input?.brief).filter(Boolean));
  const does = brief.does || "(no brief captured)";
  // The names the founder shortlisted for comparison (the input to the compare step).
  const cmp = [...entries].reverse().find((e) => e.phase === "compare");
  const selected: string[] = (cmp?.input?.payload?.names || []).map((n: any) => n?.name || n).filter(Boolean);
  const recommended = cmp?.output?.recommended || "";
  // Leads: the sign-up (step 1, has fromName + email) and the lock-in gate (has the
  // brand name). Pull each field from whichever lead carries it.
  const leads = entries.filter((e) => e.phase === "lead").map((e) => e.input?.payload || {});
  const email = leads.map((p: any) => p.email).find(Boolean) || "";
  const fromName = leads.map((p: any) => p.fromName).find(Boolean) || "";
  // The name locked in at the end (gate / brand book), if reached.
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

  // Group requests into the process (flow) each belongs to: one card per process.
  const groups = useMemo(() => {
    const map = new Map<string, ReqLog[]>();
    for (const e of items) { const k = e.process || e.id; const a = map.get(k) || []; a.push(e); map.set(k, a); }
    const arr = [...map.values()].map((es) => [...es].sort((a, b) => a.at - b.at));
    arr.sort((a, b) => Math.max(...b.map((e) => e.at)) - Math.max(...a.map((e) => e.at)));
    return arr;
  }, [items]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: C.sans, fontSize: 14 }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 24px 80px" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 24, height: 24, borderRadius: 6, background: C.ink, color: C.bg, display: "grid", placeItems: "center", fontSize: 13 }}>✳</span>
              <h1 style={{ fontFamily: C.serif, fontSize: 26, fontStyle: "italic", margin: 0 }}>Processes</h1>
              <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: C.bad }}>● Internal</span>
            </div>
            <p style={{ color: C.ink3, margin: "8px 0 0", fontSize: 13 }}>
              {loading ? "Loading…" : `${groups.length} process${groups.length === 1 ? "" : "es"}`}
              {mode === "central" ? " · central (all users)" : " · this browser"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={load} style={btn(C)}>↻ Refresh</button>
            {mode === "local" && <button onClick={() => { if (confirm("Clear the request log on this browser?")) { clearRequests(); setItems([]); } }} style={btn(C)}>Clear</button>}
            <a href={`${import.meta.env.BASE_URL || "/"}test`} target="_blank" rel="noreferrer" style={{ ...btn(C), textDecoration: "none" }}>↗ Test process</a>
            <button onClick={onExit} style={btn(C)}>← Studio</button>
          </div>
        </div>

        {/* source toggle + admin key */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <Chip active={mode === "central"} onClick={() => setMode("central")} label="Central (everyone)" c={C} />
          <Chip active={mode === "local"} onClick={() => setMode("local")} label="This browser" c={C} />
          {mode === "central" && (
            <input type="password" placeholder="admin key (if set)" value={adminKey}
              onChange={(e) => { setAdminKey(e.target.value); try { localStorage.setItem(KEY_STORE, e.target.value); } catch { /* ignore */ } }}
              style={{ fontSize: 13, padding: "7px 11px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.surface, color: C.ink, outline: "none", minWidth: 160 }} />
          )}
        </div>

        {error && <div style={{ marginTop: 14, padding: "11px 15px", borderRadius: 12, border: `1px solid ${C.bad}`, color: C.bad, fontSize: 13, background: "#fff" }}>{error}</div>}

        {/* one card per process */}
        <div style={{ marginTop: 22, border: `1px solid ${C.line}`, borderRadius: 14, background: C.surface, overflow: "hidden" }}>
          {groups.length === 0 && (
            <div style={{ padding: "48px 24px", textAlign: "center", color: C.ink3 }}>
              No processes yet. Run a flow and they'll appear here.
            </div>
          )}
          {groups.map((entries) => <ProcessRow key={entries[0].process || entries[0].id} entries={entries} c={C} />)}
        </div>
      </div>
    </div>
  );
}

// One process: header line, expand for the brief + selected names + final pick + email.
function ProcessRow({ entries, c }: { entries: ReqLog[]; c: typeof C }) {
  const [open, setOpen] = useState(false);
  const i = procInfo(entries);
  return (
    <div style={{ borderBottom: `1px solid ${c.line}` }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: open ? c.surface2 : "none", border: "none", cursor: "pointer", textAlign: "left", color: "inherit" }}>
        <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 11.5, color: c.ink3, flex: "0 0 116px" }}>{fmtTime(i.started)}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: c.serif, fontSize: 15.5, color: c.ink, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {i.chosen
              ? <>{i.chosen} <span style={{ fontFamily: c.sans, fontSize: 9.5, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: c.good, marginLeft: 4 }}>chosen</span></>
              : i.does}
          </span>
          <span style={{ fontSize: 11.5, color: c.ink3, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {i.chosen ? `${i.does} · ` : ""}{i.selected.length ? `${i.selected.length} shortlisted` : "in progress"}
          </span>
        </span>
        {i.email && <span style={{ fontSize: 12, color: c.good, flex: "0 0 auto" }}>✉</span>}
        <span style={{ color: c.ink3, flex: "0 0 auto" }}>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div style={{ background: c.surface2, padding: "6px 16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* brief */}
          <div>
            <H label="Brief" c={c} />
            <Kv k="What it does" v={i.brief.does} c={c} />
            <Kv k="Industry" v={i.brief.industry} c={c} />
            <Kv k="Problem" v={i.brief.problem} c={c} />
            <Kv k="Audience" v={i.brief.audience} c={c} />
            <Kv k="Unique proposition" v={i.brief.uvp} c={c} />
            <Kv k="Signal" v={(i.brief.signal || []).join(", ")} c={c} />
            <Kv k="Tone" v={(i.brief.tone || []).join(", ")} c={c} />
            <Kv k="Lanes" v={(i.brief.lanes || []).join(", ")} c={c} />
            <Kv k="Markets" v={(i.brief.geos || []).join(", ")} c={c} />
          </div>
          {/* outcome */}
          <div>
            <H label="Names shortlisted" c={c} />
            {i.selected.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
                {i.selected.map((n) => (
                  <span key={n} style={{ fontFamily: c.serif, fontSize: 14, padding: "3px 10px", borderRadius: 999, background: n === i.chosen ? c.ink : c.surface, color: n === i.chosen ? c.surface : c.ink, border: `1px solid ${n === i.chosen ? c.ink : c.line}` }}>{n}</span>
                ))}
              </div>
            ) : <p style={{ color: c.ink3, fontSize: 13, margin: 0 }}>None shortlisted yet.</p>}

            <div style={{ marginTop: 16 }}>
              <H label="Final selection" c={c} />
              <p style={{ margin: 0, fontFamily: c.serif, fontSize: 17, color: i.chosen ? c.ink : c.ink3 }}>{i.chosen || "Not chosen yet"}</p>
            </div>

            <div style={{ marginTop: 16 }}>
              <H label="Founder" c={c} />
              <p style={{ margin: 0, fontSize: 13.5, color: i.fromName ? c.ink : c.ink3 }}>{i.fromName || "—"}</p>
              <p style={{ margin: "2px 0 0", fontSize: 13.5, color: i.email ? c.good : c.ink3 }}>{i.email || "—"}</p>
            </div>

            {i.feedback && (
              <div style={{ marginTop: 16 }}>
                <H label="Feedback" c={c} />
                {([["Experience", "experience", "experienceNote"], ["UX", "ux", "uxNote"], ["Found a name", "found", "foundNote"]] as const).map(([label, sk, nk]) => (
                  <div key={sk} style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontFamily: c.sans, fontSize: 11, color: c.ink2, flex: "0 0 96px" }}>{label}</span>
                    <span style={{ fontFamily: c.sans, fontSize: 12, color: c.ink }}>{(i.feedback as any)[sk] ?? "–"}/5</span>
                    {(i.feedback as any)[nk] && <span style={{ fontSize: 12.5, color: c.ink2 }}>· {(i.feedback as any)[nk]}</span>}
                  </div>
                ))}
                {(i.feedback as any).improve && <Kv k="Improve" v={(i.feedback as any).improve} c={c} />}
                {(i.feedback as any).free && <Kv k="Else" v={(i.feedback as any).free} c={c} />}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function H({ label, c }: { label: string; c: typeof C }) {
  return <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: c.ink3, margin: "0 0 8px" }}>{label}</p>;
}
function Kv({ k, v, c }: { k: string; v?: string; c: typeof C }) {
  if (!v) return null;
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 5, fontSize: 12.5, lineHeight: 1.4 }}>
      <span style={{ flex: "0 0 120px", color: c.ink3 }}>{k}</span>
      <span style={{ flex: 1, color: c.ink }}>{v}</span>
    </div>
  );
}
function Chip({ active, onClick, label, c }: { active: boolean; onClick: () => void; label: string; c: typeof C }) {
  return (
    <button onClick={onClick} style={{ fontSize: 12, fontWeight: 500, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
      border: `1px solid ${active ? c.ink : c.line}`, background: active ? c.ink : c.surface, color: active ? c.surface : c.ink2 }}>{label}</button>
  );
}
function btn(c: typeof C): React.CSSProperties {
  return { fontSize: 13, fontWeight: 500, padding: "8px 14px", borderRadius: 10, border: `1px solid ${c.line}`, background: c.surface, color: c.ink, cursor: "pointer" };
}
