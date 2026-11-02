// The Name Name admin dashboard (handoff: Known As Admin): every flow that
// started, where it stopped, who the user is and where they came from.
// White "paper" theme, session-gated server-side (adminlog needs an admin token).
import { Fragment, useEffect, useMemo, useState } from "react";
import "./wrapped.css";
import { ENDPOINT, adminRoles, loadSession, roleSet, saveSession } from "./api";
import { AvatarMenu } from "./paper";
import { download } from "./zip";

interface LogItem { id: string; at: number; process?: string; phase: string; input?: any; output?: any }
// One day of ad spend, pushed by the Google Ads Script (phase "adspush").
interface AdsDay { date: string; rows: { channel: string; campaign: string; cost: number; clicks: number; impressions: number }[] }

export const STEPS = ["Sign up", "Brief", "Deep-dive", "Swipe", "Words", "Names", "Name chosen", "Brand", "Book", "Socials", "Domain", "Done"] as const;
// Brand first, domain last (concept D) went live here: before it, the domain
// page (claim) sat right after the names (= "name chosen"); after it, it's the
// last chapter, after the brand.
const CUT_D = Date.UTC(2026, 10, 1, 19, 0);
const domStep = (at: number) => (at >= CUT_D ? 10 : 6);
// The landing PRE-CHARGES the concept and the words while a visitor is still
// typing — before the gate. A wrap* phase therefore no longer proves anyone SAW
// a step: steps come from the client's own events ("page" + explicit actions).
const ACTION_STEP: Record<string, number> = {
  signup: 0, search: 1, brandsum: 3, wordsdone: 4, wordshuffle: 4,
  morenames: 5, pick: 5, domain: 6, godaddy: 6, taste: 7, logo: 7, logopers: 7, logopack: 7,
  book: 8, bookpreview: 8, social: 9, done: 11,
};
// Flows from before the "page" event existed fall back to generation phases.
const LEGACY_STEP: Record<string, number> = { wrapchips: 1, wrapconcept: 2, wrapwords: 4, wrapnames: 5 };
const PAGE_STEP: Record<string, number> = {
  ask: 1, brief: 1, refine: 2, brands: 3, brandsum: 3, words: 4, names: 5, claim: 6, reveal: 6,
  domain: 6, brand: 7, feel: 7, tcol: 7, ttype: 7, tshape: 7, taste: 7, logo: 7, snap: 7, unlock: 7, early: 7, logodone: 7, pers: 7,
  book: 8, socials: 9, kit: 9, mkt: 9, done: 11,
};
// The step an event proves, with the domain moving to the end on CUT_D.
function stepOfEvent(e: LogItem): number | undefined {
  if (e.phase === "page") {
    const to = String(e.input?.payload?.to || "");
    return to === "claim" || to === "domain" ? domStep(e.at) : PAGE_STEP[to];
  }
  if (e.phase === "domain" || e.phase === "godaddy") return domStep(e.at);
  return ACTION_STEP[e.phase];
}

interface Flow {
  id: string;
  first: number; last: number;
  step: number;                   // furthest step reached (0-9)
  status: "live" | "stopped" | "done";
  email: string; uname: string;
  brief: string;
  name: string; shortlist: string[]; words: string[];
  domain: string;
  dive: boolean;                  // opened the deep-dive (02·r)
  buy: boolean;                   // clicked out to buy the domain
  logo: boolean;                  // picked a logo → the free brand snapshot (P·1)
  paywall: boolean;               // saw P·2 Unlock (handoff 19)
  unlock: boolean;                // tapped Unlock (paywall, locked page or account)
  saved: boolean;                 // saved the name at 05 (with a domain or "pick later")
  later: boolean;                 // saved it with "Pick a domain later"
  teaser: boolean;                // tapped the €29 kit teaser on "{Name} is yours"
  autoWords: boolean;             // continued from Words with nothing starred
  reactions: number;              // names reaction-strip taps
  reactFails: number;             // reaction rounds that failed
  price: number;                  // the €29/39/49 variant this person saw
  why: string;                    // P·6 "why not now?" answer
  source: string; campaign: string; content: string; term: string; device: string; lang: string; country: string;
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
      email: "", uname: "", brief: "", name: "", shortlist: [], words: [], domain: "", dive: false, buy: false,
      logo: false, paywall: false, unlock: false, price: 0, why: "", saved: false, later: false, teaser: false, autoWords: false, reactions: 0, reactFails: 0,
      source: "", campaign: "", content: "", term: "", device: "", lang: "", country: "", feedback: "", timeline: [],
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
        if (m.term) f.term = m.term;
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
      if (e.phase === "page" && String(p.to || "") === "refine") f.dive = true;
      if (e.phase === "logo" || (e.phase === "page" && ["snap", "logodone"].includes(String(p.to || "")))) f.logo = true;
      if (e.phase === "paywall_seen") { f.paywall = true; f.price = Number(p.price) || f.price; }
      if (e.phase === "unlock_clicked") { f.unlock = true; f.price = Number(p.price) || f.price; }
      if (e.phase === "why_not" && p.reason) f.why = String(p.reason);
      if (e.phase === "claim_saved") { f.saved = true; if (!p.domain) f.later = true; }
      if (e.phase === "domain" || (e.phase === "page" && String(p.to || "") === "reveal" && e.at < CUT_D)) f.saved = true;
      if (e.phase === "kit_teaser_tap") f.teaser = true;
      if (e.phase === "words_continue" && p.mode === "auto") f.autoWords = true;
      if (e.phase === "names_reaction" || e.phase === "names_more") f.reactions++; // more-names rounds (the strip's chips, then "Show 6 more")
      if ((e.phase === "names_reaction_result" || e.phase === "names_more_result") && p.failed) f.reactFails++;
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
      const st = e.phase === "page" || ACTION_STEP[e.phase] !== undefined ? stepOfEvent(e) :
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
    f.status = f.step >= 11 ? "done" : Date.now() - f.last < 30 * 60000 ? "live" : "stopped";
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
      main.uname ||= o.uname; main.name ||= o.name; main.domain ||= o.domain; main.buy ||= o.buy; main.dive ||= o.dive;
      main.logo ||= o.logo; main.paywall ||= o.paywall; main.unlock ||= o.unlock; main.price ||= o.price; main.why ||= o.why;
      main.saved ||= o.saved; main.later ||= o.later; main.teaser ||= o.teaser; main.autoWords ||= o.autoWords; main.reactions += o.reactions; main.reactFails += o.reactFails;
      main.source ||= o.source; main.campaign ||= o.campaign; main.content ||= o.content; main.term ||= o.term;
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
    main.status = main.step >= 11 ? "done" : Date.now() - main.last < 30 * 60000 ? "live" : "stopped";
  }
  const merged = flows.filter((f) => !absorbed.has(f));
  return { flows: merged.sort((a, b) => b.last - a.last), gated };
}

// Search ignores case AND accents: "lea" finds "Léa", "amelie" finds "Amélie".
const fold = (v: string) => (v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const hit = (q: string, fields: (string | undefined)[]) => { const n = fold(q.trim()); return !n || fields.some((v) => fold(v || "").includes(n)); };

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

/* ════════ Admin v2 (handoff admin-v2): Overview · People · Analysis · Feedback · Emails ════════ */
type Tab = "overview" | "people" | "analysis" | "feedback" | "emails";
const TABS: [Tab, string][] = [["overview", "Overview"], ["people", "People"], ["analysis", "Analysis"], ["feedback", "Feedback"], ["emails", "Emails"]];
type RangeSel = { kind: "7" | "30" | "all" | "custom"; from?: number; to?: number };
const DAY = 864e5;
const dayStart = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
// The next local midnight: calendar arithmetic, never +24 h (25 Oct had 25 h).
const nextDay = (t: number) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime(); };
const ymd = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const dmon = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const LAUNCH = new Date("2026-10-14T00:00:00").getTime(); // ads + tracking start
const W_LAUNCH = new Date("2026-10-21T22:04:00+02:00").getTime(); // lifecycle emails live
const TRACK_AT = new Date("2026-11-01T00:00:00+01:00").getTime(); // open pixel + email_back live

interface Update { id: string; title: string; date: string; step: string; note?: string }
const SEED_UPDATES: Update[] = [
  { id: "u1", date: "2026-10-16", title: "Funnel fixes: names, swipe, registrar unnamed", step: "04 · Names" },
  { id: "u2", date: "2026-10-21", title: "Gate after the brief + lifecycle emails", step: "Gate · Emails" },
  { id: "u3", date: "2026-10-22", title: "Name picker: our pick by default", step: "04 · Names" },
  { id: "u4", date: "2026-10-22", title: "Brand paywall “You’re early”", step: "P·2" },
  { id: "u5", date: "2026-10-30", title: "€29 for everyone + claim never blocks", step: "05 · Claim" },
  { id: "u6", date: "2026-10-30", title: "Words always active, kit teaser, paywall v2", step: "03 · 05·k · P·2" },
  { id: "u7", date: "2026-10-31", title: "Name picker without the strip", step: "04 · Names" },
  { id: "u8", date: "2026-10-31", title: "Domain page leads with a free domain", step: "05 · Claim" },
  { id: "u9", date: "2026-11-01", title: "Brand first, domain last (new chapter order)", step: "05 → Ch. 2 / 3" },
  { id: "u10", date: "2026-11-02", title: "Ads budget €25 → €50/day", step: "Google Ads" },
  { id: "u11", date: "2026-11-02", title: "Logos v2: real fonts, 35 symbols, 9 layouts", step: "06e · Logos" },
  { id: "u12", date: "2026-11-02", title: "Reminder emails 1 h after leaving, one-tap return", step: "Emails" },
];

// The numbers every view shares, for one window.
interface Stats { briefs: number; signed: number; words: number; names: number; chosen: number; brandStart: number; brand: number; paywall: number; unlock: number; domain: number; spend: number }
function statsFor(flows: Flow[], gated: number[], ads: AdsDay[] | null, from: number, to: number, chan?: string): Stats {
  const fl = flows.filter((f) => f.first >= from && f.first < to && (!chan || (f.source || "Direct") === chan));
  const s = fl.filter((f) => f.email);
  let spend = 0;
  const a = ymd(from), b = ymd(to - 1);
  for (const d of ads || []) if (d.date >= a && d.date <= b) for (const r of d.rows || []) if (!chan || r.channel === chan) spend += r.cost || 0;
  return {
    briefs: fl.filter((f) => f.brief || f.step >= 1).length + (chan ? 0 : gated.filter((t) => t >= from && t < to).length),
    signed: s.length,
    words: s.filter((f) => f.step >= 4).length,
    names: s.filter((f) => f.step >= 5).length,
    chosen: s.filter((f) => f.step >= 6).length,
    brandStart: s.filter((f) => f.step >= 7).length,
    brand: s.filter((f) => f.logo || f.step >= 8).length,
    domain: s.filter((f) => !!f.domain && f.last >= CUT_D).length,
    paywall: fl.filter((f) => f.paywall).length,
    unlock: fl.filter((f) => f.unlock).length,
    spend,
  };
}

// "▲ 18%" vs the previous window of the same length; cost going down is good.
function Trend({ cur, was, costly, na }: { cur: number; was: number; costly?: boolean; na?: boolean }) {
  if (na) return <em className="tr flat" title="The previous period starts before launch (14 Oct)">— vs before launch</em>;
  if (!isFinite(cur) || !isFinite(was)) return <em className="tr flat">—</em>;
  if (!was) return <em className="tr flat">{cur ? "new" : "—"}</em>;
  const pct = Math.round(((cur - was) / was) * 100);
  if (pct === 0) return <em className="tr flat">= 0%</em>;
  const good = costly ? pct < 0 : pct > 0;
  return <em className={"tr " + (good ? "up" : "down")}>{pct > 0 ? "▲" : "▼"} {Math.abs(pct)}%</em>;
}
// A KPI value while the log is still paging in: a spinner and a dimmed, partial number.
function KVal({ v, loading, partial }: { v: string; loading: boolean; partial: boolean }) {
  if (loading) return <b className="mono kload"><i className="kspin" /></b>;
  return <b className={"mono" + (partial ? " kpart" : "")} title={partial ? "Still loading the full history — this number will grow" : undefined}>{partial && <i className="kspin" />}{v}</b>;
}
const eur0 = (v: number) => (isFinite(v) && v > 0 ? "€" + (v >= 100 ? Math.round(v).toLocaleString("en-US") : v.toFixed(v >= 10 ? 0 : 2)) : "—");

export function AdminPage() {
  const me = loadSession()?.user || (new URLSearchParams(window.location.search).has("demo") ? { name: "Dimitri Farber", email: "dimitri@dfginvest.fr" } as any : null);
  const [items, setItems] = useState<LogItem[] | null>(null);
  const [err, setErr] = useState("");
  const [ads, setAds] = useState<AdsDay[] | null>(null);
  const [roles, setRoles] = useState<{ owners: string[]; admins: string[] } | null>(null);
  const [updates, setUpdates] = useState<Update[] | null>(null);
  const [mailStats, setMailStats] = useState<{ unsubscribed: number } | null>(null);
  const [logDone, setLogDone] = useState(false); // every page of the log has landed
  const pathTab = ((window.location.pathname.match(/\/admin\/(\w+)/)?.[1] || "").replace("users", "people")) as Tab;
  const [tab, setTabState] = useState<Tab>(TABS.some(([t]) => t === pathTab) ? pathTab : "overview");
  const [range, setRange] = useState<RangeSel>({ kind: "30" });
  const [selPerson, setSelPerson] = useState<string | null>(null);
  const BASE = () => (import.meta as any).env.BASE_URL || "/";
  const demo = new URLSearchParams(window.location.search).has("demo");
  const setTab = (t: Tab) => {
    setTabState(t);
    try { window.history.replaceState(null, "", BASE() + "admin" + (t === "overview" ? "" : "/" + t) + window.location.search); } catch { /* ignore */ }
  };
  const call = (body: Record<string, unknown>) => fetch(ENDPOINT, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, token: loadSession()?.token || "" }),
  }).then((r) => r.json());

  useEffect(() => {
    if (demo) { setItems(DEMO_ITEMS); setAds(DEMO_ADS); setUpdates(SEED_UPDATES); setMailStats({ unsubscribed: 2 }); setLogDone(true); return; }
    // The log keeps the whole history and one call may only touch ~900 keys:
    // page through with the cursor, painting as the pages land (newest first).
    let dead = false;
    (async () => {
      const all: LogItem[] = [];
      let cursor: string | undefined;
      for (let i = 0; i < 40 && !dead; i++) {
        const d = await call({ phase: "adminlog", limit: 900, cursor });
        if (dead) return;
        if (d.error) { setErr(String(d.error)); return; }
        all.push(...(d.items || []));
        setItems([...all]);
        if (!d.cursor) break;
        cursor = d.cursor;
      }
      if (!dead) setLogDone(true);
    })().catch((e) => { if (!dead) setErr(String(e)); });
    call({ phase: "adminads" }).then((d) => { if (!dead && !d.error) setAds((d.days || []).sort((a: AdsDay, b: AdsDay) => (a.date < b.date ? 1 : -1))); }).catch(() => {});
    call({ phase: "admin-updates" }).then((d) => {
      if (dead) return;
      const stored: Update[] = Array.isArray(d?.list) && d.list.length ? d.list : [];
      if (!stored.length) { setUpdates(SEED_UPDATES); return; }
      // updates shipped after the saved list's newest one join it (deleted ones stay deleted)
      const newest = stored.reduce((m, u) => (u.date > m ? u.date : m), "");
      setUpdates([...stored, ...SEED_UPDATES.filter((u) => u.date > newest && !stored.some((x) => x.id === u.id))]);
    }).catch(() => setUpdates(SEED_UPDATES));
    call({ phase: "adminmail" }).then((d) => { if (!dead && !d.error) setMailStats(d); }).catch(() => {});
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (!demo) adminRoles().then((r) => { if (r && (r as any).owners) setRoles(r as any); }); else setRoles({ owners: ["dimitri@dfginvest.fr"], admins: [] }); }, [demo]);

  const built = useMemo(() => (items ? buildFlows(items) : { flows: [], gated: [] }), [items]);
  // Clean numbers: our own runs (owners + admins), probes and scripted hits never count.
  const team = useMemo(() => new Set([...(roles?.owners || []), ...(roles?.admins || [])].map((e) => e.toLowerCase())), [roles]);
  const flows = useMemo(() => built.flows.filter((f) =>
    f.source !== "Probe" && !/curl|bot|headless/i.test(f.device) && !/@namename\.ai$/i.test(f.email) && !(demo ? false : team.has(f.email.toLowerCase()))), [built, team, demo]);
  const firstAt = useMemo(() => Math.max(LAUNCH - 20 * DAY, Math.min(Date.now(), ...flows.map((f) => f.first))), [flows]);
  const [from, to] = ((): [number, number] => {
    const now = Date.now();
    if (range.kind === "7") return [now - 7 * DAY, now];
    if (range.kind === "30") return [now - 30 * DAY, now];
    if (range.kind === "all") return [dayStart(firstAt), now];
    return [range.from!, Math.min(now, range.to!)];
  })();
  const len = Math.max(DAY, to - from);
  const sortedUpdates = useMemo(() => [...(updates || [])].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)), [updates]);

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
    <div className="kadm kv2">
      <div className="v2bar">
        <span className="brand"><span className="bt">NAME NAME</span><em>Admin</em></span>
        <nav className="v2tabs">
          {TABS.map(([t, l]) => <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{l}</button>)}
        </nav>
        <RangeControl range={range} setRange={setRange} from={from} to={to} firstAt={firstAt} />
        <AvatarMenu me={me} isAdmin current="admin" onLogout={() => { saveSession(null); window.location.assign(BASE()); }} />
      </div>
      {tab === "overview" && (
        <Overview flows={flows} gated={built.gated} ads={ads} from={from} to={to} len={len} updates={sortedUpdates} partial={!logDone} loading={!items} />
      )}
      {tab === "people" && (
        <People flows={flows} items={items || []} from={from} to={to} sel={selPerson} setSel={setSelPerson} roles={roles}
          onRole={async (email, role) => { if (await roleSet(email, role)) setRoles((r) => r && { ...r, admins: role === "admin" ? [...r.admins, email] : r.admins.filter((x) => x !== email) }); }}
          loading={!items} done={logDone} />
      )}
      {tab === "analysis" && <AnalysisView flows={flows} ads={ads} loading={!logDone} />}
      {tab === "feedback" && (
        <FeedbackView items={items || []} flows={flows} from={from} to={to} loading={!items} q=""
          onOpenFlow={(id) => { setRange({ kind: "all" }); setSelPerson(id); setTab("people"); }} />
      )}
      {tab === "emails" && <Emails items={items || []} flows={flows} from={from} to={to} len={len} unsub={mailStats?.unsubscribed ?? null} loading={!items} partial={!logDone} />}
    </div>
  );
}

/* ── the one date range: 7d · 30d · All · Custom (O·d·cal); a bottom sheet on phones ── */
function RangeControl({ range, setRange, from, to, firstAt }: { range: RangeSel; setRange: (r: RangeSel) => void; from: number; to: number; firstAt: number }) {
  const [open, setOpen] = useState(false);
  const [a, setA] = useState<number>(dayStart(from));
  const [b, setB] = useState<number>(dayStart(to));
  const [month, setMonth] = useState<number>(() => { const d = new Date(to); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); });
  const [picking, setPicking] = useState<"a" | "b">("a");
  const openIt = () => { setA(dayStart(from)); setB(dayStart(to)); setPicking("a"); const d = new Date(to); setMonth(new Date(d.getFullYear(), d.getMonth(), 1).getTime()); setOpen(true); };
  const label = range.kind === "custom" ? `${dmon(from)} – ${dmon(to - 1)}` : range.kind === "all" ? "All" : range.kind + "d";
  const today = dayStart(Date.now());
  const quick: [string, number, number][] = [
    ["Today", today, today], ["Yesterday", today - DAY, today - DAY], ["Last 7 days", today - 6 * DAY, today], ["Last 30 days", today - 29 * DAY, today],
    ["This month", new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime(), today], ["Since launch", dayStart(firstAt), today],
  ];
  const apply = (x = a, y = b) => { const lo = Math.min(x, y), hi = Math.max(x, y); setRange({ kind: "custom", from: lo, to: hi + DAY }); setOpen(false); };
  const m = new Date(month);
  const first = new Date(m.getFullYear(), m.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  const cells = [...Array(lead).fill(0), ...Array.from({ length: days }, (_, i) => new Date(m.getFullYear(), m.getMonth(), i + 1).getTime())];
  const lo = Math.min(a, b), hi = Math.max(a, b);
  return (
    <div className="v2range">
      <span className="seg">
        {(["7", "30", "all"] as const).map((k) => <button key={k} className={range.kind === k ? "on" : ""} onClick={() => setRange({ kind: k })}>{k === "all" ? "All" : k + "d"}</button>)}
        <button className={range.kind === "custom" ? "on" : ""} onClick={openIt}>{range.kind === "custom" ? label : "Custom"} ▾</button>
      </span>
      <button className="pill mono" onClick={openIt}>{label} ▾</button>
      {open && (
        <>
          <div className="rshade" onClick={() => setOpen(false)} />
          <div className="rpop">
            <div className="rquick">
              {quick.map(([l, x, y]) => <button key={l} onClick={() => { setA(x); setB(y); apply(x, y); }}>{l}</button>)}
              <button onClick={() => { setRange({ kind: "all" }); setOpen(false); }}>All time</button>
            </div>
            <div className="rcal">
              <div className="rfromto">
                <label className={picking === "a" ? "on" : ""} onClick={() => setPicking("a")}><span>From</span><input type="date" value={ymd(lo)} onChange={(e) => e.target.value && setA(new Date(e.target.value + "T00:00:00").getTime())} /></label>
                <label className={picking === "b" ? "on" : ""} onClick={() => setPicking("b")}><span>To</span><input type="date" value={ymd(hi)} onChange={(e) => e.target.value && setB(new Date(e.target.value + "T00:00:00").getTime())} /></label>
              </div>
              <div className="rmonth">
                <button onClick={() => setMonth(new Date(m.getFullYear(), m.getMonth() - 1, 1).getTime())}>‹</button>
                <b>{m.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</b>
                <button onClick={() => setMonth(new Date(m.getFullYear(), m.getMonth() + 1, 1).getTime())}>›</button>
              </div>
              <div className="rgrid">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <i key={i}>{d}</i>)}
                {cells.map((t, i) => t ? (
                  <button key={i} disabled={t > today}
                    className={(t === lo || t === hi ? "end" : t > lo && t < hi ? "in" : "")}
                    onClick={() => { if (picking === "a") { setA(t); setB(t); setPicking("b"); } else { setB(t); setPicking("a"); } }}>
                    {new Date(t).getDate()}
                  </button>
                ) : <span key={i} />)}
              </div>
              <div className="rfoot">
                <span className="mono">{Math.round((hi - lo) / DAY) + 1} days</span>
                <button className="ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button className="dark" onClick={() => apply()}>Apply</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── 1 · Overview ── */
function Overview({ flows, gated, ads, from, to, len, updates, loading, partial }: {
  flows: Flow[]; gated: number[]; ads: AdsDay[] | null; from: number; to: number; len: number;
  updates: Update[]; loading: boolean; partial: boolean;
}) {
  const cur = statsFor(flows, gated, ads, from, to);
  const prev = statsFor(flows, gated, ads, from - len, from);
  const cpn = cur.chosen ? cur.spend / cur.chosen : NaN, cpnP = prev.chosen ? prev.spend / prev.chosen : NaN;
  const kpis: [string, number, number, string, boolean?][] = [
    ["Briefs", cur.briefs, prev.briefs, cur.briefs.toLocaleString("en-US")],
    ["Sign-ups", cur.signed, prev.signed, cur.signed.toLocaleString("en-US")],
    ["Names chosen", cur.chosen, prev.chosen, cur.chosen.toLocaleString("en-US")],
    ["Paywall unlocked", cur.unlock, prev.unlock, String(cur.unlock)],
  ];
  // daily series for the chart
  const days: number[] = [];
  for (let t = dayStart(Math.max(from, LAUNCH)); t < to; t = nextDay(t)) days.push(t); // before 14 Oct: tests only
  const series = days.map((t) => { const s = statsFor(flows, gated, ads, t, nextDay(t)); return { t, conv: s.briefs ? (s.chosen / s.briefs) * 100 : NaN, cost: s.chosen ? s.spend / s.chosen : NaN, briefs: s.briefs, signed: s.signed, chosen: s.chosen, spend: s.spend }; });
  const num = (u: Update) => updates.findIndex((x) => x.id === u.id) + 1;
  const inRange = updates.filter((u) => { const t = new Date(u.date + "T00:00:00").getTime(); return t >= dayStart(Math.max(from, LAUNCH)) && t < to; });
  // conversion (Brief → Name chosen), 3 days after vs 3 days before each update
  const conv3 = (a: number, b: number) => { const s = statsFor(flows, gated, ads, a, b); return s.briefs ? (s.chosen / s.briefs) * 100 : NaN; };
  const funnel: [string, number][] = [
    ["Brief typed", cur.briefs], ["Signed up", cur.signed], ["Words", cur.words], ["Names", cur.names],
    ["Name chosen", cur.chosen], ["Brand started", cur.brandStart], ["Paywall seen", cur.paywall], ["Unlocked", cur.unlock],
    ["Domain kept", cur.domain],
  ];
  const steps = funnel.map(([, n], i) => (i === 0 ? NaN : funnel[i - 1][1] ? (n / funnel[i - 1][1]) * 100 : NaN));
  const drops = steps.map((p, i) => ({ i, p })).filter((x) => x.i > 0 && x.i < 7 && isFinite(x.p) && funnel[x.i - 1][1] >= 5).sort((a, b) => a.p - b.p).slice(0, 2).map((x) => x.i);
  const chans = new Map<string, { spend: number; signed: number; names: number }>();
  for (const f of flows) if (f.first >= from && f.first < to) {
    const k = f.source || "Direct";
    const c = chans.get(k) || { spend: 0, signed: 0, names: 0 };
    if (f.email) c.signed++;
    if (f.email && f.step >= 6) c.names++;
    chans.set(k, c);
  }
  for (const d of ads || []) if (d.date >= ymd(from) && d.date <= ymd(to - 1)) for (const r of d.rows || []) {
    const c = chans.get(r.channel) || { spend: 0, signed: 0, names: 0 };
    c.spend += r.cost || 0; chans.set(r.channel, c);
  }
  const chanRows = [...chans.entries()].sort((a, b) => b[1].spend - a[1].spend || b[1].signed - a[1].signed);
  return (
    <div className="v2wrap">
      <div className="v2kpis">
        {kpis.map(([l, c, p, v]) => <div key={l} className="v2kpi"><span>{l}</span><KVal v={v} loading={loading} partial={partial} /><Trend cur={c} was={p} na={from - len < LAUNCH} /></div>)}
        <div className="v2kpi main"><span>Cost per name</span><KVal v={eur0(cpn)} loading={loading} partial={partial} /><Trend cur={cpn} was={cpnP} costly na={from - len < LAUNCH} /></div>
      </div>
      <div className="v2grid2">
        <div className="v2card">
          <div className="v2head"><h3>Conversion &amp; cost per name</h3>
            <span className="legend"><i className="lk" />Conversion <i className="lo" />Cost / name <i className="lu" />Update</span></div>
          <Chart series={series} updates={inRange} num={num} />
          <div className="ulegend">{inRange.map((u) => <span key={u.id}><i>{num(u)}</i>{u.title} <em className="mono">{dmon(new Date(u.date + "T00:00:00").getTime())}</em></span>)}</div>
        </div>
        <div className="v2card">
          <div className="v2head"><h3>Funnel</h3><span className="sub mono">{dmon(from)} – {dmon(to - 1)}</span></div>
          <table className="v2fun">
            <thead><tr><th /><th /><th className="mono">#</th><th className="mono">STEP</th><th className="mono">TOTAL</th></tr></thead>
            <tbody>
              {funnel.map(([l, n], i) => {
                const tot = cur.briefs ? (n / cur.briefs) * 100 : 0;
                const red = drops.includes(i), last = l === "Unlocked";
                return (
                  <tr key={l} className={last ? "last" : ""}>
                    <td className="l">{l}</td>
                    <td className="bar"><span><i className={last ? "or" : ""} style={{ width: `${Math.max(n ? 1.5 : 0, tot)}%` }} /></span></td>
                    <td className="mono n">{n}</td>
                    <td className={"mono p" + (red ? " red" : "")}>{i === 0 ? "—" : isFinite(steps[i]) ? Math.round(steps[i]) + "%" : "—"}</td>
                    <td className={"mono p" + (last ? " or" : "")}>{cur.briefs ? (tot >= 10 ? Math.round(tot) : tot.toFixed(1)) + "%" : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="v2note">Biggest drops: {drops.length ? drops.map((i, k) => <Fragment key={i}>{k > 0 && " and "}<b className="red">{funnel[i - 1][0].toLowerCase()} → {funnel[i][0].toLowerCase()}</b></Fragment>) : "—"}.{cur.paywall < 30 ? " Paywall: too few yet to read." : ""}</p>
        </div>
      </div>
      <div className="v2grid2">
        <div className="v2card">
          <div className="v2head"><h3>Main changes</h3><span className="sub">the updates shipped, newest first</span></div>
          <div className="ulist">
            {[...updates].reverse().map((u) => {
              const t = new Date(u.date + "T00:00:00").getTime();
              const before = conv3(t - 3 * DAY, t), after = conv3(t, t + 3 * DAY);
              const first = num(u) === 1, young = t + 3 * DAY > Date.now();
              const d = after - before;
              return (
                <div key={u.id} className="urow2" title={u.note || ""}>
                  <i className="un">{num(u)}</i>
                  <span className="ut"><b>{u.title}</b><em className="mono">{dmon(t)} · {u.step}</em></span>
                  <span className={"ud mono" + (first || young || !isFinite(d) ? " dim" : d >= 0 ? " up" : " down")}>
                    {first ? "baseline" : young ? `${Math.ceil((t + 3 * DAY - Date.now()) / DAY)} d to read` : isFinite(d) ? `${d >= 0 ? "▲" : "▼"} ${Math.abs(d).toFixed(1)} pts` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="v2note">Conversion (brief → name chosen), 3 days after vs 3 days before</p>
        </div>
        <div className="v2card">
          <div className="v2head"><h3>Channels</h3><span className="sub">paid and free</span></div>
          <table className="v2tbl">
            <thead><tr><th>CHANNEL</th><th className="r">SPEND</th><th className="r">SIGN-UPS</th><th className="r">NAMES</th><th className="r">€ / NAME</th></tr></thead>
            <tbody>
              {chanRows.map(([k, c]) => (
                <tr key={k}>
                  <td><i className="cdot" style={{ background: (CHANNELS.find(([n]) => n === k) || ["", "#6a6a6a"])[1] }} />{k}</td>
                  <td className="r mono">{c.spend ? eur0(c.spend) : "—"}</td>
                  <td className="r mono">{c.signed}</td>
                  <td className="r mono">{c.names}</td>
                  <td className="r mono">{c.spend && c.names ? eur0(c.spend / c.names) : "—"}</td>
                </tr>
              ))}
              {!chanRows.length && <tr><td colSpan={5} className="dim">{loading ? "Loading…" : "Nothing in this range."}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

type Pt = { t: number; conv: number; cost: number; briefs: number; signed: number; chosen: number; spend: number };
function Chart({ series, updates, num }: { series: Pt[]; updates: Update[]; num: (u: Update) => number }) {
  const W = 760, H = 230, L = 34, R = 40, T = 24, B = 22;
  const [hov, setHov] = useState<number | null>(null);
  if (series.length < 2) return <p className="hint">Not enough days in this range.</p>;
  const cMax = Math.max(5, Math.ceil(Math.max(0, ...series.map((s) => (isFinite(s.conv) ? s.conv : 0))) / 5) * 5);
  const eMax = Math.max(10, Math.ceil(Math.max(0, ...series.map((s) => (isFinite(s.cost) ? s.cost : 0))) / 10) * 10);
  const x = (i: number) => L + (i / (series.length - 1)) * (W - L - R);
  const yc = (v: number) => T + (1 - v / cMax) * (H - T - B);
  const ye = (v: number) => T + (1 - v / eMax) * (H - T - B);
  const path = (ys: (number | null)[]) => { let d = "", pen = false; ys.forEach((y, i) => { if (y === null) { pen = false; return; } d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y.toFixed(1)}`; pen = true; }); return d; };
  const convY = series.map((s) => (isFinite(s.conv) ? yc(s.conv) : null));
  const costY = series.map((s) => (isFinite(s.cost) ? ye(s.cost) : null));
  const area = (() => { const pts = convY.map((y, i) => (y === null ? null : `${x(i).toFixed(1)},${y.toFixed(1)}`)).filter(Boolean); if (pts.length < 2) return ""; const idx = convY.map((y, i) => (y === null ? -1 : i)).filter((i) => i >= 0); return `M${x(idx[0])},${H - B} L${pts.join(" L")} L${x(idx[idx.length - 1])},${H - B} Z`; })();
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (series.length - 1)));
  return (
    <div className="v2chartw" onMouseLeave={() => setHov(null)}>
    <svg className="v2chart" viewBox={`0 0 ${W} ${H}`}>
      {[0, 0.5, 1].map((f) => <line key={f} x1={L} x2={W - R} y1={T + f * (H - T - B)} y2={T + f * (H - T - B)} className="grid" />)}
      <text x={L - 6} y={T + 4} className="ax" textAnchor="end">{cMax}%</text>
      <text x={L - 6} y={T + (H - T - B) / 2 + 4} className="ax" textAnchor="end">{cMax / 2}%</text>
      <text x={L - 6} y={H - B + 4} className="ax" textAnchor="end">0%</text>
      <text x={W - R + 6} y={T + 4} className="ax or">€{eMax}</text>
      <text x={W - R + 6} y={T + (H - T - B) / 2 + 4} className="ax or">€{eMax / 2}</text>
      <text x={W - R + 6} y={H - B + 4} className="ax or">€0</text>
      {area && <path d={area} className="area" />}
      {[...new Set(updates.map((u) => u.date))].map((date) => {
        // one dashed line per day; same-day updates sit side by side on it
        const i = series.findIndex((s) => ymd(s.t) === date);
        if (i < 0) return null;
        const xi = x(i);
        const us = updates.filter((u) => u.date === date);
        return (
          <g key={date}>
            <line x1={xi} x2={xi} y1={T - 6} y2={H - B} className="mark" />
            {us.map((u, k) => {
              const cx = xi + (k - (us.length - 1) / 2) * 17;
              return <g key={u.id}><circle cx={cx} cy={T - 12} r={8} className="mk" /><text x={cx} y={T - 8.5} className="mkt" textAnchor="middle">{num(u)}</text></g>;
            })}
          </g>
        );
      })}
      <path d={path(convY)} className="lk" />
      <path d={path(costY)} className="lo" />
      {ticks.map((i) => <text key={i} x={x(i)} y={H - 4} className="ax" textAnchor={i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"}>{dmon(series[i].t)}</text>)}
      {hov !== null && (
        <g className="hov">
          <line x1={x(hov)} x2={x(hov)} y1={T} y2={H - B} className="hl" />
          {convY[hov] !== null && <circle cx={x(hov)} cy={convY[hov]!} r={4} className="hk" />}
          {costY[hov] !== null && <circle cx={x(hov)} cy={costY[hov]!} r={4} className="ho" />}
        </g>
      )}
      {/* one invisible column per day catches the pointer (mouse and touch) */}
      {series.map((_, i) => {
        const w = (W - L - R) / Math.max(1, series.length - 1);
        return <rect key={i} x={x(i) - w / 2} y={0} width={w} height={H} className="hz" onMouseEnter={() => setHov(i)} onTouchStart={() => setHov(i)} onClick={() => setHov(i)} />;
      })}
    </svg>
    {hov !== null && (() => {
      const p = series[hov];
      const ups = updates.filter((u) => u.date === ymd(p.t));
      const left = (x(hov) / W) * 100;
      return (
        <div className="v2tip" style={{ left: `${left}%`, transform: `translateX(${left > 70 ? "-100%" : left < 30 ? "0" : "-50%"})` }}>
          <b>{new Date(p.t).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</b>
          <p><i className="k" />Conversion<span className="mono">{isFinite(p.conv) ? p.conv.toFixed(1) + "%" : "—"}</span></p>
          <p><i className="o" />Cost / name<span className="mono">{eur0(p.cost)}</span></p>
          <p className="dim">Briefs<span className="mono">{p.briefs}</span></p>
          <p className="dim">Sign-ups<span className="mono">{p.signed}</span></p>
          <p className="dim">Names chosen<span className="mono">{p.chosen}</span></p>
          <p className="dim">Spend<span className="mono">{p.spend ? eur0(p.spend) : "—"}</span></p>
          {ups.map((u) => <p key={u.id} className="up"><i className="n">{num(u)}</i>{u.title}</p>)}
        </div>
      );
    })()}
    </div>
  );
}

/* ── 2 · People: one row per person, their latest flow; a side panel ── */
const STEP10 = ["Sign-up", "Brief", "Concept", "Swipe", "Words", "Names", "Name chosen", "Brand", "Brand book", "Socials", "Domain", "Finished"];
function People({ flows, items, from, to, sel, setSel, roles, onRole, loading, done }: {
  flows: Flow[]; items: LogItem[]; from: number; to: number; sel: string | null; setSel: (s: string | null) => void;
  roles: { owners: string[]; admins: string[] } | null; onRole: (email: string, role: "admin" | "user") => void; loading: boolean; done: boolean;
}) {
  const [q, setQ] = useState("");
  const [st, setSt] = useState<"all" | "live" | "stopped" | "done">("all");
  const [more, setMore] = useState(150);
  const [journey, setJourney] = useState(false);
  const base = q.trim() ? flows : flows.filter((f) => f.last >= from && f.last < to);
  const searched = base.filter((f) => hit(q, [f.email, f.uname, f.brief, f.name, f.domain, ...f.shortlist]));
  const cnt = (s: string) => searched.filter((f) => f.status === s).length;
  const shown = searched.filter((f) => st === "all" || f.status === st).sort((a, b) => b.last - a.last);
  // a person is kept by email (their row id can change while older log pages merge in)
  const selF = (sel?.startsWith("@") ? flows.find((f) => f.email.toLowerCase() === sel.slice(1)) : flows.find((f) => f.id === sel)) || null;
  function exportCsv() {
    const esc = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
    const head = "user,email,brief,step,status,name,domain,source,campaign,ad_group,keyword,country,device,lang,started,last_active,time_spent,deep_dive,logo,paywall,price,unlock,why_not,buy_click,feedback";
    const yn = (b: boolean) => (b ? "1" : "0");
    const lines = shown.map((f) => [
      esc(f.uname), esc(f.email), esc(f.brief), esc(`${STEPS[f.step]} (${f.step}/11)`), f.status,
      esc(f.name), esc(f.domain), esc(f.source), esc(f.campaign), esc(f.content), esc(f.term), f.country, esc(f.device), f.lang,
      new Date(f.first).toISOString(), new Date(f.last).toISOString(), spent(f),
      yn(f.dive), yn(f.logo), yn(f.paywall), f.price || "", yn(f.unlock), esc(f.why), yn(f.buy), esc(f.feedback),
    ].join(","));
    download(new Blob([[head, ...lines].join("\n")], { type: "text/csv" }), `namename-people-${new Date().toISOString().slice(0, 10)}.csv`);
  }
  const bar = (f: Flow) => (
    <span className="segs10">{Array.from({ length: 11 }, (_, i) => <i key={i} className={f.status === "done" ? "g" : i < f.step - 1 ? "d" : i === f.step - 1 ? "c" : ""} />)}</span>
  );
  const role = (email: string) => (roles?.owners.includes(email.toLowerCase()) ? "Owner" : roles?.admins.includes(email.toLowerCase()) ? "Admin" : "User");
  const evs = selF ? items.filter((it) => it.process === selF.id || (selF.email && String(it.input?.payload?.meta?.email || it.input?.who?.email || "").toLowerCase() === selF.email.toLowerCase())).sort((a, b) => a.at - b.at) : [];
  return (
    <div className={"v2people" + (selF ? " withpanel" : "")}>
      <div className="plist">
        <div className="ptools">
          <input className="psearch" placeholder="Search name, email, brief…" value={q} onChange={(e) => setQ(e.target.value)} />
          <span className="pstat">
            {([["All", "all", searched.length], ["Live", "live", cnt("live")], ["Stopped", "stopped", cnt("stopped")], ["Done", "done", cnt("done")]] as const).map(([l, v, n]) => (
              <button key={v} className={st === v ? "on" : ""} onClick={() => setSt(v)}>{l} <i className="mono">{n.toLocaleString("en-US")}</i></button>
            ))}
          </span>
          {!done && <span className="ploading mono">Loading history… {items.length.toLocaleString("en-US")} events</span>}
          <button className="pcsv" onClick={exportCsv}>↓ CSV</button>
        </div>
        <div className="ptable">
          <div className="phead"><span>PERSON</span><span>SOURCE</span><span>GOT TO</span><span>NAME</span><span>STATUS</span><span className="r">LAST ACTIVE</span></div>
          {loading && !shown.length && <p className="hint">Loading the log…</p>}
          {!loading && !shown.length && <p className="hint">Nobody in this range.</p>}
          {shown.slice(0, more).map((f) => (
            <button key={f.id} className={"prow" + (selF?.id === f.id ? " on" : "")} onClick={() => { setSel(f.email ? "@" + f.email.toLowerCase() : f.id); setJourney(false); }}>
              <span className="who"><b>{f.uname || "Anonymous"}</b><em className="mono">{f.email || "no account"}</em></span>
              <span className="src">{f.source || "Direct"}</span>
              <span className="got"><b>{f.status === "done" ? "Finished" : STEP10[f.step]} <i className="mono">{Math.min(11, f.step)}/11</i></b>{bar(f)}</span>
              <span className="nm">{f.name ? <><b>{f.name}</b><em className="mono">{f.domain || ""}</em></> : <em className="none">No name yet</em>}</span>
              <span className={"stt " + f.status}>{f.status === "live" ? <><i className="pulse" />Live</> : f.status === "done" ? "✓ Done" : "Stopped"}</span>
              <span className="la mono">{ago(f.last)}</span>
              <span className="msrc mono">{f.source || "Direct"} · {ago(f.last)}</span>
            </button>
          ))}
          {shown.length > more && <button className="pmore" onClick={() => setMore(more + 150)}>Show more ({shown.length - more})</button>}
        </div>
      </div>
      {selF && (
        <aside className="ppanel">
          <button className="px" onClick={() => setSel(null)}>✕</button>
          <div className="phd">
            <i className="pav">{(selF.uname || selF.email || "?").split(/[\s@.]/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join("")}</i>
            <span><b>{selF.uname || "Anonymous"}</b><em className="mono">{selF.email || "no account yet"}</em></span>
            <span className={"stt " + selF.status}>{selF.status === "live" ? <><i className="pulse" />Live</> : selF.status === "done" ? "✓ Done" : "Stopped"}</span>
          </div>
          <div className="pmeta">
            {([["Source", selF.source || "Direct"], ["Device", selF.device || "—"], ["Started", fdate(selF.first)], ["Time spent", spent(selF)], ["Country", selF.country || "—"], ["Keyword", selF.term || selF.content || "—"]] as const).map(([k, v]) => <p key={k}><em>{k}</em><span>{v}</span></p>)}
          </div>
          {selF.brief && <div className="pbrief"><em>BRIEF</em><p>“{selF.brief}”</p></div>}
          <p className="plbl">WHERE THEY GOT</p>
          <div className="psteps">
            {selF.timeline.map((t, i) => {
              const last = i === selF.timeline.length - 1 && selF.status !== "done";
              return <p key={t.step} className={last ? "stop" : ""}><i />{t.step}<span className="mono">{new Date(t.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span></p>;
            })}
            {selF.status !== "done" && <p className="stopline">{selF.status === "live" ? `Live at ${STEPS[selF.step]}` : `Stopped at ${STEPS[selF.step]}`}{selF.step === 5 && selF.shortlist.length ? ` · saw ${selF.shortlist.length}+, picked none` : ""}</p>}
          </div>
          {(selF.name || selF.domain || selF.later) && <p className="pkv"><em>Name</em><b>{selF.name || "—"}</b> <span className="mono">{selF.domain || (selF.later ? "domain later" : "")}</span></p>}
          {selF.paywall && <p className="pkv"><em>Paywall · €{selF.price || 29}</em>{selF.unlock ? "Unlocked (early access)" : "Kept the free preview"}{selF.why ? ` · why not: ${selF.why}` : ""}</p>}
          {(selF.feedback || selF.why) && (
            <div className="pfb"><em>THEIR FEEDBACK</em>
              {selF.feedback && <p>{selF.feedback.split(" — ")[0].split(" · ").filter(Boolean).map((r) => <i key={r}>{r}</i>)}</p>}
              {selF.feedback.includes(" — ") && <p className="q">“{selF.feedback.split(" — ").slice(1).join(" — ")}”</p>}
            </div>
          )}
          {journey && (
            <div className="pjourney">
              {evs.filter((e) => !e.phase.startsWith("wrap")).map((e) => {
                const p = e.input?.payload || {};
                return <p key={e.id}><span className="mono">{fdate(e.at)}</span><b>{e.phase === "page" ? `→ ${p.to}` : e.phase}</b><em>{p.name || p.domain || p.chip || p.reason || ""}</em></p>;
              })}
            </div>
          )}
          {selF.email && role(selF.email) !== "Owner" && (
            <p className="prole">Role <button className={role(selF.email) === "User" ? "on" : ""} onClick={() => onRole(selF.email, "user")}>User</button><button className={role(selF.email) === "Admin" ? "on" : ""} onClick={() => onRole(selF.email, "admin")}>Admin</button></p>
          )}
          <div className="pacts">
            <button className="dark" onClick={() => setJourney((j) => !j)}>{journey ? "Hide their flow" : "Open their flow"}</button>
            {selF.email && <a className="ghost" href={`mailto:${selF.email}?subject=Your name on Name Name`}>Email {(selF.uname || "them").split(" ")[0]}</a>}
          </div>
        </aside>
      )}
    </div>
  );
}

/* ── 5 · Emails: does email bring people back, and on which device? ── */
const MAILS: [string, string, string][] = [
  ["W", "Welcome", "At sign-up"],
  ["S1", "Stopped at the words", "24 h after leaving"],
  ["S2", "Stopped at the names", "24 h after leaving"],
  ["S3", "Stopped at the domain", "24 h after leaving"],
  ["S4", "Stopped at the brand", "24 h after leaving"],
  ["S5", "Logo done · what's next", "not sent yet"],
];
function Emails({ items, from, to, len, unsub, loading, partial }: { items: LogItem[]; flows: Flow[]; from: number; to: number; len: number; unsub: number | null; loading: boolean; partial: boolean }) {
  const calc = (a: number, b: number) => {
    // sends: stop emails are logged ("mail"); welcome sends before 1 Nov = sign-ups after it went live
    const sends: { kind: string; at: number; email: string; proc: string }[] = [];
    for (const it of items) {
      const p = it.input?.payload || {};
      if (it.at < a || it.at >= b) continue;
      if (it.phase === "mail") sends.push({ kind: String(p.kind || ""), at: it.at, email: String(p.email || "").toLowerCase(), proc: it.process || "" });
      if (it.phase === "lead" && it.at >= W_LAUNCH && it.at < TRACK_AT) sends.push({ kind: "W", at: it.at, email: String(p.email || "").toLowerCase(), proc: it.process || "" });
    }
    const opens = new Set(items.filter((it) => it.phase === "mail_open" && it.at >= a).map((it) => `${it.process}:${it.input?.payload?.kind}`));
    const backs = items.filter((it) => it.phase === "email_back" && it.at >= a && it.at < b + 7 * DAY);
    const byEmail = new Map<string, LogItem[]>();
    for (const it of items) { const em = String(it.input?.payload?.meta?.email || it.input?.who?.email || "").toLowerCase(); if (em) { if (!byEmail.has(em)) byEmail.set(em, []); byEmail.get(em)!.push(it); } }
    const stepOf = stepOfEvent;
    const per = new Map<string, { sent: number; tracked: number; opened: number; clicked: number; back: number; cont: number }>();
    let desk = 0, backN = 0;
    for (const s of sends) {
      const r = per.get(s.kind) || { sent: 0, tracked: 0, opened: 0, clicked: 0, back: 0, cont: 0 };
      r.sent++;
      if (s.at >= TRACK_AT) { r.tracked++; if (opens.has(`${s.proc}:${s.kind}`)) r.opened++; }
      const mine = backs.filter((e) => String(e.input?.payload?.kind || "") === s.kind && e.at > s.at && (String(e.input?.payload?.meta?.email || "").toLowerCase() === s.email || e.input?.payload?.resume === s.proc));
      if (s.at >= TRACK_AT && mine.length) { r.clicked++; backN++; if (mine[0].input?.payload?.device === "desktop") desk++; }
      // came back: any activity by them within 7 days after the email (works before tracking too)
      // the welcome lands mid-session: only a visit 2 h+ later counts as coming back
      const gap = s.kind === "W" ? 2 * 3600e3 : 60000;
      const later = (byEmail.get(s.email) || []).filter((e) => e.at > s.at + gap && e.at < s.at + 7 * DAY && !["mail", "mail_open", "lead"].includes(e.phase) && !e.phase.startsWith("wrap"));
      if (later.length || mine.length) {
        r.back++;
        const before = Math.max(0, ...(byEmail.get(s.email) || []).filter((e) => e.at <= s.at).map((e) => stepOf(e) ?? 0));
        if (later.some((e) => (stepOf(e) ?? -1) > before)) r.cont++;
      }
      per.set(s.kind, r);
    }
    const tot = [...per.values()].reduce((x, r) => ({ sent: x.sent + r.sent, tracked: x.tracked + r.tracked, opened: x.opened + r.opened, clicked: x.clicked + r.clicked, back: x.back + r.back, cont: x.cont + r.cont }), { sent: 0, tracked: 0, opened: 0, clicked: 0, back: 0, cont: 0 });
    return { per, tot, desk, backN };
  };
  const cur = calc(from, to), prev = calc(from - len, from);
  const pc = (n: number, d: number) => (d ? (n / d) * 100 : NaN);
  const fmt = (v: number) => (isFinite(v) ? (v >= 10 ? Math.round(v) : v.toFixed(1)) + "%" : "—");
  const k = cur.tot, kp = prev.tot;
  const kpis: [string, string, number, number, boolean?][] = [
    ["Emails sent", k.sent.toLocaleString("en-US"), k.sent, kp.sent],
    ["Opened", fmt(pc(k.opened, k.tracked)), pc(k.opened, k.tracked), pc(kp.opened, kp.tracked)],
    ["Clicked", fmt(pc(k.clicked, k.tracked)), pc(k.clicked, k.tracked), pc(kp.clicked, kp.tracked)],
    ["Came back", fmt(pc(k.back, k.sent)), pc(k.back, k.sent), pc(kp.back, kp.sent), true],
    ["Back on desktop", fmt(pc(cur.desk, cur.backN)), pc(cur.desk, cur.backN), pc(prev.desk, prev.backN)],
  ];
  const allSent = calc(0, Date.now() + DAY).tot.sent;
  const barc = (v: number, cls = "") => <span className={"ebar " + cls}><i style={{ width: `${isFinite(v) ? Math.min(100, v) : 0}%` }} /></span>;
  return (
    <div className="v2wrap">
      <div className="v2kpis">
        {kpis.map(([l, v, c, p, main]) => <div key={l} className={"v2kpi" + (main ? " main" : "") + (l === "Opened" || l === "Came back" ? "" : " mhide")}><span>{l}</span><KVal v={v} loading={loading} partial={partial} /><Trend cur={c} was={p} na={from - len < W_LAUNCH} /></div>)}
      </div>
      <div className="v2card">
        <div className="v2head"><h3>Each email</h3><span className="sub">Came back = active again within 7 days · Continued = reached a further step · Opened &amp; clicked are tracked from 1 Nov</span></div>
        <table className="v2tbl emt">
          <thead><tr><th /><th>EMAIL</th><th className="mhide">SENT WHEN</th><th className="r">SENT</th><th>OPENED</th><th>CLICKED</th><th>CAME BACK</th><th className="mhide">CONTINUED A STEP</th></tr></thead>
          <tbody>
            {MAILS.map(([code, name, when]) => {
              const r = cur.per.get(code) || { sent: 0, tracked: 0, opened: 0, clicked: 0, back: 0, cont: 0 };
              const o = pc(r.opened, r.tracked), c = pc(r.clicked, r.tracked), b = pc(r.back, r.sent), ct = pc(r.cont, r.sent);
              const off = code === "S5";
              return (
                <tr key={code} className={off ? "off" : ""}>
                  <td><span className="ecode mono">{code === "W" ? "W" : code.replace("S", "S·")}</span></td>
                  <td><b>{name}</b></td>
                  <td className="mhide dim">{when}</td>
                  <td className="r mono">{off ? "—" : r.sent}</td>
                  <td><span className="mono">{fmt(o)}</span>{barc(o)}</td>
                  <td><span className="mono">{fmt(c)}</span>{barc(c)}</td>
                  <td><span className="mono or">{fmt(b)}</span>{barc(b, "or")}</td>
                  <td className="mhide"><span className="mono">{fmt(ct)}</span> <em className="dim mono">of sent</em></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="emcards">
          {MAILS.map(([code, name]) => {
            const r = cur.per.get(code) || { sent: 0, tracked: 0, opened: 0, clicked: 0, back: 0, cont: 0 };
            const o = pc(r.opened, r.tracked), c = pc(r.clicked, r.tracked), b = pc(r.back, r.sent);
            return (
              <div key={code} className={"emc" + (code === "S5" ? " off" : "")}>
                <p className="h"><span className="ecode mono">{code === "W" ? "W" : code.replace("S", "S·")}</span><b>{name}</b><em className="mono">{code === "S5" ? "not sent yet" : `${r.sent} sent`}</em></p>
                <div className="g">
                  <span><em>Opened</em><b className="mono">{fmt(o)}</b>{barc(o)}</span>
                  <span><em>Clicked</em><b className="mono">{fmt(c)}</b>{barc(c)}</span>
                  <span><em>Came back</em><b className="mono or">{fmt(b)}</b>{barc(b, "or")}</span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="v2note">Unsubscribed · <b>{unsub === null || !allSent ? "—" : fmt(pc(unsub, allSent))}</b> ({unsub ?? "—"} people) &nbsp; Bounced · <b>—</b> (not reported by the sender)</p>
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
type WeekMet = { spend: number; clicks: number; started: number; dive: number; signed: number; swiped: number; words: number; name: number; brandStart: number; chose: number; brand: number; paywall: number; unlock: number; buy: number };
// `base`: the row a step % divides by, when it isn't the row above.
const AROWS: { k: keyof WeekMet; t: string; s: string; d: string; main?: boolean; base?: keyof WeekMet }[] = [
  { k: "clicks", t: "Clicks", s: "Clicks", d: "clicked an ad (visits for free channels)" },
  { k: "started", t: "Started", s: "Started", d: "typed a brief, pressed “Name it”" },
  { k: "signed", t: "Sign-ups", s: "Sign-ups", d: "signed in at the gate, right after the brief" },
  { k: "dive", t: "Deep-dived", s: "Deep-dive", d: "opened the brief deep-dive (02·r)" },
  { k: "swiped", t: "Swiped brands", s: "Swipe", d: "into the brand swipe and taste (step % of Sign-ups: the deep-dive is optional)", base: "signed" },
  { k: "words", t: "Words starred", s: "Words", d: "starred words and moved on" },
  { k: "name", t: "Name chosen", s: "Name chosen", d: "continued with a name (“{Name} is yours”)", main: true },
  { k: "brandStart", t: "Brand started", s: "Brand", d: "into chapter 2: the taste quiz (the key step since 1 Nov)" },
  { k: "brand", t: "Logo picked", s: "Logo", d: "picked a logo, saw the free brand snapshot" },
  { k: "paywall", t: "Paywall seen", s: "Paywall", d: "reached P·2 Unlock (€29)" },
  { k: "unlock", t: "Unlock clicked", s: "Unlock", d: "tapped Unlock: the number this test measures" },
  { k: "chose", t: "Domain kept", s: "Domain", d: "kept a domain in chapter 3 (step % of Brand started)", base: "brandStart" },
  { k: "buy", t: "Buy click", s: "Buy click", d: "clicked to buy the domain (step % of Domain kept)", base: "chose" },
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

/* ── Handoff 19 · the paywall test: unlock ÷ seen, per price variant ── */
function PaywallTest({ flows, chan }: { flows: Flow[]; chan: string }) {
  const fl = flows.filter((f) => f.paywall && (chan === "All channels" || f.source === chan));
  const rows = [29, 39, 49].map((p) => {
    const g = fl.filter((f) => f.price === p);
    const un = g.filter((f) => f.unlock).length;
    const why = new Map<string, number>();
    for (const f of g) if (f.why) why.set(f.why, (why.get(f.why) || 0) + 1);
    const top = [...why.entries()].sort((a, b) => b[1] - a[1])[0];
    return { p, seen: g.length, un, rate: g.length ? (un / g.length) * 100 : 0, top: top ? `${top[0]} · ${top[1]}` : "—" };
  });
  const seen = fl.length, un = fl.filter((f) => f.unlock).length;
  const whyAll = new Map<string, number>();
  for (const f of fl) if (f.why) whyAll.set(f.why, (whyAll.get(f.why) || 0) + 1);
  return (
    <div className="paytest">
      <div className="anahead">
        <h2>Paywall test</h2>
        <span className="mono sub">{chan} · since launch · Unlock clicked ÷ Paywall seen, per price</span>
      </div>
      <div className="anascroll">
        <table className="anatbl pt">
          <thead>
            <tr className="subs"><th className="stp">PRICE</th><th className="h">Seen</th><th className="h">Unlock</th><th className="h">Rate</th><th className="h">Top “why not”</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.p}>
                <td className="stp"><b className="mono">€{r.p}</b></td>
                <td className="mono n">{r.seen}</td>
                <td className="mono n">{r.un}</td>
                <td className="mono tot">{r.seen ? (r.rate >= 10 ? Math.round(r.rate) : r.rate.toFixed(1)) + "%" : "—"}</td>
                <td className="dim">{r.top}</td>
              </tr>
            ))}
            <tr className="mainrow">
              <td className="stp"><b>All prices</b></td>
              <td className="mono n">{seen}</td>
              <td className="mono n">{un}</td>
              <td className="mono tot">{seen ? Math.round((un / seen) * 100) + "%" : "—"}</td>
              <td className="dim">{[...whyAll.entries()].sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w} ${n}`).join(" · ") || "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="ananote mono">Phase 1: Unlock is free (“You’re early”), so this measures intent at each price, not revenue. Small samples swing: read it at 30+ seen per price.</p>
    </div>
  );
}

/* ── Round-2 signals (last 30 days): how the new Words, Names and teaser get used ── */
function Signals({ flows, chan }: { flows: Flow[]; chan: string }) {
  const since = Date.now() - 30 * 864e5;
  const fl = flows.filter((f) => f.first >= since && f.email && (chan === "All channels" || f.source === chan));
  const toNames = fl.filter((f) => f.step >= 5);
  const auto = toNames.filter((f) => f.autoWords).length;
  const react = fl.filter((f) => f.reactions > 0);
  const taps = fl.reduce((a, f) => a + f.reactions, 0), fails = fl.reduce((a, f) => a + f.reactFails, 0);
  const named = fl.filter((f) => f.step >= 6 && f.last >= CUT_D);
  const toBrand = named.filter((f) => f.step >= 7).length;
  const atDomain = fl.filter((f) => f.step >= 10 || (f.saved && f.last >= CUT_D));
  const kept = atDomain.filter((f) => f.domain).length;
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) + "%" : "—");
  const rows: [string, string, string][] = [
    ["Words skipped", `${auto} of ${toNames.length}`, `${pct(auto, toNames.length)} reached names with nothing starred`],
    ["More names", `${taps} rounds · ${react.length} people`, fails ? `${fails} failed rounds` : "no failed rounds"],
    ["Name → brand started", `${toBrand} of ${named.length}`, `${pct(toBrand, named.length)} went from “{Name} is yours” into the brand (since 1 Nov)`],
    ["Domain kept", `${kept} of ${atDomain.length}`, `${pct(kept, atDomain.length)} kept a domain at the last step`],
  ];
  return (
    <div className="paytest">
      <div className="anahead">
        <h2>New-flow signals</h2>
        <span className="mono sub">{chan} · last 30 days · signed-up flows</span>
      </div>
      <div className="anascroll">
        <table className="anatbl pt">
          <tbody>
            {rows.map(([k, v, d]) => (
              <tr key={k}><td className="stp"><b>{k}</b></td><td className="mono n">{v}</td><td className="dim">{d}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Which ad groups / keywords bring founders who get to a name (last 30 days) ── */
function Breakdown({ flows, chan, by, title, empty }: { flows: Flow[]; chan: string; by: "content" | "term"; title: string; empty: string }) {
  const since = Date.now() - 30 * 864e5;
  const fl = flows.filter((f) => f.first >= since && (chan === "All channels" || f.source === chan));
  const g = new Map<string, Flow[]>();
  for (const f of fl) { const k = f[by] || `(${empty})`; if (!g.has(k)) g.set(k, []); g.get(k)!.push(f); }
  const rows = [...g.entries()].map(([k, v]) => {
    const signed = v.filter((f) => f.email).length, named = v.filter((f) => f.email && f.step >= 6).length;
    return { k, n: v.length, signed, named, rate: signed ? Math.round((named / signed) * 100) : 0 };
  }).sort((a, b) => b.n - a.n).slice(0, 15);
  if (!rows.length) return null;
  return (
    <div className="paytest">
      <div className="anahead">
        <h2>{title}</h2>
        <span className="mono sub">{chan} · last 30 days · Names = name chosen ÷ sign-ups</span>
      </div>
      <div className="anascroll">
        <table className="anatbl pt">
          <thead>
            <tr className="subs"><th className="stp">{by === "term" ? "KEYWORD" : "AD GROUP"}</th><th className="h">Visits</th><th className="h">Sign-ups</th><th className="h">Names</th><th className="h">Rate</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.k}>
                <td className="stp"><b className="mono">{r.k}</b></td>
                <td className="mono n">{r.n}</td>
                <td className="mono n">{r.signed}</td>
                <td className="mono n">{r.named}</td>
                <td className="mono tot">{r.signed ? r.rate + "%" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
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
      dive: fl.filter((f) => f.email && f.dive).length,
      signed: fl.filter((f) => f.email).length,
      swiped: fl.filter((f) => f.email && f.step >= 3).length,
      words: fl.filter((f) => f.email && f.step >= 5).length,
      name: fl.filter((f) => f.email && f.step >= 6).length,
      brandStart: fl.filter((f) => f.email && f.step >= 7).length,
      chose: fl.filter((f) => f.email && !!f.domain).length,
      brand: fl.filter((f) => f.email && (f.logo || f.step >= 8)).length,
      paywall: fl.filter((f) => f.paywall).length,
      unlock: fl.filter((f) => f.unlock).length,
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
    const stepBase = ri === 0 ? 0 : m[r.base || AROWS[ri - 1].k];
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
          {ri > 0 && pts !== null && m.clicks
            ? Math.abs(pts) < 0.05 ? <i className="flat">= 0.0</i> : <i className={pts > 0 ? "up" : "down"}>{pts > 0 ? "▲" : "▼"} {Math.abs(pts).toFixed(1)}</i>
            : <i className="ghost">{" "}</i>}
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
          <button className={gran === "week" ? "on" : ""} onClick={() => { setGran("week"); setWk(0); }}>By week</button>
          <button className={gran === "day" ? "on" : ""} onClick={() => { setGran("day"); setWk(0); }}>By day</button>
        </span>
        {lastAdDay
          ? <span className="sync"><i /> Ads synced · through {lastAdDay}</span>
          : <span className="sync none">No spend data yet — paste docs/ads/ads-script.js into Google Ads → Scripts</span>}
      </div>
      <div className={"anakpis" + (loading ? " ld" : "")} title={loading ? "Still loading the full history — these numbers will grow" : undefined}>
        <div className="akpi"><span>Spend</span><b className="mono">{eur(spend5)}</b><Delta cur={spend5} was={spendP} /><em className="was mono">was {eur(spendP)}</em></div>
        <div className="akpi"><span>Sign-ups</span><b className="mono">{sign5.toLocaleString("en-US")}</b><Delta cur={sign5} was={signP} /><em className="was mono">was {signP}</em></div>
        <div className="akpi"><span>Names chosen</span><b className="mono">{name5.toLocaleString("en-US")}</b><Delta cur={name5} was={nameP} /><em className="was mono">was {nameP}</em></div>
        <div className="akpi"><span>Paywall unlocked</span><b className="mono">{sum(l5, "unlock")}</b><Delta cur={sum(l5, "unlock")} was={sum(p5, "unlock")} /><em className="was mono">was {sum(p5, "unlock")}</em></div>
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
      <Signals flows={flows} chan={chan} />
      <PaywallTest flows={flows} chan={chan} />
      <Breakdown flows={flows} chan={chan} by="content" title="By ad group" empty="no ad group tag" />
      <Breakdown flows={flows} chan={chan} by="term" title="By keyword" empty="no keyword yet" />
    </div>
  );
}

/* ── Admin · Feedback: the "before you go" pop-up, read back (A·f / A·m·f) ── */
const FB_STEPS = ["Brief", "Deep-dive", "Swipe", "Words", "Names", "Brand", "Book", "Socials", "Domain"] as const; // the domain is the last chapter since 1 Nov
const STEP_LAB: Record<string, string> = {
  ask: "Brief", brief: "Brief", refine: "Deep-dive", brands: "Swipe", brandsum: "Swipe", words: "Words",
  names: "Names", claim: "Domain", reveal: "Names", domain: "Domain", brand: "Brand", feel: "Brand", tcol: "Brand", ttype: "Brand", tshape: "Brand", snap: "Brand", unlock: "Brand", kit: "Socials", mkt: "Socials", taste: "Brand", logo: "Brand",
  logodone: "Brand", pers: "Brand", book: "Book", socials: "Socials", done: "Socials",
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

function FeedbackView({ items, flows, from, to, loading, q, onOpenFlow }: {
  items: LogItem[]; flows: Flow[]; from: number; to: number; loading: boolean; q: string; onOpenFlow: (id: string) => void;
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
  const cards = answers.filter((a) => {
    if (rsel && !reasonsOf(a).includes(rsel)) return false;
    const pl = a.input?.payload || {};
    return hit(q, [pl.meta?.email, pl.meta?.uname, pl.note, ...reasonsOf(a)]);
  });
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
  mk("p1", "logo", 25.2 * H, meta1), mk("p1", "paywall_seen", 25.15 * H, { price: 39, ...meta1 }), mk("p1", "unlock_clicked", 25.1 * H, { price: 39, source: "paywall", ...meta1 }),
  mk("p1", "book", 25 * H, meta1), mk("p1", "done", 24.9 * H, { name: "Mijo", ...meta1 }),
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
  mk("p4", "logo", 49.2 * H, meta4, "US"), mk("p4", "paywall_seen", 49.1 * H, { price: 49, ...meta4 }, "US"),
  mk("p4", "why_not", 49.05 * H, { reason: "Too expensive", ...meta4 }, "US"),
  mk("p2", "poll", 4.45 * H, { variant: "exit", step: "names", ...meta2 }, "GB"),
  mk("p3", "poll", 0.1 * H, { variant: "idle", step: "brief", ...meta3 }, "ES"),
  mk("p4", "poll", 49.45 * H, { variant: "idle", step: "words", ...meta4 }, "US"),
];
const dday = (i: number) => new Date(now - i * 864e5).toISOString().slice(0, 10);
const DEMO_ADS: AdsDay[] = Array.from({ length: 40 }, (_, i) => ({
  date: dday(i),
  rows: [{ channel: "Google Ads", campaign: "Search — Naming EN", cost: 18 + ((i * 7) % 15), clicks: 30 + ((i * 11) % 25), impressions: 400 + ((i * 37) % 220) }],
}));
