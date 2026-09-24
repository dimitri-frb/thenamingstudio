// 11 · Admin: every search at a glance. Reads the Worker's central KV log,
// groups events by process, and shows the funnel (searches → accounts → names
// picked → domains claimed), with search, status filters and CSV export.
import { useEffect, useMemo, useState } from "react";
import "./wrapped.css";
import { ENDPOINT } from "./api";
import { download } from "./zip";

interface LogItem { id: string; at: number; process?: string; phase: string; input?: any; output?: any }

interface Row {
  process: string;
  at: number;          // last activity
  first: number;       // first activity
  email: string;
  brief: string;
  name: string;
  domain: string;
  status: "claimed" | "ready" | "exploring" | "abandoned";
}

type Period = 1 | 7 | 30;
type Filter = "all" | "claimed" | "progress" | "abandoned";

export function AdminPage() {
  const [items, setItems] = useState<LogItem[] | null>(null);
  const [err, setErr] = useState("");
  const [period, setPeriod] = useState<Period>(7);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get("key");
    fetch(`${ENDPOINT}?log&limit=300${key ? `&key=${encodeURIComponent(key)}` : ""}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setErr(String(d.error)); else setItems(d.items || []); })
      .catch((e) => setErr(String(e)));
  }, []);

  const rows = useMemo(() => (items ? buildRows(items) : []), [items]);
  const since = Date.now() - period * 86400000;
  const inPeriod = rows.filter((r) => r.at >= since || r.first >= since);

  const accounts = useMemo(() => {
    if (!items) return 0;
    const emails = new Set<string>();
    for (const it of items) {
      if (it.phase !== "lead" || it.at < since) continue;
      const p = it.output || it.input?.payload || {};
      if (p.email) emails.add(String(p.email).toLowerCase());
    }
    return emails.size;
  }, [items, since]);

  const kSearches = inPeriod.length;
  const kPicked = inPeriod.filter((r) => r.name).length;
  const kClaimed = inPeriod.filter((r) => r.status === "claimed").length;
  const pct = (n: number) => (kSearches ? Math.round((n / kSearches) * 100) + "%" : "–");

  const shown = inPeriod
    .filter((r) => filter === "all" ? true : filter === "claimed" ? r.status === "claimed" : filter === "abandoned" ? r.status === "abandoned" : (r.status === "ready" || r.status === "exploring"))
    .filter((r) => {
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return [r.email, r.brief, r.name, r.domain].some((v) => v.toLowerCase().includes(s));
    })
    .sort((a, b) => b.at - a.at);

  function exportCsv() {
    const head = "when,user,brief,name,domain,status";
    const lines = shown.map((r) =>
      [fmtCsv(new Date(r.at).toISOString()), fmtCsv(r.email), fmtCsv(r.brief), fmtCsv(r.name), fmtCsv(r.domain), r.status].join(","));
    download(new Blob([head + "\n" + lines.join("\n")], { type: "text/csv" }), `naming-studio-searches-${period}d.csv`);
  }

  return (
    <div className="wadm">
      <div className="wrap">
        <div className="bar">
          <a className="wr-brand" href={(import.meta as any).env.BASE_URL || "/"} style={{ textDecoration: "none", color: "#fff" }}>
            <span className="bx" style={{ width: 22, height: 22, borderRadius: 6, background: "#fff", display: "grid", placeItems: "center" }}>
              <svg width="12" height="12" viewBox="0 0 12 12"><path d="M 2 8.5 A 4 4 0 0 1 10 8.5 Z" fill="#000" /></svg>
            </span>
            <span className="bt" style={{ fontSize: 13.5, fontWeight: 700 }}>the naming studio</span>
          </a>
          <span style={{ fontSize: 13, color: "var(--text3)", fontWeight: 600 }}>Admin</span>
          <span style={{ flex: 1 }} />
          <div className="seg">
            {([1, 7, 30] as Period[]).map((p) => (
              <button key={p} className={p === period ? "on" : ""} onClick={() => setPeriod(p)}>{p === 1 ? "Today" : `${p} days`}</button>
            ))}
          </div>
          <button className="wr-btn2" onClick={exportCsv}>↓ Export CSV</button>
        </div>

        <div className="kpis">
          <div className="kpi"><div className="l">Searches started</div><div className="v">{kSearches.toLocaleString()}</div><div className="c">{period === 1 ? "today" : `${period} days`}</div></div>
          <div className="kpi"><div className="l">Accounts created</div><div className="v">{accounts.toLocaleString()}</div><div className="c">{pct(accounts)}</div></div>
          <div className="kpi"><div className="l">Names picked</div><div className="v">{kPicked.toLocaleString()}</div><div className="c">{pct(kPicked)}</div></div>
          <div className="kpi"><div className="l">Domains claimed</div><div className="v">{kClaimed.toLocaleString()}</div><div className="c">{pct(kClaimed)}</div></div>
        </div>

        <div className="bar" style={{ paddingTop: 2 }}>
          <div className="search">
            <span style={{ color: "var(--text3)" }}>⌕</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email, brief or name…" />
          </div>
          <div className="seg">
            {([["all", "All"], ["claimed", "Claimed"], ["progress", "In progress"], ["abandoned", "Abandoned"]] as [Filter, string][]).map(([k, l]) => (
              <button key={k} className={k === filter ? "on" : ""} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
        </div>

        {err && <p className="rows-note">Couldn't load the log: {err}</p>}
        {!items && !err && <p className="rows-note">Loading…</p>}
        {items && (
          <table>
            <thead>
              <tr><th>When</th><th>User</th><th>Brief</th><th>Name</th><th>Domain</th><th>Status</th></tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.process}>
                  <td className="mono">{fmtWhen(r.at)}</td>
                  <td className="mono">{r.email || "—"}</td>
                  <td style={{ maxWidth: 320 }}>{r.brief || "—"}</td>
                  <td>{r.name ? <b style={{ fontFamily: "var(--serif)", fontWeight: 500, fontSize: 15 }}>{r.name}</b> : "—"}</td>
                  <td className="mono">{r.domain || "—"}</td>
                  <td><span className={"pill " + (r.status === "claimed" ? "claimed" : r.status === "ready" ? "ready" : r.status === "abandoned" ? "abandoned" : "")}>{STATUS_LABEL[r.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {items && !shown.length && <p className="rows-note">No searches match.</p>}
        {items && <p className="rows-note">Based on the latest {items.length} log entries (60-day retention).</p>}
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<Row["status"], string> = { claimed: "Claimed", ready: "Names ready", exploring: "Exploring", abandoned: "Abandoned" };

function buildRows(items: LogItem[]): Row[] {
  const by = new Map<string, LogItem[]>();
  for (const it of items) {
    const p = it.process || "";
    if (!p) continue;
    if (!by.has(p)) by.set(p, []);
    by.get(p)!.push(it);
  }
  const rows: Row[] = [];
  for (const [process, evs] of by) {
    evs.sort((a, b) => a.at - b.at);
    const first = evs[0].at;
    const at = evs[evs.length - 1].at;
    let email = "", brief = "", name = "", domain = "";
    let sawNames = false, sawDomain = false;
    for (const e of evs) {
      const pay = e.output || e.input?.payload || {};
      const inPay = e.input?.payload || {};
      if (e.phase === "lead" && (pay.email || inPay.email)) email = pay.email || inPay.email;
      if (e.phase === "search" && (pay.sentence || inPay.sentence)) brief = pay.sentence || inPay.sentence;
      if (!brief && e.input?.brief?.does) brief = e.input.brief.does; // legacy flows
      if (!brief && inPay.sentence) brief = inPay.sentence;
      if ((e.phase === "pick" || e.phase === "decision") && (pay.name || inPay.name)) { name = pay.name || inPay.name; }
      if (e.phase === "wrapnames" || e.phase === "names") sawNames = true;
      if (e.phase === "domain" && (pay.domain || inPay.domain)) { domain = pay.domain || inPay.domain; sawDomain = true; }
    }
    const ageH = (Date.now() - at) / 3600000;
    const status: Row["status"] = sawDomain ? "claimed" : name || sawNames ? (name ? "ready" : ageH > 24 ? "abandoned" : "ready") : ageH > 24 ? "abandoned" : "exploring";
    rows.push({ process, at, first, email, brief: String(brief).slice(0, 140), name, domain, status });
  }
  return rows;
}

function fmtWhen(t: number): string {
  const d = new Date(t);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
const fmtCsv = (s: string) => `"${String(s || "").replace(/"/g, '""')}"`;
