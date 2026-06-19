// Internal request log (/admin). Reviews every generation: the content given
// (brief), the words generated, the names generated. Two sources:
//  · Central  — every request from every user, read from the Worker's KV store.
//  · This browser — the localStorage log (works offline / in dev).
import { useCallback, useEffect, useMemo, useState } from "react";
import { getRequests, clearRequests, type ReqLog } from "../lib/requestLog";

const WORKER = (import.meta.env.VITE_NAMING_API || "").replace(/\/$/, "");
const KEY_STORE = "ns.admin.key";

const C = {
  bg: "#F4F3EF", surface: "#FFFFFF", ink: "#1A1916", ink2: "#55534C", ink3: "#8C887F",
  line: "#E4E2DB", good: "#4B6B57", bad: "#9A5C50",
  sans: "'DM Sans', ui-sans-serif, system-ui, sans-serif", serif: "'Newsreader', Georgia, serif",
};

const PHASE_LABEL: Record<string, string> = {
  interview: "Interview", concepts: "Concepts", feelings: "Feelings", explore: "Explore",
  relate: "Relate (words)", names: "Names", compare: "Compare", brandbook: "Brand book", suggest: "Suggest", lead: "Email lead",
};

function fmtTime(t: number) {
  const d = new Date(t);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function summary(e: ReqLog): string {
  const o = e.output || {};
  switch (e.phase) {
    case "concepts": return `${o.concepts?.length || 0} concepts · ${(o.concepts || []).map((c: any) => c.title).slice(0, 4).join(", ")}`;
    case "feelings": return `${o.feelings?.length || 0} feelings · ${(o.feelings || []).map((f: any) => f.word).slice(0, 6).join(", ")}`;
    case "relate": { const n = (o.groups || []).reduce((a: number, g: any) => a + (g.words?.length || 0), 0); return `“${o.word}” → ${n} related words`; }
    case "explore": return `${o.words?.length || 0} seed words`;
    case "names": return `${o.names?.length || 0} names · ${(o.names || []).map((n: any) => n.name).slice(0, 6).join(", ")}`;
    case "compare": return `${o.rows?.length || 0} names compared · pick: ${o.recommended || "—"}`;
    case "lead": return `✉ ${e.input?.payload?.email || o.email || ""}${e.input?.payload?.name ? ` · ${e.input.payload.name}` : ""}`;
    case "brandbook": return `brand book · ${e.input?.payload?.name || ""}`;
    case "suggest": return `suggest “${e.input?.payload?.field || ""}”`;
    case "interview": return o.done ? "interview complete → brief" : "interview turn";
    default: return e.phase;
  }
}

export function AdminPage({ onExit }: { onExit: () => void }) {
  const [mode, setMode] = useState<"central" | "local">(WORKER ? "central" : "local");
  const [items, setItems] = useState<ReqLog[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [adminKey, setAdminKey] = useState<string>(() => { try { return localStorage.getItem(KEY_STORE) || ""; } catch { return ""; } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null); setFilter("all");
    if (mode === "local") { setItems(getRequests()); return; }
    if (!WORKER) { setError("No Worker endpoint in this build — central log is only available on the deployed site."); setItems([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${WORKER}/?log=1&limit=200${adminKey ? `&key=${encodeURIComponent(adminKey)}` : ""}`);
      if (res.status === 401) throw new Error("Unauthorized — check the admin key.");
      if (!res.ok) throw new Error(`Server returned ${res.status}.`);
      const data = await res.json();
      setItems(data.items || []);
      if (data.note) setError(data.note);
    } catch (e: any) { setError(e?.message || String(e)); setItems([]); }
    finally { setLoading(false); }
  }, [mode, adminKey]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    items.forEach((e) => { c[e.phase] = (c[e.phase] || 0) + 1; });
    return c;
  }, [items]);
  const live = items.filter((e) => e.source === "live").length;

  // Group every request into the process (flow) it belongs to: one line per process.
  const groups = useMemo(() => {
    const map = new Map<string, ReqLog[]>();
    for (const e of items) { const k = e.process || e.id; const a = map.get(k) || []; a.push(e); map.set(k, a); }
    const arr = [...map.values()].map((es) => [...es].sort((a, b) => a.at - b.at));
    arr.sort((a, b) => Math.max(...b.map((e) => e.at)) - Math.max(...a.map((e) => e.at)));
    return arr;
  }, [items]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: C.sans, fontSize: 14 }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 24px 80px" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 24, height: 24, borderRadius: 6, background: C.ink, color: C.bg, display: "grid", placeItems: "center", fontSize: 13 }}>✳</span>
              <h1 style={{ fontFamily: C.serif, fontSize: 26, fontStyle: "italic", margin: 0 }}>Request log</h1>
              <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: C.bad }}>● Internal</span>
            </div>
            <p style={{ color: C.ink3, margin: "8px 0 0", fontSize: 13 }}>
              {loading ? "Loading…" : `${groups.length} process${groups.length === 1 ? "" : "es"} · ${items.length} request${items.length === 1 ? "" : "s"}`}
              {mode === "central" ? " · central (all users)" : ` · this browser · ${live} live`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={load} style={btn(C)}>↻ Refresh</button>
            {mode === "local" && <button onClick={() => { if (confirm("Clear the request log on this browser?")) { clearRequests(); setItems([]); } }} style={btn(C)}>Clear</button>}
            <button onClick={onExit} style={btn(C)}>← Studio</button>
          </div>
        </div>

        {/* source toggle + admin key */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <Chip active={mode === "central"} onClick={() => setMode("central")} label="Central (everyone)" c={C} />
          <Chip active={mode === "local"} onClick={() => setMode("local")} label="This browser" c={C} />
          {mode === "central" && (
            <>
              <input type="password" placeholder="admin key (if set)" value={adminKey}
                onChange={(e) => { setAdminKey(e.target.value); try { localStorage.setItem(KEY_STORE, e.target.value); } catch { /* ignore */ } }}
                style={{ fontSize: 13, padding: "7px 11px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.surface, color: C.ink, outline: "none", minWidth: 160 }} />
            </>
          )}
        </div>

        {error && <div style={{ marginTop: 14, padding: "11px 15px", borderRadius: 12, border: `1px solid ${C.bad}`, color: C.bad, fontSize: 13, background: "#fff" }}>{error}</div>}

        {/* phase filter */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 22 }}>
          <Chip active={filter === "all"} onClick={() => setFilter("all")} label={`All (${items.length})`} c={C} />
          {Object.keys(counts).sort().map((p) => (
            <Chip key={p} active={filter === p} onClick={() => setFilter(p)} label={`${PHASE_LABEL[p] || p} (${counts[p]})`} c={C} />
          ))}
        </div>

        {/* list — one line per process, expand to the requests it ran */}
        <div style={{ marginTop: 18, border: `1px solid ${C.line}`, borderRadius: 14, background: C.surface, overflow: "hidden" }}>
          {groups.length === 0 && (
            <div style={{ padding: "48px 24px", textAlign: "center", color: C.ink3 }}>
              No requests logged yet. Run a flow (names, exploration, comparison…) and they'll appear here.
            </div>
          )}
          {groups.map((entries) => <ProcessRow key={entries[0].process || entries[0].id} entries={entries} filter={filter} c={C} />)}
        </div>
      </div>
    </div>
  );
}

function procInfo(entries: ReqLog[]) {
  const does = entries.map((e) => e.input?.brief?.does).find(Boolean) || "(no brief captured)";
  const phases: Record<string, number> = {};
  let names = 0, pick = "";
  entries.forEach((e) => {
    phases[e.phase] = (phases[e.phase] || 0) + 1;
    if (e.phase === "names") names += e.output?.names?.length || 0;
    if (e.phase === "compare") pick = e.output?.recommended || pick;
  });
  const phaseStr = Object.entries(phases).map(([p, n]) => `${n}× ${PHASE_LABEL[p] || p}`).join(" · ");
  const email = entries.find((e) => e.phase === "lead")?.input?.payload?.email || "";
  return { does, phaseStr, names, pick, email, count: entries.length, started: Math.min(...entries.map((e) => e.at)) };
}

// One line per whole process (flow); expand to the individual requests it ran.
function ProcessRow({ entries, filter, c }: { entries: ReqLog[]; filter: string; c: typeof C }) {
  const [open, setOpen] = useState(false);
  const info = procInfo(entries);
  const members = filter === "all" ? entries : entries.filter((e) => e.phase === filter);
  if (members.length === 0) return null;
  return (
    <div style={{ borderBottom: `1px solid ${c.line}` }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: open ? "#FAF9F6" : "none", border: "none", cursor: "pointer", textAlign: "left", color: "inherit" }}>
        <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 11.5, color: c.ink3, flex: "0 0 138px" }}>{fmtTime(info.started)}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: c.serif, fontSize: 15, color: c.ink, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{info.does}</span>
          <span style={{ fontSize: 11.5, color: c.ink3 }}>{info.count} request{info.count === 1 ? "" : "s"} · {info.phaseStr}{info.names ? ` · ${info.names} names` : ""}{info.pick ? ` · pick: ${info.pick}` : ""}</span>
          {info.email && <span style={{ fontSize: 12, color: c.good, marginLeft: 8 }}>✉ {info.email}</span>}
        </span>
        <span style={{ color: c.ink3, flex: "0 0 auto" }}>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div style={{ background: "#FAF9F6", padding: "2px 12px 14px" }}>
          {members.map((e) => <RequestRow key={e.id} e={e} c={c} />)}
        </div>
      )}
    </div>
  );
}

function RequestRow({ e, c }: { e: ReqLog; c: typeof C }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: `1px solid ${c.line}`, borderRadius: 10, background: c.surface, marginTop: 8, overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", background: "none", border: "none", cursor: "pointer", textAlign: "left", color: "inherit" }}>
        <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 11, color: c.ink3, flex: "0 0 118px" }}>{fmtTime(e.at)}</span>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: c.ink, flex: "0 0 102px" }}>{PHASE_LABEL[e.phase] || e.phase}</span>
        <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: e.source === "live" ? c.good : c.ink3, flex: "0 0 56px" }}>{e.source}</span>
        <span style={{ flex: 1, fontSize: 12.5, color: c.ink2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{summary(e)}</span>
        <span style={{ color: c.ink3, flex: "0 0 auto" }}>{open ? "▾" : "▸"}</span>
      </button>
      {open && <Detail e={e} c={c} />}
    </div>
  );
}

function Detail({ e, c }: { e: ReqLog; c: typeof C }) {
  const b = e.input?.brief || {};
  const p = e.input?.payload || {};
  const o = e.output || {};
  return (
    <div style={{ padding: "4px 16px 20px", background: "#FAF9F6", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {/* content given */}
      <div>
        <H label="Content given (brief)" c={c} />
        <Kv k="What it does" v={b.does} c={c} />
        <Kv k="Industry" v={b.industry} c={c} />
        <Kv k="Problem" v={b.problem} c={c} />
        <Kv k="Audience" v={b.audience} c={c} />
        <Kv k="Unique proposition" v={b.uvp} c={c} />
        <Kv k="Signal" v={(b.signal || []).join(", ")} c={c} />
        <Kv k="Tone" v={(b.tone || []).join(", ")} c={c} />
        <Kv k="Lanes" v={(b.lanes || []).join(", ")} c={c} />
        {p.seed != null && <Kv k="Seed / focus" v={`${p.seed || "(world)"}  ·  world: ${p.world || ""}`} c={c} />}
        {p.concept && <Kv k="Concept" v={p.concept.title || JSON.stringify(p.concept)} c={c} />}
        {p.sketch && <Kv k="Words picked" v={(p.sketch.words || []).join(", ")} c={c} />}
        {p.names && <Kv k="Names in" v={(p.names || []).map((n: any) => n.name || n).join(", ")} c={c} />}
        {p.field && <Kv k="Field" v={p.field} c={c} />}
        {p.name && <Kv k="Chosen name" v={p.name} c={c} />}
      </div>
      {/* generated */}
      <div>
        <H label="Generated" c={c} />
        {e.phase === "concepts" && (o.concepts || []).map((x: any, i: number) => <Line key={i} a={x.title} b={x.lane} c={c} />)}
        {e.phase === "feelings" && (o.feelings || []).map((x: any, i: number) => <Line key={i} a={x.word} b={x.why} c={c} />)}
        {e.phase === "names" && (o.names || []).map((x: any, i: number) => <Line key={i} a={x.name} b={`${x.type || ""} · ${x.rationale || ""}`} c={c} />)}
        {e.phase === "explore" && (o.words || []).map((x: any, i: number) => <Line key={i} a={x.word} b={(x.related || []).join(", ")} c={c} />)}
        {e.phase === "relate" && (
          <div>
            <Line a={`Focus: ${o.word}`} b={o.def} c={c} />
            {(o.groups || []).map((g: any, i: number) => <Line key={i} a={g.rel} b={(g.words || []).map((w: any) => w.w + (w.lang ? `(${w.lang})` : "")).join(", ")} c={c} />)}
          </div>
        )}
        {e.phase === "compare" && (
          <div>
            <Line a="Recommended" b={o.recommended} c={c} />
            {(o.rows || []).map((r: any, i: number) => <Line key={i} a={r.name} b={`SMILE ${r.total} · ${(r.suggested || []).map((d: any) => d.domain).join(", ")}`} c={c} />)}
          </div>
        )}
        {e.phase === "brandbook" && <Line a={o.tagline} b={o.essence} c={c} />}
        {e.phase === "suggest" && (o.suggestions || []).map((s: string, i: number) => <Line key={i} a={s} c={c} />)}
        {e.phase === "interview" && <Line a={o.say} b={o.done ? "→ brief produced" : ""} c={c} />}
        {/* raw */}
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: "pointer", fontSize: 11, color: c.ink3 }}>Raw JSON</summary>
          <pre style={{ marginTop: 6, padding: 10, background: "#fff", border: `1px solid ${c.line}`, borderRadius: 8, fontSize: 11, maxHeight: 260, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{JSON.stringify(o, null, 2)}</pre>
        </details>
      </div>
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
function Line({ a, b, c }: { a?: string; b?: string; c: typeof C }) {
  return (
    <div style={{ marginBottom: 5, fontSize: 12.5, lineHeight: 1.4 }}>
      <span style={{ fontFamily: c.serif, fontSize: 14, color: c.ink }}>{a}</span>
      {b && <span style={{ color: c.ink3 }}> — {b}</span>}
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
