// The Name Name admin dashboard (handoff: Known As Admin): every flow that
// started, where it stopped, who the user is and where they came from.
// White "paper" theme, session-gated server-side (adminlog needs an admin token).
import { Fragment, useEffect, useMemo, useState } from "react";
import "./wrapped.css";
import { ENDPOINT, adminRoles, loadSession, roleSet, saveSession } from "./api";
import { AvatarMenu, SettingsPane } from "./paper";
import { download } from "./zip";

interface LogItem { id: string; at: number; process?: string; phase: string; input?: any; output?: any }
// One day of ad spend, pushed by the Google Ads Script (phase "adspush").
interface AdsDay { date: string; rows: { channel: string; campaign: string; cost: number; clicks: number; impressions: number }[] }

export const STEPS = ["Sign up", "Brief", "Concept", "Words", "Names", "Domain", "Logo", "Brand book", "Socials", "Completed"] as const;
// The landing PRE-CHARGES the concept and the words while a visitor is still
// typing — before the gate. A wrap* phase therefore no longer proves anyone SAW
// a step: steps come from the client's own events ("page" + explicit actions).
const ACTION_STEP: Record<string, number> = {
  signup: 0, search: 1, brandsum: 2, wordsdone: 3, wordshuffle: 3,
  morenames: 4, pick: 4, domain: 5, godaddy: 5, taste: 6, logo: 6, logopers: 6, logopack: 6,
  book: 7, bookpreview: 7, social: 8, done: 9,
};
// Flows from before the "page" event existed fall back to generation phases.
const LEGACY_STEP: Record<string, number> = { wrapchips: 1, wrapconcept: 2, wrapwords: 3, wrapnames: 4 };
const PAGE_STEP: Record<string, number> = {
  ask: 1, brief: 1, refine: 2, brands: 2, brandsum: 2, words: 3, names: 4, claim: 5, reveal: 5,
  domain: 5, taste: 6, logo: 6, logodone: 6, pers: 6, book: 7, socials: 8, done: 9,
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
  buy: boolean;                   // clicked out to buy the domain
  source: string; campaign: string; content: string; device: string; lang: string; country: string;
  feedback: string;               // the 04·x/04·i exit poll, when the user answered it
  gateOnly?: boolean;             // the landing gate's stray sign-up group (folds into the real flow)
  timeline: { at: number; step: string }[];
}

function buildFlows(items: LogItem[]): { flows: Flow[]; gated: number[] } {
  const by = new Map<string, LogItem[]>();
  for (const it of items) {
    if (!it.process) continue;
    if (!by.has(it.process)) by.set(it.process, []);
    by.get(it.process)!.push(it);
  }
  const flows: Flow[] = [];
  const gated: number[] = []; // visitors who typed a brief at the gate and left (last-seen times)
  for (const [id, evs] of by) {
    evs.sort((a, b) => a.at - b.at);
    const f: Flow = {
      id, first: evs[0].at, last: evs[evs.length - 1].at, step: 0, status: "stopped",
      email: "", uname: "", brief: "", name: "", shortlist: [], words: [], domain: "", buy: false,
      source: "", campaign: "", content: "", device: "", lang: "", country: "", feedback: "", timeline: [],
    };
    // pass 1: identity + content (the email can arrive on any event)
    for (const e of evs) {
      const p = e.input?.payload || {};
      const m = p.meta || e.input?.who; // track() puts it in the payload; every other call carries `who`
      if (m) {
        if (m.email && !f.email) f.email = m.email;
        if (m.uname && !f.uname) f.uname = m.uname;
        if (m.source) f.source = m.source;
        if (m.campaign) f.campaign = m.campaign;
        if (m.content) f.content = m.content;
        if (m.device) f.device = m.device;
        if (m.lang) f.lang = m.lang;
      }
      // the sign-up lead (worker-logged) names the pre-charge group
      if (e.phase === "lead" && p.email && !f.email) { f.email = String(p.email); if (p.fromName && !f.uname) f.uname = String(p.fromName); }
      if (e.input?.geo) f.country = e.input.geo;
      // The brief rides on many phases (search, concept, words, names): take it
      // from any of them, so a truncated log window still shows it.
      const sent = p.sentence || e.input?.payload?.sentence;
      if (sent && !f.brief) f.brief = sent;
      if (e.phase === "feedback") f.feedback = [Array.isArray(p.reasons) ? p.reasons.join(" · ") : "", p.note].filter(Boolean).join(" — ");
      if (e.phase === "pick" && p.name) f.name = p.name;
      if (e.phase === "done" && p.name) f.name = f.name || p.name;
      if (e.phase === "domain" && p.domain) f.domain = p.domain;
      if (e.phase === "godaddy") f.buy = true; // historic event name for the buy click
      if (e.phase === "wrapnames") {
        const names = (e.output?.names || []).map((n: any) => n?.name).filter(Boolean);
        if (names.length) f.shortlist = names.slice(0, 3);
        const w = (e.input?.payload?.words || []).map((x: any) => x?.w).filter(Boolean);
        if (w.length) f.words = w.slice(0, 10);
      }
    }
    // pass 2: steps. "page" + action events are the truth; wrap* generation
    // phases count only for legacy signed-in flows (pre-charge made them
    // meaningless for anyone else — they fire before the gate).
    const hasPages = evs.some((e) => e.phase === "page");
    let anyStep = false;
    for (const e of evs) {
      const p = e.input?.payload || {};
      const st = e.phase === "page" ? PAGE_STEP[String(p.to || "")] :
        ACTION_STEP[e.phase] !== undefined ? ACTION_STEP[e.phase] :
        !hasPages && f.email ? LEGACY_STEP[e.phase] : undefined;
      if (st === undefined) continue;
      anyStep = true;
      if (st > f.step) f.step = st;
      f.timeline.push({ at: e.at, step: STEPS[st] });
    }
    // dedupe timeline steps, keep first hit of each
    const seen = new Set<string>();
    f.timeline = f.timeline.filter((t) => { if (seen.has(t.step)) return false; seen.add(t.step); return true; });
    // A group with no real step is either the gate's stray sign-up (folds into
    // the user's flow below) or an anonymous visitor who typed a brief into the
    // landing and left at the gate — counted, not listed.
    const stepped = evs.filter((e) => ACTION_STEP[e.phase] !== undefined || e.phase === "page");
    f.gateOnly = !anyStep || stepped.every((e) => e.phase === "signup");
    if (f.gateOnly && !f.email) { if (f.brief) gated.push(f.last); continue; }
    // a signed-in flow passed Sign up by definition
    if (f.email && !f.timeline.some((t) => t.step === STEPS[0])) f.timeline.unshift({ at: f.first, step: STEPS[0] });
    f.status = f.step >= 9 ? "done" : Date.now() - f.last < 30 * 60000 ? "live" : "stopped";
    flows.push(f);
  }
  // ONE PERSON = ONE ROW: everything logged under the same email folds into the
  // furthest flow — the pre-charge twin, the gate's sign-up group, and splits
  // from stale cached bundles or a mid-flow restart.
  const byEmail = new Map<string, Flow[]>();
  for (const f of flows) {
    if (!f.email) continue;
    const k = f.email.toLowerCase();
    if (!byEmail.has(k)) byEmail.set(k, []);
    byEmail.get(k)!.push(f);
  }
  const absorbed = new Set<Flow>();
  for (const group of byEmail.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => (b.step - a.step) || (b.last - a.last));
    const main = group[0];
    for (const o of group.slice(1)) {
      absorbed.add(o);
      main.first = Math.min(main.first, o.first);
      main.last = Math.max(main.last, o.last);
      if (o.brief.length > main.brief.length) main.brief = o.brief;
      main.uname ||= o.uname; main.name ||= o.name; main.domain ||= o.domain; main.buy ||= o.buy;
      main.source ||= o.source; main.campaign ||= o.campaign; main.content ||= o.content;
      main.device ||= o.device; main.lang ||= o.lang; main.country ||= o.country;
      main.feedback ||= o.feedback;
      if (!main.words.length) main.words = o.words;
      if (!main.shortlist.length) main.shortlist = o.shortlist;
      main.timeline = main.timeline.concat(o.timeline);
    }
    main.timeline.sort((a, b) => a.at - b.at);
    const seen = new Set<string>();
    main.timeline = main.timeline.filter((t) => { if (seen.has(t.step)) return false; seen.add(t.step); return true; });
    main.gateOnly = false;
    main.status = main.step >= 9 ? "done" : Date.now() - main.last < 30 * 60000 ? "live" : "stopped";
  }
  const merged = flows.filter((f) => !absorbed.has(f));
  return { flows: merged.sort((a, b) => b.last - a.last), gated };
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

// "today"/"yday" are calendar days in the admin's own timezone; a string is a
// picked date ("YYYY-MM-DD"); numbers are rolling windows; 0 is everything.
type Range = "today" | "yday" | 7 | 30 | 0 | string;

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
  const [view, setView] = useState<"flows" | "users" | "analysis" | "feedback">(
    window.location.pathname.includes("/admin/users") ? "users" :
    window.location.pathname.includes("/admin/analysis") ? "analysis" :
    window.location.pathname.includes("/admin/feedback") ? "feedback" : "flows");
  const [ads, setAds] = useState<AdsDay[] | null>(null);
  const [roles, setRoles] = useState<{ owners: string[]; admins: string[] } | null>(null);
  const [selUser, setSelUser] = useState<string | null>(null);
  const [uq, setUq] = useState("");
  const [uTab, setUTab] = useState<"all" | "new" | "named" | "admins">("all");

  const BASE = () => (import.meta as any).env.BASE_URL || "/";

  const demo = new URLSearchParams(window.location.search).has("demo");
  useEffect(() => {
    if (demo) { setItems(DEMO_ITEMS); setAds(DEMO_ADS); return; }
    // The log keeps the whole history and one call may only touch ~900 keys:
    // page through with the cursor, painting as the pages land (newest first).
    let dead = false;
    (async () => {
      const all: LogItem[] = [];
      let cursor: string | undefined;
      for (let i = 0; i < 30 && !dead; i++) {
        const d = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ phase: "adminlog", token: loadSession()?.token || "", limit: 900, cursor }),
        }).then((r) => r.json());
        if (dead) return;
        if (d.error) { setErr(String(d.error)); return; }
        all.push(...(d.items || []));
        setItems([...all]);
        if (!d.cursor) break;
        cursor = d.cursor;
      }
    })().catch((e) => { if (!dead) setErr(String(e)); });
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phase: "adminads", token: loadSession()?.token || "" }),
    }).then((r) => r.json()).then((d) => { if (!dead && !d.error) setAds((d.days || []).sort((a: AdsDay, b: AdsDay) => a.date < b.date ? 1 : -1)); }).catch(() => {});
    return () => { dead = true; };
  }, []);

  useEffect(() => { if (!demo) adminRoles().then((r) => { if (r && (r as any).owners) setRoles(r as any); }); else setRoles({ owners: ["dimitri@dfginvest.fr"], admins: [] }); }, [demo]);

  const built = useMemo(() => (items ? buildFlows(items) : { flows: [], gated: [] }), [items]);
  const flows = built.flows;
  const [from, to] = ((): [number, number] => {
    const now = Date.now();
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    const t0 = d0.getTime();
    if (range === "today") return [t0, now];
    if (range === "yday") return [t0 - 86400000, t0];
    if (range === 0) return [0, now];
    if (typeof range === "number") return [now - range * 86400000, now];
    const d = new Date(range + "T00:00:00"); // a picked calendar day
    const s = isNaN(d.getTime()) ? t0 : d.getTime();
    return [s, s + 86400000];
  })();
  const inRange = flows.filter((f) => f.last >= from && f.last < to);
  const gatedN = built.gated.filter((t) => t >= from && t < to).length;

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
    const head = "user,email,brief,step,status,name,domain,source,campaign,ad_group,country,device,lang,started,last_active,time_spent";
    const lines = shown.map((f) => [
      esc(f.uname), esc(f.email), esc(f.brief), esc(`${STEPS[f.step]} (${f.step}/9)`), f.status,
      esc(f.name), esc(f.domain), esc(f.source), esc(f.campaign), esc(f.content), f.country, esc(f.device), f.lang,
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
          {([["Today", "today"], ["Yesterday", "yday"], ["7d", 7], ["30d", 30], ["All", 0]] as const).map(([l, v]) => (
            <button key={l} className={range === v ? "on" : ""} onClick={() => setRange(v as Range)}>{l}</button>
          ))}
          <input
            type="date" className={"day" + (typeof range === "string" && range !== "today" && range !== "yday" ? " on" : "")}
            value={typeof range === "string" && range !== "today" && range !== "yday" ? range : ""}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => e.target.value && setRange(e.target.value)}
            title="Pick a day"
          />
        </span>
        <button className="csv" onClick={exportCsv}>↓ CSV</button>
        <AvatarMenu me={me} isAdmin current="admin" onLogout={() => { saveSession(null); window.location.assign(BASE()); }} />
      </div>
      <div className="viewrow">
        <span className="seg">
          {(["flows", "users", "analysis", "feedback"] as const).map((v) => (
            <button key={v} className={view === v && !settings ? "on" : ""} onClick={() => { setView(v); setSettings(false); }}>{v[0].toUpperCase() + v.slice(1)}</button>
          ))}
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
      ) : view === "analysis" ? (
        <AnalysisView flows={flows} ads={ads} loading={!items} />
      ) : view === "feedback" ? (
        <FeedbackView items={items || []} flows={flows} from={from} to={to} loading={!items}
          onOpenFlow={(id) => { setRange(0); setSel(id); setView("flows"); }} />
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
          {gatedN > 0 && <p className="gatenote mono">+ {gatedN} typed a brief and left at the sign-up gate</p>}

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
                  {([["Source", selFlow.source || "—"], ["Campaign", selFlow.campaign || "—"], ["Ad group", selFlow.content || "—"], ["Started", fdate(selFlow.first)], ["Last active", ago(selFlow.last)], ["Time spent", spent(selFlow)], ["Sign-up", selFlow.email ? "Google" : "not yet"], ["Device", selFlow.device || "—"], ["Country · lang", `${selFlow.country || "—"} · ${selFlow.lang || "—"}`]] as const).map(([k, v]) => (
                    <p key={k}><em>{k}</em><span>{v}</span></p>
                  ))}
                </div>
                {selFlow.brief && <><p className="lbl">Brief</p><p className="val">“{selFlow.brief}”</p></>}
                {selFlow.feedback && <><p className="lbl">Feedback</p><p className="val">{selFlow.feedback}</p></>}
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

/* ── Admin · Analysis: one channel, every step, week by week (A·a·2 / A·m·a2) ── */
const CHANNELS: [string, string][] = [
  ["All channels", "#000"], ["Google Ads", "#4285F4"], ["Meta Ads", "#0866FF"], ["LinkedIn Ads", "#0A66C2"],
  ["Organic search", "#12A36B"], ["Referral", "#F59E0B"], ["Product Hunt", "#DA552F"], ["Newsletter", "#8B5CF6"], ["Direct", "#6A6A6A"],
];
const PAID = new Set(["Google Ads", "Meta Ads", "LinkedIn Ads"]);
type WeekMet = { spend: number; clicks: number; started: number; signed: number; brief: number; words: number; name: number; brand: number; buy: number };
const AROWS: { k: keyof WeekMet; t: string; s: string; d: string; main?: boolean }[] = [
  { k: "clicks", t: "Clicks", s: "Clicks", d: "clicked an ad (visits for free channels)" },
  { k: "started", t: "Started", s: "Started", d: "typed a brief, pressed “Name it”" },
  { k: "signed", t: "Sign-ups", s: "Sign-ups", d: "signed in at the gate" },
  { k: "brief", t: "Brief confirmed", s: "Brief", d: "continued into the brand swipe" },
  { k: "words", t: "Words starred", s: "Words", d: "starred words and moved on" },
  { k: "name", t: "Name chosen", s: "Name chosen", d: "continued with a name", main: true },
  { k: "brand", t: "Brand done", s: "Brand done", d: "logo + brand book" },
  { k: "buy", t: "Buy click", s: "Buy click", d: "clicked to buy the domain" },
];
const WMS = 7 * 864e5;
const mondayOf = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
const isoWeek = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); const y0 = new Date(d.getFullYear(), 0, 4); return 1 + Math.round(((d.getTime() - y0.getTime()) / 864e5 - 3 + ((y0.getDay() + 6) % 7)) / 7); };
const weekLabel = (t: number) => {
  const a = new Date(t), b = new Date(t + 6 * 864e5);
  const m = (x: Date) => x.toLocaleDateString("en-GB", { month: "short" });
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${m(b)}` : `${a.getDate()} ${m(a)}–${b.getDate()} ${m(b)}`;
};
const eur = (v: number) => "€" + (v >= 1000 ? Math.round(v).toLocaleString("en-US") : v >= 100 ? v.toFixed(0) : v.toFixed(2));

function Delta({ cur, was, costly }: { cur: number; was: number; costly?: boolean }) {
  if (!was || !isFinite(cur) || !isFinite(was)) return <em className="dlt flat">—</em>;
  const pct = Math.round(((cur - was) / was) * 100);
  const good = costly ? pct <= 0 : pct >= 0;
  return <em className={"dlt " + (good ? "up" : "down")}>{pct >= 0 ? "▲" : "▼"} {Math.abs(pct)}%</em>;
}

function AnalysisView({ flows, ads, loading }: { flows: Flow[]; ads: AdsDay[] | null; loading: boolean }) {
  const [chan, setChan] = useState("Google Ads");
  const [wk, setWk] = useState(0);
  // Week columns by default; the toggle narrows every column to one day.
  const [gran, setGran] = useState<"week" | "day">("week");
  const paid = chan === "All channels" || PAID.has(chan);
  const SPAN = gran === "week" ? WMS : 864e5;
  const day0 = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
  const p0 = gran === "week" ? mondayOf(Date.now()) : day0;
  const weeks = useMemo(() => Array.from({ length: 10 }, (_, i) => p0 - i * SPAN), [p0, SPAN]);
  const met: WeekMet[] = useMemo(() => weeks.map((t) => {
    let spend = 0, adClicks = 0;
    for (const d of ads || []) {
      const dt = new Date(d.date + "T00:00:00").getTime();
      if (dt < t || dt >= t + SPAN) continue;
      for (const r of d.rows || []) if (chan === "All channels" || r.channel === chan) { spend += r.cost || 0; adClicks += r.clicks || 0; }
    }
    const fl = flows.filter((f) => f.first >= t && f.first < t + SPAN && (chan === "All channels" || f.source === chan));
    const freeVisits = chan === "All channels" ? fl.filter((f) => !PAID.has(f.source)).length : PAID.has(chan) ? 0 : fl.length;
    return {
      spend, clicks: adClicks + freeVisits,
      started: fl.filter((f) => f.step >= 1 || f.brief).length,
      signed: fl.filter((f) => f.email).length,
      // the deep-dive (02·r, step 2) is open to anonymous founders, so Brief
      // confirmed counts only signed flows past it — the gate sits at the swipe
      brief: fl.filter((f) => f.email && f.step >= 2).length,
      words: fl.filter((f) => f.step >= 4).length,
      name: fl.filter((f) => f.step >= 5).length,
      brand: fl.filter((f) => f.step >= 7).length,
      buy: fl.filter((f) => f.buy).length,
    };
  }), [weeks, flows, ads, chan, SPAN]);
  const sum = (a: WeekMet[], k: keyof WeekMet) => a.reduce((s, m) => s + m[k], 0);
  const l5 = met.slice(0, 5), p5 = met.slice(5, 10);
  const spend5 = sum(l5, "spend"), spendP = sum(p5, "spend");
  const sign5 = sum(l5, "signed"), signP = sum(p5, "signed");
  const name5 = sum(l5, "name"), nameP = sum(p5, "name");
  const cps = sign5 ? spend5 / sign5 : 0, cpsP = signP ? spendP / signP : 0;
  const cpn = name5 ? spend5 / name5 : 0, cpnP = nameP ? spendP / nameP : 0;
  const lastAdDay = (ads || [])[0]?.date;
  const pTitle = (t: number) => gran === "week" ? `W${isoWeek(t)}` : new Date(t).toLocaleDateString("en-GB", { weekday: "short" });
  const pSub = (t: number) => gran === "week" ? weekLabel(t) : new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const cell = (m: WeekMet, prevM: WeekMet | undefined, ri: number, hid: boolean) => {
    const r = AROWS[ri];
    const v = m[r.k];
    const h = hid ? " wkhid" : "";
    const stepBase = ri === 0 ? 0 : m[AROWS[ri - 1].k];
    const tot = m.clicks ? (v / m.clicks) * 100 : 0;
    const totPrev = prevM && prevM.clicks ? (prevM[r.k] / prevM.clicks) * 100 : null;
    const pts = totPrev === null ? null : tot - totPrev;
    return (
      <Fragment>
        <td className={"mono n" + h}>{v.toLocaleString("en-US")}</td>
        <td className={"mono dim" + h}>{paid && m.spend && v ? eur(m.spend / v) : "—"}</td>
        <td className={"mono" + h}>{ri === 0 ? "—" : stepBase ? Math.round((v / stepBase) * 100) + "%" : "—"}</td>
        <td className={"mono tot" + h}>
          {ri === 0 ? (m.clicks ? "100%" : "—") : m.clicks ? (tot >= 10 ? Math.round(tot) : tot.toFixed(1)) + "%" : "—"}
          {ri > 0 && pts !== null && m.clicks ? <i className={pts >= 0 ? "up" : "down"}>{pts >= 0 ? "▲" : "▼"} {Math.abs(pts).toFixed(1)}</i> : <i className="ghost">{" "}</i>}
        </td>
      </Fragment>
    );
  };
  return (
    <div className="wrap ana">
      <div className="anahead">
        <h2>Channel performance</h2>
        <span className="mono sub">{chan} · last 5 {gran}s vs the 5 before</span>
        <span className="gsel">
          <button className={gran === "week" ? "on" : ""} onClick={() => { setGran("week"); setWk(0); }}>Weeks</button>
          <button className={gran === "day" ? "on" : ""} onClick={() => { setGran("day"); setWk(0); }}>Days</button>
        </span>
        {lastAdDay
          ? <span className="sync"><i /> Ads synced · through {lastAdDay}</span>
          : <span className="sync none">No spend data yet — paste docs/ads/ads-script.js into Google Ads → Scripts</span>}
      </div>
      <div className="anakpis">
        <div className="akpi"><span>Spend</span><b className="mono">{eur(spend5)}</b><Delta cur={spend5} was={spendP} /><em className="was mono">was {eur(spendP)}</em></div>
        <div className="akpi"><span>Sign-ups</span><b className="mono">{sign5.toLocaleString("en-US")}</b><Delta cur={sign5} was={signP} /><em className="was mono">was {signP}</em></div>
        <div className="akpi"><span>Names chosen</span><b className="mono">{name5.toLocaleString("en-US")}</b><Delta cur={name5} was={nameP} /><em className="was mono">was {nameP}</em></div>
        <div className="akpi"><span>Cost per sign-up</span><b className="mono">{sign5 && paid ? eur(cps) : "—"}</b><Delta cur={cps} was={cpsP} costly /><em className="was mono">was {signP && paid ? eur(cpsP) : "—"}</em></div>
        <div className="akpi main"><span>Cost per name <i className="maintag">MAIN</i></span><b className="mono">{name5 && paid ? eur(cpn) : "—"}</b><Delta cur={cpn} was={cpnP} costly /><em className="was mono">was {nameP && paid ? eur(cpnP) : "—"}</em></div>
      </div>
      <div className="chips">
        {CHANNELS.map(([c, dot]) => (
          <button key={c} className={"chip" + (chan === c ? " on" : "")} onClick={() => setChan(c)}>
            {c !== "All channels" && <i style={{ background: dot }} />}{c}
          </button>
        ))}
      </div>

      {/* mobile: one week at a time */}
      <div className="wksel">
        {weeks.slice(0, 5).map((t, i) => (
          <button key={t} className={wk === i ? "on" : ""} onClick={() => setWk(i)}>
            <b>{pTitle(t)}</b><span>{i === 0 ? "so far" : pSub(t)}</span>
          </button>
        ))}
      </div>

      <div className="anascroll">
        <table className="anatbl">
          <thead>
            <tr className="wks">
              <th className="stp" />
              {weeks.slice(0, 5).map((t, i) => (
                <th key={t} colSpan={4} className={"wkh" + (i === wk ? " sel" : "")}>
                  <b>{pTitle(t)}</b> <span>{pSub(t)}{i === 0 ? " · so far" : ""}</span>
                  {paid && <em className="mono">{eur(met[i].spend)}</em>}
                </th>
              ))}
            </tr>
            <tr className="subs">
              <th className="stp">STEP<u className="sm"> · {pTitle(weeks[wk])} {pSub(weeks[wk])}</u></th>
              {weeks.slice(0, 5).map((t, i) => {
                const h = i === wk ? "" : " wkhid";
                return <Fragment key={t}><th className={"h" + h}>#</th><th className={"h" + h}>{paid ? "€ / #" : ""}</th><th className={"h" + h}>Step</th><th className={"h" + h}>Total</th></Fragment>;
              })}
            </tr>
          </thead>
          <tbody>
            {AROWS.map((r, ri) => (
              <tr key={r.k} className={r.main ? "mainrow" : ""}>
                <td className="stp"><b><u className="lg">{r.t}</u><u className="sm">{r.s}</u>{r.main ? <i className="maintag">MAIN</i> : null}</b><span>{r.d}</span></td>
                {met.slice(0, 5).map((m, wi) => <Fragment key={wi}>{cell(m, met[wi + 1], ri, wi !== wk)}</Fragment>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ananote mono">{loading ? "Loading the log…" : `# people who reached the step · €/# that ${gran}’s spend ÷ # · Step = % of the step above · Total = % of clicks · ▲▼ points vs the ${gran} before`}</p>
    </div>
  );
}

/* ── Admin · Feedback: the "before you go" pop-up, read back (A·f / A·m·f) ── */
const FB_STEPS = ["Brief", "Concept", "Words", "Names", "Domain", "Logo", "Brand book", "Socials"] as const;
const STEP_LAB: Record<string, string> = {
  ask: "Brief", brief: "Brief", refine: "Concept", brands: "Concept", brandsum: "Concept", words: "Words",
  names: "Names", claim: "Domain", reveal: "Domain", domain: "Domain", taste: "Logo", logo: "Logo",
  logodone: "Logo", pers: "Logo", book: "Brand book", socials: "Socials", done: "Socials",
};
// The pop-up's historic option strings, folded onto the canonical reasons.
const CANON: Record<string, string> = {
  "Names don't fit my brief": "The names don't fit my brief",
  "Words don't inspire me": "The words don't inspire me",
  "Taking too long": "It's taking too long",
  "Just exploring": "Not ready yet, just exploring",
  "Domains are taken": "The domains I want are taken",
  "I don't get what to do": "Something's confusing",
};
const canonR = (r: string) => CANON[r] || r;
const TRIG: Record<string, string> = { exit: "Closed the tab", idle: "Inactive 30 s" };

function FeedbackView({ items, flows, from, to, loading, onOpenFlow }: {
  items: LogItem[]; flows: Flow[]; from: number; to: number; loading: boolean; onOpenFlow: (id: string) => void;
}) {
  const [rsel, setRsel] = useState("");
  const [showAll, setShowAll] = useState(false);
  const polls = useMemo(() => items.filter((it) => it.phase === "poll" && it.at >= from && it.at < to), [items, from, to]);
  const answers = useMemo(() => items.filter((it) => it.phase === "feedback" && it.at >= from && it.at < to).sort((a, b) => b.at - a.at), [items, from, to]);
  const reasonsOf = (a: LogItem): string[] => {
    const pl = a.input?.payload || {};
    const rs = Array.isArray(pl.reasons) && pl.reasons.length ? pl.reasons.map(canonR) : ["Other"];
    return Array.from(new Set(rs)) as string[];
  };
  // stayed: anything else happened in that flow after the ask (45 s of grace)
  const lastAt = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) if (it.process) m.set(it.process, Math.max(m.get(it.process) || 0, it.at));
    return m;
  }, [items]);
  const stayed = polls.filter((p) => p.process && (lastAt.get(p.process) || 0) > p.at + 45000).length;
  const rc = new Map<string, number>();
  for (const a of answers) for (const r of reasonsOf(a)) rc.set(r, (rc.get(r) || 0) + 1);
  const bars = Array.from(rc.entries()).sort((a, b) => b[1] - a[1]);
  const whereBase = polls.length ? polls : answers;
  const where = FB_STEPS.map((s) => whereBase.filter((it) => STEP_LAB[String(it.input?.payload?.step || "")] === s).length);
  const wMax = Math.max(1, ...where);
  const cards = answers.filter((a) => !rsel || reasonsOf(a).includes(rsel));
  const shownCards = showAll ? cards : cards.slice(0, 8);
  const flowFor = (a: LogItem): Flow | null => {
    const byId = flows.find((f) => f.id === a.process);
    if (byId) return byId;
    const em = String(a.input?.payload?.meta?.email || "").toLowerCase();
    return (em && flows.find((f) => f.email.toLowerCase() === em)) || null;
  };
  const nameOf = (a: LogItem) => {
    const m = a.input?.payload?.meta || {};
    return m.uname || (m.email ? String(m.email).split("@")[0] : "") || "Anonymous";
  };
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) + "%" : "—");
  return (
    <div className="wrap fbview">
      <div className="fbcols">
        <div className="fbmain">
          <div className="fbkpis">
            <div className="akpi"><span>Pop-up shown</span><b className="mono">{polls.length || "—"}</b><em className="was">people about to leave</em></div>
            <div className="akpi"><span>Answered</span><b className="mono">{pct(answers.length, polls.length)}</b><em className="was">{answers.length} answers</em></div>
            <div className="akpi"><span>Stayed after it</span><b className="mono">{pct(stayed, polls.length)}</b><em className="was">{stayed} kept naming</em></div>
          </div>
          {!polls.length && answers.length > 0 && <p className="fbnote mono">Asks weren’t logged before 17 Oct — only the answers above exist for this range.</p>}
          <div className="fbcard-box">
            <h3>Why people leave</h3>
            {!bars.length && <p className="hint">{loading ? "Loading…" : "No answers in this range yet."}</p>}
            {bars.map(([r, n], i) => (
              <div key={r} className="fbbar">
                <span className="t">{r}</span>
                <span className="track"><i className={i === 0 ? "top" : ""} style={{ width: `${Math.round((n / Math.max(1, answers.length)) * 100)}%` }} /></span>
                <span className="mono v">{pct(n, answers.length)}</span>
              </div>
            ))}
            {bars.length > 0 && <p className="fbhint">several can be ticked, so they don’t sum to 100%</p>}
          </div>
          <div className="fbcard-box">
            <h3>Where they leave</h3>
            <div className="fbsteps">
              {FB_STEPS.map((s, i) => (
                <div key={s} className="col">
                  <span className="mono p">{whereBase.length ? Math.round((where[i] / whereBase.length) * 100) + "%" : "–"}</span>
                  <i className={where[i] === wMax && where[i] > 0 ? "top" : ""} style={{ height: `${Math.max(4, (where[i] / wMax) * 64)}px` }} />
                  <span className="l">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <aside className="fbrail">
          <div className="fbrailhead">
            <h3>Latest comments <em className="mono">{cards.length}</em></h3>
            <select value={rsel} onChange={(e) => setRsel(e.target.value)}>
              <option value="">All reasons</option>
              {bars.map(([r]) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {!cards.length && <p className="hint">{loading ? "Loading…" : "Nothing yet."}</p>}
          {shownCards.map((a) => {
            const pl = a.input?.payload || {};
            const fl = flowFor(a);
            return (
              <button key={a.id} className="fbc" onClick={() => fl && onOpenFlow(fl.id)} title={fl ? "Open this flow" : undefined}>
                <span className="head"><b>{nameOf(a)}</b><em>at {STEP_LAB[String(pl.step || "")] || "—"} · {TRIG[String(pl.variant)] || "—"}</em><i className="mono">{ago(a.at)}</i></span>
                <span className="chipsrow">{reasonsOf(a).map((r) => <i key={r}>{r}</i>)}</span>
                {pl.note ? <span className="note">“{pl.note}”</span> : null}
              </button>
            );
          })}
          {cards.length > shownCards.length && <button className="fbmore" onClick={() => setShowAll(true)}>See all {cards.length} →</button>}
        </aside>
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
  mk("p2", "feedback", 4.4 * H, { variant: "exit", step: "names", reasons: ["The domains I want are taken"], note: "Fathom is great but the .com is gone", ...meta2 }, "GB"),
  mk("p3", "signup", 0.2 * H, meta3, "ES"), mk("p3", "search", 0.2 * H - 60000, { sentence: "Una marca de café de especialidad", ...meta3 }, "ES"),
  mk("p3", "wrapconcept", 0.15 * H, {}, "ES"),
  mk("p4", "signup", 50 * H, meta4, "US"), mk("p4", "search", 50 * H - 60000, { sentence: "A tool that turns podcasts into newsletters", ...meta4 }, "US"),
  mk("p4", "wrapconcept", 49.9 * H, {}, "US"), mk("p4", "wrapwords", 49.8 * H, {}, "US"),
  mk("p4", "wrapnames", 49.5 * H, { words: [{ w: "echo" }, { w: "letter" }] }, "US", { names: [{ name: "Echolet" }, { name: "Castnote" }] }),
  mk("p4", "pick", 49.4 * H, { name: "Echolet", ...meta4 }, "US"),
  mk("p2", "poll", 4.45 * H, { variant: "exit", step: "names", ...meta2 }, "GB"),
  mk("p3", "poll", 0.1 * H, { variant: "idle", step: "brief", ...meta3 }, "ES"),
  mk("p4", "poll", 49.45 * H, { variant: "idle", step: "words", ...meta4 }, "US"),
];
const dday = (i: number) => new Date(now - i * 864e5).toISOString().slice(0, 10);
const DEMO_ADS: AdsDay[] = Array.from({ length: 40 }, (_, i) => ({
  date: dday(i),
  rows: [{ channel: "Google Ads", campaign: "Search — Naming EN", cost: 18 + ((i * 7) % 15), clicks: 30 + ((i * 11) % 25), impressions: 400 + ((i * 37) % 220) }],
}));
