// The Name Name admin dashboard (handoff: Known As Admin): every flow that
// started, where it stopped, who the user is and where they came from.
// White "paper" theme, session-gated server-side (adminlog needs an admin token).
import { Fragment, useEffect, useMemo, useState } from "react";
import "./wrapped.css";
import { ENDPOINT, adminRoles, loadSession, roleSet, saveSession } from "./api";
import { AvatarMenu, SettingsPane } from "./paper";
import { download } from "./zip";

interface LogItem { id: string; at: number; process?: string; phase: string; input?: any; output?: any }

export const STEPS = ["Sign up", "Brief", "Concept", "Words", "Names", "Domain", "Logo", "Brand book", "Socials", "Completed"] as const;
const PHASE_STEP: Record<string, number> = {
  signup: 0, search: 1, wrapchips: 1, wrapconcept: 2, wrapwords: 3,
  wrapnames: 4, pick: 4, domain: 5, taste: 6, logo: 6, logopers: 6, logopack: 6,
  book: 7, bookpreview: 7, social: 8, done: 9,
};

interface Flow {
  id: string;
  first: number; last: number;
  step: number;                   // furthest step reached (0-9)
  status: "live" | "stopped" | "done";
  email: string; uname: string;
  brief: string;
  name: string; shortlist: string[]; words: string[];
  domain: string;
  source: string; campaign: string; device: string; lang: string; country: string;
  timeline: { at: number; step: string }[];
}

function buildFlows(items: LogItem[]): Flow[] {
  const by = new Map<string, LogItem[]>();
  for (const it of items) {
    if (!it.process) continue;
    if (!by.has(it.process)) by.set(it.process, []);
    by.get(it.process)!.push(it);
  }
  const flows: Flow[] = [];
  for (const [id, evs] of by) {
    evs.sort((a, b) => a.at - b.at);
    const f: Flow = {
      id, first: evs[0].at, last: evs[evs.length - 1].at, step: 0, status: "stopped",
      email: "", uname: "", brief: "", name: "", shortlist: [], words: [], domain: "",
      source: "", campaign: "", device: "", lang: "", country: "", timeline: [],
    };
    for (const e of evs) {
      const p = e.input?.payload || {};
      const st = PHASE_STEP[e.phase];
      if (st !== undefined) {
        if (st > f.step) f.step = st;
        f.timeline.push({ at: e.at, step: STEPS[st] });
      }
      const m = p.meta;
      if (m) {
        if (m.email) f.email = m.email;
        if (m.uname) f.uname = m.uname;
        if (m.source) f.source = m.source;
        if (m.campaign) f.campaign = m.campaign;
        if (m.device) f.device = m.device;
        if (m.lang) f.lang = m.lang;
      }
      if (e.input?.geo) f.country = e.input.geo;
      // The brief rides on many phases (search, concept, words, names): take it
      // from any of them, so a truncated log window still shows it.
      const sent = p.sentence || e.input?.payload?.sentence;
      if (sent && !f.brief) f.brief = sent;
      if (e.phase === "pick" && p.name) f.name = p.name;
      if (e.phase === "done" && p.name) f.name = f.name || p.name;
      if (e.phase === "domain" && p.domain) f.domain = p.domain;
      if (e.phase === "wrapnames") {
        const names = (e.output?.names || []).map((n: any) => n?.name).filter(Boolean);
        if (names.length) f.shortlist = names.slice(0, 3);
        const w = (e.input?.payload?.words || []).map((x: any) => x?.w).filter(Boolean);
        if (w.length) f.words = w.slice(0, 10);
      }
    }
    // dedupe adjacent timeline steps, keep first hit of each
    const seen = new Set<string>();
    f.timeline = f.timeline.filter((t) => { if (seen.has(t.step)) return false; seen.add(t.step); return true; });
    // the landing gate signs people up under a throwaway process id: a group
    // that is ONLY a signup is that stray event, not a flow
    const onlySignup = evs.every((e) => e.phase === "signup");
    if (onlySignup) continue;
    // a signed-in flow passed Sign up by definition
    if (f.email && !f.timeline.some((t) => t.step === STEPS[0])) f.timeline.unshift({ at: f.first, step: STEPS[0] });
    f.status = f.step >= 9 ? "done" : Date.now() - f.last < 30 * 60000 ? "live" : "stopped";
    flows.push(f);
  }
  return flows.sort((a, b) => b.last - a.last);
}

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
};
const spent = (f: Flow) => {
  const m = Math.max(1, Math.round((f.last - f.first) / 60000));
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;
};
const fdate = (t: number) => new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

type Range = 1 | 7 | 30 | 0;

export function AdminPage() {
  const me = loadSession()?.user || (new URLSearchParams(window.location.search).has("demo") ? { name: "Dimitri Farber", email: "dimitri@dfginvest.fr" } as any : null);
  const [items, setItems] = useState<LogItem[] | null>(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [range, setRange] = useState<Range>(7);
  const [tab, setTab] = useState<"all" | "live" | "stopped" | "done">("all");
  const [stopAt, setStopAt] = useState<number | null>(null);
  const [fSource, setFSource] = useState("");
  const [fCountry, setFCountry] = useState("");
  const [fDevice, setFDevice] = useState("");
  const [fName, setFName] = useState("");
  const [fDomain, setFDomain] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  const [view, setView] = useState<"flows" | "users">(window.location.pathname.includes("/admin/users") ? "users" : "flows");
  const [roles, setRoles] = useState<{ owners: string[]; admins: string[] } | null>(null);
  const [selUser, setSelUser] = useState<string | null>(null);
  const [uq, setUq] = useState("");
  const [uTab, setUTab] = useState<"all" | "new" | "named" | "admins">("all");

  const BASE = () => (import.meta as any).env.BASE_URL || "/";

  const demo = new URLSearchParams(window.location.search).has("demo");
  useEffect(() => {
    if (demo) { setItems(DEMO_ITEMS); return; }
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phase: "adminlog", token: loadSession()?.token || "", limit: 900 }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.error) setErr(String(d.error)); else setItems(d.items || []); })
      .catch((e) => setErr(String(e)));
  }, []);

  useEffect(() => { if (!demo) adminRoles().then((r) => { if (r && (r as any).owners) setRoles(r as any); }); else setRoles({ owners: ["dimitri@dfginvest.fr"], admins: [] }); }, [demo]);

  const flows = useMemo(() => (items ? buildFlows(items) : []), [items]);
  const since = range === 0 ? 0 : Date.now() - range * 86400000;
  const inRange = flows.filter((f) => f.last >= since);

  const kStarted = inRange.length;
  const kNamed = inRange.filter((f) => f.name).length;
  const kDomain = inRange.filter((f) => f.domain).length;
  const kDone = inRange.filter((f) => f.status === "done").length;

  // drop-off: how many reached each step
  const reach = STEPS.map((_, i) => inRange.filter((f) => f.step >= i).length);
  const stoppedAt = STEPS.map((_, i) => inRange.filter((f) => f.step === i && f.status !== "live").length);

  const sources = Array.from(new Set(inRange.map((f) => f.source).filter(Boolean)));
  const countries = Array.from(new Set(inRange.map((f) => f.country).filter(Boolean)));

  const anyFilter = !!(stopAt !== null || fSource || fCountry || fDevice || fName || fDomain || tab !== "all" || q);
  const shown = inRange.filter((f) => {
    if (tab !== "all" && f.status !== tab) return false;
    if (stopAt !== null && f.step !== stopAt) return false;
    if (fSource && f.source !== fSource) return false;
    if (fCountry && f.country !== fCountry) return false;
    if (fDevice === "mobile" && !/iPhone|Android|iPad/.test(f.device)) return false;
    if (fDevice === "desktop" && /iPhone|Android|iPad/.test(f.device)) return false;
    if (fName === "has" && !f.name) return false;
    if (fName === "none" && f.name) return false;
    if (fDomain === "claimed" && !f.domain) return false;
    if (fDomain === "none" && f.domain) return false;
    const sq = q.trim().toLowerCase();
    if (sq && ![f.email, f.uname, f.brief, f.name, f.domain].some((v) => v.toLowerCase().includes(sq))) return false;
    return true;
  });
  const selFlow = shown.find((f) => f.id === sel) || flows.find((f) => f.id === sel) || null;

  function clearAll() { setTab("all"); setStopAt(null); setFSource(""); setFCountry(""); setFDevice(""); setFName(""); setFDomain(""); setQ(""); }

  function exportCsv() {
    const esc = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
    const head = "user,email,brief,step,status,name,domain,source,campaign,country,device,lang,started,last_active,time_spent";
    const lines = shown.map((f) => [
      esc(f.uname), esc(f.email), esc(f.brief), esc(`${STEPS[f.step]} (${f.step}/9)`), f.status,
      esc(f.name), esc(f.domain), esc(f.source), esc(f.campaign), f.country, esc(f.device), f.lang,
      new Date(f.first).toISOString(), new Date(f.last).toISOString(), spent(f),
    ].join(","));
    download(new Blob([[head, ...lines].join("\n")], { type: "text/csv" }), `namename-flows-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  if (!me && !demo) {
    return (
      <div className="kadm gate">
        <span className="bt">NAME NAME</span>
        <p>The admin needs a signed-in admin account.</p>
        <a href={BASE() + "account"}>Sign in on the account page →</a>
      </div>
    );
  }
  if (err) {
    return (
      <div className="kadm gate">
        <span className="bt">NAME NAME</span>
        <p>Not authorized: {err}</p>
        <a href={BASE()}>← Back to the studio</a>
      </div>
    );
  }

  return (
    <div className="kadm">
      {/* top bar */}
      <div className="bar">
        <span className="brand"><span className="bt">NAME NAME</span><em>Admin</em></span>
        <input className="search" placeholder="Search email, name, brief, final name…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="ranges">
          {([["Today", 1], ["7d", 7], ["30d", 30], ["All", 0]] as const).map(([l, v]) => (
            <button key={l} className={range === v ? "on" : ""} onClick={() => setRange(v as Range)}>{l}</button>
          ))}
        </span>
        <button className="csv" onClick={exportCsv}>↓ CSV</button>
        <AvatarMenu me={me} isAdmin current="admin" onLogout={() => { saveSession(null); window.location.assign(BASE()); }} />
      </div>
      <div className="viewrow">
        <span className="seg">
          <button className={view === "flows" && !settings ? "on" : ""} onClick={() => { setView("flows"); setSettings(false); }}>Flows</button>
          <button className={view === "users" && !settings ? "on" : ""} onClick={() => { setView("users"); setSettings(false); }}>Users</button>
        </span>
        <button className={"seglink" + (settings ? " on" : "")} onClick={() => setSettings((x) => !x)}>Settings</button>
      </div>

      {settings ? (
        <div className="wrap">
          <SettingsPane me={me} />
          <div className="panelcard">
            <p className="lbl">Team &amp; roles</p>
            {(roles?.owners || []).map((e) => <p key={e}><span className="mono">{e}</span> — Owner</p>)}
            {(roles?.admins || []).map((e) => <p key={e}><span className="mono">{e}</span> — Admin <button className="rolerm" onClick={async () => { if (await roleSet(e, "user")) setRoles((r) => r && { ...r, admins: r.admins.filter((x) => x !== e) }); }}>remove</button></p>)}
            <p className="hint">Grant the admin role from the Users tab; owners come from the Worker's ADMIN_EMAILS.</p>
          </div>
        </div>
      ) : view === "users" ? (
        <UsersView flows={inRange} roles={roles} q={uq} setQ={setUq} tab={uTab} setTab={setUTab} sel={selUser} setSel={setSelUser} onRole={async (email, role) => { if (await roleSet(email, role)) setRoles((r) => r && { ...r, admins: role === "admin" ? [...r.admins, email] : r.admins.filter((x) => x !== email) }); }} />
      ) : (
        <div className="wrap">
          {/* KPIs */}
          <div className="kpis">
            {([["Flows started", kStarted], ["Reached a name", kNamed], ["Completed", kDone], ["Domain claimed", kDomain]] as const).map(([l, v]) => (
              <div key={l} className="kpi"><b>{v}</b><span>{l}</span></div>
            ))}
          </div>

          {/* drop-off chart */}
          <div className="funnel">
            {STEPS.map((st, i) => {
              const max = Math.max(1, ...reach);
              // conversion into this step: what share of the previous step's people made it here
              const conv = i > 0 && reach[i - 1] ? Math.round((reach[i] / reach[i - 1]) * 100) : null;
              // drop-off as a share of the people who started THIS step
              const stopPct = reach[i] ? Math.round((stoppedAt[i] / reach[i]) * 100) : 0;
              return (
                <Fragment key={st}>
                  {i > 0 && <span className="fconv mono" title={`${reach[i - 1]} → ${reach[i]}`}>{conv === null ? "" : `${conv}%`}</span>}
                  <button className={"fb" + (stopAt === i ? " on" : "")} onClick={() => setStopAt(stopAt === i ? null : i)} title={`${reach[i]} reached · ${stoppedAt[i]} stopped here`}>
                    <i style={{ height: `${Math.max(4, (reach[i] / max) * 72)}px` }} />
                    <b>{reach[i]}</b>
                    <span>{st}</span>
                    <em>{stoppedAt[i] && i < STEPS.length - 1 ? `−${stopPct}% stopped` : " "}</em>
                  </button>
                </Fragment>
              );
            })}
          </div>

          {/* toolbar */}
          <div className="toolbar">
            <span className="flabel">Filter</span>
            <span className="tabs">
              {([["All", "all", inRange.length], ["Live now", "live", inRange.filter((f) => f.status === "live").length], ["Stopped", "stopped", inRange.filter((f) => f.status === "stopped").length], ["Completed", "done", kDone]] as const).map(([l, v, n]) => (
                <button key={v} className={tab === v ? "on" : ""} onClick={() => setTab(v as any)}>{l} <i>{n}</i></button>
              ))}
            </span>
            <select className={fSource ? "on" : ""} value={fSource} onChange={(e) => setFSource(e.target.value)}>
              <option value="">Source</option>
              {sources.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className={fCountry ? "on" : ""} value={fCountry} onChange={(e) => setFCountry(e.target.value)}>
              <option value="">Country</option>
              {countries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className={fDevice ? "on" : ""} value={fDevice} onChange={(e) => setFDevice(e.target.value)}>
              <option value="">Device</option><option value="mobile">Mobile</option><option value="desktop">Desktop</option>
            </select>
            <select className={fName ? "on" : ""} value={fName} onChange={(e) => setFName(e.target.value)}>
              <option value="">Name</option><option value="has">Has a name</option><option value="none">No name</option>
            </select>
            <select className={fDomain ? "on" : ""} value={fDomain} onChange={(e) => setFDomain(e.target.value)}>
              <option value="">Domain</option><option value="claimed">Claimed</option><option value="none">None</option>
            </select>
            {anyFilter && <button className="clear" onClick={clearAll}>Clear</button>}
          </div>

          {/* table + panel */}
          <div className="split">
            <div className="tbl">
              {!items && <p className="hint">Loading the log…</p>}
              {items && !shown.length && <p className="hint">No flows match.</p>}
              {shown.map((f) => (
                <button key={f.id} className={"row" + (sel === f.id ? " on" : "")} onClick={() => setSel(sel === f.id ? null : f.id)}>
                  <span className="user">
                    <i className="av">{(f.uname || f.email || "?")[0].toUpperCase()}</i>
                    <span><b>{f.uname || "Anonymous"}</b><em className="mono">{f.email || "—"}</em></span>
                  </span>
                  <span className="brief">{f.brief || "—"}</span>
                  <span className="stop">
                    <b className={f.status === "live" ? "live" : ""}>{STEPS[f.step]}</b>
                    <em>{f.step + 1}/10</em>
                    <span className="segs">{STEPS.map((_, i) => <i key={i} className={i < f.step ? "d" : i === f.step ? "c" : ""} />)}</span>
                  </span>
                  <span className="nm">{f.name ? <b>{f.name}</b> : <em>{f.shortlist.join(", ") || "—"}</em>}</span>
                  <span className="dom mono">{f.domain || "—"}</span>
                  <span className="act">
                    <b>{f.status === "live" ? "● live now" : ago(f.last)}</b>
                    {f.source && <em>{f.source}</em>}
                  </span>
                </button>
              ))}
            </div>

            {selFlow && (
              <aside className="panel">
                <button className="x" onClick={() => setSel(null)}>✕</button>
                <span className={"pill " + selFlow.status}>{selFlow.status === "live" ? "● Live now" : selFlow.status === "done" ? "Completed" : `Stopped at ${STEPS[selFlow.step]}`}</span>
                <h3>{selFlow.uname || "Anonymous"}</h3>
                <p className="mono dim">{selFlow.email || "no account yet"}</p>
                <div className="meta">
                  {([["Source", selFlow.source || "—"], ["Campaign", selFlow.campaign || "—"], ["Started", fdate(selFlow.first)], ["Last active", ago(selFlow.last)], ["Time spent", spent(selFlow)], ["Sign-up", selFlow.email ? "Google" : "not yet"], ["Device", selFlow.device || "—"], ["Country · lang", `${selFlow.country || "—"} · ${selFlow.lang || "—"}`]] as const).map(([k, v]) => (
                    <p key={k}><em>{k}</em><span>{v}</span></p>
                  ))}
                </div>
                {selFlow.brief && <><p className="lbl">Brief</p><p className="val">“{selFlow.brief}”</p></>}
                {(selFlow.name || selFlow.domain) && <><p className="lbl">Name &amp; domain</p><p className="val"><b>{selFlow.name || "—"}</b>{selFlow.domain && <span className="mono"> · {selFlow.domain}</span>}</p></>}
                {!!selFlow.words.length && <><p className="lbl">Starred words</p><p className="val dim">{selFlow.words.join(" · ")}</p></>}
                {!selFlow.name && !!selFlow.shortlist.length && <><p className="lbl">Shortlist</p><p className="val dim">{selFlow.shortlist.join(" · ")}</p></>}
                <p className="lbl">Timeline</p>
                <div className="tl">
                  {selFlow.timeline.map((t) => <p key={t.step}><span className="mono">{fdate(t.at)}</span><b>{t.step}</b></p>)}
                </div>
                {selFlow.email && <a className="mailbtn" href={`mailto:${selFlow.email}?subject=Your name on Name Name`}>Email user</a>}
              </aside>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Admin · Users: one row per account, aggregated from the flows ── */
interface AdminUser {
  email: string; uname: string; first: number; last: number;
  source: string; country: string; flows: number; names: number; role: "Owner" | "Admin" | "User";
  theirFlows: Flow[];
}
function UsersView({ flows, roles, q, setQ, tab, setTab, sel, setSel, onRole }: {
  flows: Flow[]; roles: { owners: string[]; admins: string[] } | null;
  q: string; setQ: (s: string) => void;
  tab: "all" | "new" | "named" | "admins"; setTab: (t: any) => void;
  sel: string | null; setSel: (s: string | null) => void;
  onRole: (email: string, role: "admin" | "user") => void;
}) {
  const by = new Map<string, AdminUser>();
  for (const f of flows) {
    if (!f.email) continue;
    const u = by.get(f.email) || { email: f.email, uname: f.uname, first: f.first, last: f.last, source: f.source, country: f.country, flows: 0, names: 0, role: "User" as const, theirFlows: [] };
    u.uname = u.uname || f.uname;
    u.first = Math.min(u.first, f.first);
    u.last = Math.max(u.last, f.last);
    u.source = u.source || f.source;
    u.country = u.country || f.country;
    u.flows += 1;
    if (f.name) u.names += 1;
    u.theirFlows.push(f);
    by.set(f.email, u);
  }
  const users = Array.from(by.values()).map((u) => ({
    ...u,
    role: roles?.owners.includes(u.email.toLowerCase()) ? "Owner" as const : roles?.admins.includes(u.email.toLowerCase()) ? "Admin" as const : "User" as const,
  })).sort((a, b) => b.last - a.last);
  const week = Date.now() - 7 * 864e5;
  const shown = users.filter((u) => {
    if (tab === "new" && u.first < week) return false;
    if (tab === "named" && !u.names) return false;
    if (tab === "admins" && u.role === "User") return false;
    const sq = q.trim().toLowerCase();
    if (sq && ![u.email, u.uname].some((v) => v.toLowerCase().includes(sq))) return false;
    return true;
  });
  const selU = shown.find((u) => u.email === sel) || users.find((u) => u.email === sel) || null;
  return (
    <div className="wrap">
      <div className="kpis">
        {([["Users", users.length], ["Found a name", users.filter((u) => u.names).length], ["Came back (2+)", users.filter((u) => u.flows > 1).length], ["Admins", users.filter((u) => u.role !== "User").length]] as const).map(([l, v]) => (
          <div key={l} className="kpi"><b>{v}</b><span>{l}</span></div>
        ))}
      </div>
      <div className="toolbar">
        <span className="tabs">
          {([["All", "all"], ["New this week", "new"], ["With a name", "named"], ["Admins", "admins"]] as const).map(([l, v]) => (
            <button key={v} className={tab === v ? "on" : ""} onClick={() => setTab(v)}>{l}</button>
          ))}
        </span>
        <input className="usearch" placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="split">
        <div className="tbl">
          {!shown.length && <p className="hint">No users yet (accounts appear with their first tracked flow).</p>}
          {shown.map((u) => (
            <button key={u.email} className={"row urow" + (sel === u.email ? " on" : "")} onClick={() => setSel(sel === u.email ? null : u.email)}>
              <span className="user">
                <i className="av">{(u.uname || u.email)[0].toUpperCase()}</i>
                <span><b>{u.uname || "—"}</b><em className="mono">{u.email}</em></span>
              </span>
              <span className="mono dimtxt">{new Date(u.first).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
              <span className="dimtxt">{u.source || "—"}</span>
              <span className="dimtxt">{u.country || "—"}</span>
              <span className="mono">{u.flows}</span>
              <span className="mono">{u.names}</span>
              <span className="dimtxt">{ago(u.last)}</span>
              <span className={"rolepill" + (u.role !== "User" ? " dark" : "")}>{u.role}</span>
            </button>
          ))}
        </div>
        {selU && (
          <aside className="panel">
            <button className="x" onClick={() => setSel(null)}>✕</button>
            <h3>{selU.uname || selU.email}</h3>
            <p className="mono dim">{selU.email}</p>
            <div className="meta">
              {([["Signed up", new Date(selU.first).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) + " · Google"], ["Source", selU.source || "—"], ["Country", selU.country || "—"], ["Last active", ago(selU.last)], ["Flows", String(selU.flows)], ["Names found", String(selU.names)]] as const).map(([k, v]) => (
                <p key={k}><em>{k}</em><span>{v}</span></p>
              ))}
            </div>
            <p className="lbl">Their flows</p>
            {selU.theirFlows.map((f) => (
              <div key={f.id} className="miniflow">
                <b>{f.name || f.brief.slice(0, 32) || f.id}</b>
                <span className="segs">{STEPS.map((_, i) => <i key={i} className={i < f.step ? "d" : i === f.step ? "c" : ""} />)}</span>
              </div>
            ))}
            {selU.role !== "Owner" && (
              <>
                <p className="lbl">Role</p>
                <span className="roleswitch">
                  <button className={selU.role === "User" ? "on" : ""} onClick={() => onRole(selU.email, "user")}>User</button>
                  <button className={selU.role === "Admin" ? "on" : ""} onClick={() => onRole(selU.email, "admin")}>Admin</button>
                </span>
              </>
            )}
            <a className="mailbtn" href={`mailto:${selU.email}`}>Email user</a>
          </aside>
        )}
      </div>
    </div>
  );
}

/* ?demo: a believable day of traffic for styling and previews */
const H = 3600000;
const now = Date.now();
const mk = (process: string, phase: string, dt: number, payload: any = {}, geo = "FR", output: any = {}): LogItem =>
  ({ id: process + phase + dt, at: now - dt, process, phase, input: { payload, geo }, output });
const meta1 = { meta: { source: "Google Ads", campaign: 'google · "ai naming tool"', device: "iPhone · Safari", lang: "fr-FR", email: "sam@okafor.co", uname: "Sam Okafor" } };
const meta2 = { meta: { source: "Organic search", campaign: "google.com", device: "Mac · Chrome", lang: "en-GB", email: "lea@maison.paris", uname: "Léa Vidal" } };
const meta3 = { meta: { source: "Referral", campaign: "shared name", device: "Android · Chrome", lang: "es-ES" } };
const meta4 = { meta: { source: "Product Hunt", campaign: "launch day", device: "Mac · Safari", lang: "en-US", email: "jo@brick.studio", uname: "Jo Brick" } };
const DEMO_ITEMS: LogItem[] = [
  mk("p1", "signup", 26 * H, meta1), mk("p1", "search", 26 * H - 60000, { sentence: "Une appli qui organise les repas de la semaine", ...meta1 }),
  mk("p1", "wrapconcept", 25.9 * H, { sentence: "Une appli repas" }), mk("p1", "wrapwords", 25.8 * H), 
  mk("p1", "wrapnames", 25.6 * H, { words: [{ w: "mijoter" }, { w: "cadence" }, { w: "panier" }] }, "FR", { names: [{ name: "Mijo" }, { name: "Cadane" }, { name: "Panette" }] }),
  mk("p1", "pick", 25.5 * H, { name: "Mijo", ...meta1 }), mk("p1", "domain", 25.4 * H, { domain: "mijo.app", ...meta1 }),
  mk("p1", "logo", 25.2 * H, meta1), mk("p1", "book", 25 * H, meta1), mk("p1", "done", 24.9 * H, { name: "Mijo", ...meta1 }),
  mk("p2", "signup", 5 * H, meta2), mk("p2", "search", 5 * H - 60000, { sentence: "A B2B platform that automates carbon accounting", ...meta2 }),
  mk("p2", "wrapconcept", 4.9 * H), mk("p2", "wrapwords", 4.8 * H),
  mk("p2", "wrapnames", 4.5 * H, { words: [{ w: "ledger" }, { w: "north" }] }, "GB", { names: [{ name: "Carbent" }, { name: "Fathom" }, { name: "Nordica" }] }),
  mk("p3", "signup", 0.2 * H, meta3, "ES"), mk("p3", "search", 0.2 * H - 60000, { sentence: "Una marca de café de especialidad", ...meta3 }, "ES"),
  mk("p3", "wrapconcept", 0.15 * H, {}, "ES"),
  mk("p4", "signup", 50 * H, meta4, "US"), mk("p4", "search", 50 * H - 60000, { sentence: "A tool that turns podcasts into newsletters", ...meta4 }, "US"),
  mk("p4", "wrapconcept", 49.9 * H, {}, "US"), mk("p4", "wrapwords", 49.8 * H, {}, "US"),
  mk("p4", "wrapnames", 49.5 * H, { words: [{ w: "echo" }, { w: "letter" }] }, "US", { names: [{ name: "Echolet" }, { name: "Castnote" }] }),
  mk("p4", "pick", 49.4 * H, { name: "Echolet", ...meta4 }, "US"),
];
