// The Name Name admin dashboard (handoff: Known As Admin): every flow that
// started, where it stopped, who the user is and where they came from.
// White "paper" theme, session-gated server-side (adminlog needs an admin token).
import { useEffect, useMemo, useRef, useState } from "react";
import "./wrapped.css";
import { ENDPOINT, loadSession, saveSession } from "./api";
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
      if (e.phase === "search" && p.sentence) f.brief = p.sentence;
      if (e.phase === "wrapconcept" && !f.brief && e.input?.payload?.sentence) f.brief = e.input.payload.sentence;
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
  const [menu, setMenu] = useState(false);
  const [settings, setSettings] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const BASE = () => (import.meta as any).env.BASE_URL || "/";

  const demo = new URLSearchParams(window.location.search).has("demo");
  useEffect(() => {
    if (demo) { setItems(DEMO_ITEMS); return; }
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phase: "adminlog", token: loadSession()?.token || "", limit: 300 }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.error) setErr(String(d.error)); else setItems(d.items || []); })
      .catch((e) => setErr(String(e)));
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, []);

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
        <div className="avwrap" ref={menuRef}>
          <button className="avatar" onClick={() => setMenu((m) => !m)}>{(me.name || me.email)[0].toUpperCase()}</button>
          {menu && (
            <div className="menu">
              <p className="who"><b>{me.name || "Admin"}</b><span>{me.email}</span></p>
              <p className="lbl">Switch view</p>
              <a href={BASE() + "account"}>My names</a>
              <a className="on" href={BASE() + "admin"}>Admin ✓</a>
              <button onClick={() => { setSettings((s) => !s); setMenu(false); }}>{settings ? "← Dashboard" : "Settings"}</button>
              <button onClick={() => { saveSession(null); window.location.assign(BASE()); }}>Log out</button>
            </div>
          )}
        </div>
      </div>

      {settings ? (
        <div className="wrap">
          <h2>Settings</h2>
          <div className="panelcard">
            <p className="lbl">Profile</p>
            <p><b>{me.name || "Admin"}</b> · <span className="mono">{me.email}</span> <em>(Google, read-only)</em></p>
          </div>
          <div className="panelcard">
            <p className="lbl">Team &amp; roles</p>
            <p><span className="mono">dimitri@dfginvest.fr</span> — Owner</p>
            <a className="invite" href={`mailto:?subject=Join the Name Name admin&body=Ask Dimitri to add your Google address to ADMIN_EMAILS.`}>＋ Invite by email</a>
            <p className="hint">Admins are the addresses in the Worker's ADMIN_EMAILS variable.</p>
          </div>
        </div>
      ) : (
        <div className="wrap">
          {/* KPIs */}
          <div className="kpis">
            {([["Flows started", kStarted], ["Reached a name", kNamed], ["Domain claimed", kDomain], ["Completed", kDone]] as const).map(([l, v]) => (
              <div key={l} className="kpi"><b>{v}</b><span>{l}</span></div>
            ))}
          </div>

          {/* drop-off chart */}
          <div className="funnel">
            {STEPS.map((st, i) => {
              const max = Math.max(1, ...reach);
              return (
                <button key={st} className={"fb" + (stopAt === i ? " on" : "")} onClick={() => setStopAt(stopAt === i ? null : i)} title={`${reach[i]} reached · ${stoppedAt[i]} stopped`}>
                  <i style={{ height: `${Math.max(4, (reach[i] / max) * 72)}px` }} />
                  <b>{reach[i]}</b>
                  <span>{st}</span>
                  <em>{stoppedAt[i] ? `−${stoppedAt[i]} stopped` : " "}</em>
                </button>
              );
            })}
          </div>

          {/* toolbar */}
          <div className="toolbar">
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
                  {([["Source", selFlow.source || "—"], ["Campaign", selFlow.campaign || "—"], ["Started", fdate(selFlow.first)], ["Last active", ago(selFlow.last)], ["Time spent", spent(selFlow)], ["Device", selFlow.device || "—"], ["Country · lang", `${selFlow.country || "—"} · ${selFlow.lang || "—"}`]] as const).map(([k, v]) => (
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
