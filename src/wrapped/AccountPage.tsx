// 10 · Your account: sidebar (My names / Downloads / Settings + who you are),
// a grid of every name you've started, and a "ready to use" bar per claimed
// name. Signed out, it's a single Google sign-in on the black stage.
import { useEffect, useRef, useState } from "react";
import "./wrapped.css";
import {
  GOOGLE_CLIENT_ID, authGoogle, fetchMe, loadGsi, loadSession, saveSession,
  type SavedSearch, type WUser,
} from "./api";
import { buildLogoPack, DEFAULT_PALETTE, logoSvg, toPalette, type Accent } from "./logos";
import { download } from "./zip";
import { printBook } from "./Book";
import { ReportPrint } from "./Report";

const BASE = () => (import.meta as any).env.BASE_URL || "/";

type Tab = "names" | "settings";

// "?demo": the signed-in layout with sample data, for design QA without a session.
const DEMO = new URLSearchParams(window.location.search).has("demo");
const day = 86400000;
const DEMO_DATA: { user: WUser; searches: SavedSearch[] } = {
  user: { sub: "demo", email: "dimitri@dfginvest.fr", name: "Dimitri Farber" },
  searches: [
    { id: "d1", at: Date.now() - 6 * day, updated: Date.now() - 6 * day, sentence: "An AI naming studio with a strategist's rigor, in minutes.", chips: [], picked: { name: "Aurova", roots: "aurora + nova", parts: [], tagline: "", score: 97 }, domain: "aurova.com", logo: { key: "sunrise", title: "Sunrise", seed: 0, accent: "dawn" }, steps: { domain: "done", logo: "done", book: "done", socials: "skipped" }, status: "claimed" },
    { id: "d2", at: Date.now() - 11 * day, updated: Date.now() - 11 * day, sentence: "A calm budgeting app for students and first jobs.", chips: [], names: new Array(7).fill(0).map((_, i) => ({ name: "N" + i, roots: "", parts: [], tagline: "", score: 80 - i })), steps: {}, status: "ready" },
    { id: "d3", at: Date.now() - 17 * day, updated: Date.now() - 17 * day, sentence: "A specialty coffee brand for slow mornings.", chips: [], starred: new Array(12).fill(0).map((_, i) => ({ w: "w" + i, m: "" })), steps: {}, status: "exploring" },
  ],
};

export function AccountPage() {
  const [user, setUser] = useState<WUser | null>(() => (DEMO ? DEMO_DATA.user : loadSession()?.user || null));
  const [searches, setSearches] = useState<SavedSearch[]>(DEMO ? DEMO_DATA.searches : []);
  const [checked, setChecked] = useState(DEMO);
  const [tab, setTab] = useState<Tab>("names");
  const [modal, setModal] = useState<SavedSearch | null>(null);

  useEffect(() => {
    if (DEMO) return;
    fetchMe().then((r) => {
      setUser(r.user);
      setSearches([...r.searches].sort((a, b) => (b.updated || b.at) - (a.updated || a.at)));
      setChecked(true);
    });
  }, []);

  if (!user) return <SignIn ready={checked} onUser={(u, s) => { setUser(u); setSearches(s); }} />;

  const first = (user.name || user.email).split(/[ @]/)[0];
  const initials = (user.name || user.email).split(/[ @.]/).slice(0, 2).map((x) => x[0] || "").join("").toUpperCase();

  const NAV: { k: Tab; label: string; n?: number }[] = [
    { k: "names", label: "My names", n: searches.length },
    { k: "settings", label: "Settings" },
  ];

  return (
    <div className="wr-acct">
      {/* sidebar (desktop) */}
      <aside className="side wr-hidemob">
        <a className="wr-brand" href={BASE()} style={{ textDecoration: "none" }}>
          <span className="bx"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M 2 8.5 A 4 4 0 0 1 10 8.5 Z" fill="#000" /></svg></span>
          <span className="bt">the naming studio</span>
        </a>
        <nav>
          {NAV.map((n) => (
            <button key={n.k} className={tab === n.k ? "on" : ""} onClick={() => setTab(n.k)}>
              {n.label}{n.n ? <em>{n.n}</em> : null}
            </button>
          ))}
        </nav>
        <div className="me">
          <span className="av">{initials}</span>
          <span><b>{user.name || "Founder"}</b><small>{user.email}</small></span>
        </div>
      </aside>

      <main className="wrap">
        {/* mobile brand row */}
        <div className="wr-hidedesk" style={{ padding: "18px 0 0" }}>
          <a className="wr-brand" href={BASE()} style={{ textDecoration: "none" }}>
            <span className="bx"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M 2 8.5 A 4 4 0 0 1 10 8.5 Z" fill="#000" /></svg></span>
            <span className="bt">the naming studio</span>
          </a>
        </div>

        {tab === "names" && (
          <>
            <div className="headrow">
              <div>
                <p className="wr-kicker">Welcome back, {cap(first)}</p>
                <h1 className="wr-h" style={{ margin: "8px 0 0" }}>Your names</h1>
              </div>
              <button className="wr-btn newpill" onClick={() => window.location.assign(BASE())}>＋ Name something new</button>
            </div>
            {!searches.length && <p className="wr-hint" style={{ marginTop: 18 }}>Nothing yet. Start your first name.</p>}
            <div className="wr-sgrid">
              {searches.map((s) => <SearchCard key={s.id} s={s} onOpen={() => (s.status === "claimed" ? setModal(s) : open(s))} />)}
            </div>
          </>
        )}

        {tab === "settings" && (
          <>
            <div className="headrow"><h1 className="wr-h" style={{ margin: 0 }}>Settings</h1></div>
            <div className="wr-dlrow" style={{ marginTop: 16 }}>
              <span><span className="tt" style={{ display: "block" }}>{user.name || "Founder"}</span><span className="ss">{user.email}</span></span>
              <span className="act"><button className="wr-btn2" onClick={() => { saveSession(null); setUser(null); setSearches([]); }}>Sign out</button></span>
            </div>
            <p className="wr-hint" style={{ marginTop: 16 }}>Signed in with Google. Your searches are saved to this account.</p>
          </>
        )}
      </main>

      {modal && <NameModal s={modal} onClose={() => setModal(null)} />}

      {/* mobile bottom bar */}
      <div className="wr-acctbar wr-hidedesk">
        {NAV.map((n) => (
          <button key={n.k} className={tab === n.k ? "on" : ""} onClick={() => setTab(n.k)}>
            <span style={{ fontSize: 16 }}>{n.k === "names" ? "✦" : "⚙"}</span>
            {n.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const open = (s: SavedSearch, go?: string) =>
  window.location.assign(BASE() + "?resume=" + encodeURIComponent(s.id) + (go ? "&go=" + go : ""));

/* ── 10b: everything for a claimed name, in one place ── */
function NameModal({ s, onClose }: { s: SavedSearch; onClose: () => void }) {
  const name = s.picked?.name || "Untitled";
  const pal = toPalette(s.palette || null) || DEFAULT_PALETTE;
  const date = new Date(s.updated || s.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const grad = `linear-gradient(120deg, ${pal.dawn}, ${pal.haze} 50%, ${pal.nova})`;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  async function logoPack() {
    if (!s.logo) { open(s, "logo"); return; }
    const pack = await buildLogoPack(name, s.logo.key, (s.logo.accent as Accent) || "dawn", s.logo.seed || 0, s.palette);
    download(pack.blob, pack.filename);
  }
  return (
    <div className="wr-nmodal" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <button className="x" onClick={onClose} aria-label="Close">✕</button>
        <div className="head">
          <span className="tile" style={{ background: grad }}>
            {s.logo && <span dangerouslySetInnerHTML={{ __html: logoSvg("appicon", name, pal, { variant: "icon", accent: (s.logo.accent as Accent) || "dawn", seed: s.logo.seed || 0, height: 44 }) }} />}
          </span>
          <div>
            <p className="k">Claimed · {date}</p>
            <h3>{name}</h3>
          </div>
        </div>
        <p className="brief">{s.sentence}</p>
        <p className="k" style={{ margin: "18px 0 10px" }}>Everything for {name}</p>
        <div className="rows">
          {s.domain && (
            <a className="row lead" href={`https://${s.domain}`} target="_blank" rel="noopener noreferrer">
              <span className="ic"><i className="dot" /></span>
              <span className="tt"><b>{s.domain}</b><small>Registered</small></span>
              <span className="act">Manage ↗</span>
            </a>
          )}
          <button className="row" onClick={logoPack}>
            <span className="ic dark"><svg width="16" height="16" viewBox="0 0 12 12"><path d="M 2 8.5 A 4 4 0 0 1 10 8.5 Z" fill="#fff" /></svg></span>
            <span className="tt"><b>Logo pack</b><small>{s.logo ? `${s.logo.title} · SVG + PNG` : "Pick a concept first"}</small></span>
            <span className="act">↓</span>
          </button>
          <button className="row" onClick={() => open(s, "book")}>
            <span className="ic" style={{ background: grad, color: pal.night, fontWeight: 800, fontSize: 12 }}>Aa</span>
            <span className="tt"><b>Brand book</b><small>PDF · 10 pages</small></span>
            <span className="act">↓</span>
          </button>
          <button className="row" onClick={() => printBook(`${name} - Naming report`)}>
            <span className="ic dark">✦</span>
            <span className="tt"><b>Naming report</b><small>PDF · 4 pages</small></span>
            <span className="act">↓</span>
          </button>
          <button className="row" onClick={() => open(s, "socials")}>
            <span className="ic dark">@</span>
            <span className="tt"><b>Social accounts</b><small>Instagram, X, TikTok, LinkedIn</small></span>
            <span className="act">Open ↗</span>
          </button>
        </div>
      </div>
      <ReportPrint s={s} />
    </div>
  );
}

function SearchCard({ s, onOpen }: { s: SavedSearch; onOpen: () => void }) {
  const date = new Date(s.updated || s.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const label = s.status === "claimed" ? "Claimed" : s.status === "ready" ? "Names ready" : "Exploring";
  const segs = [s.steps?.domain === "done", s.steps?.logo === "done", s.steps?.book === "done", s.steps?.socials === "done"];
  const next =
    s.status === "claimed" ? "Everything is ready" :
    s.names?.length ? `Pick one of ${s.names.length} names` :
    s.starred?.length ? `${s.starred.length} words starred` : "Continue the brief";
  return (
    <button className="wr-scard" onClick={onOpen}>
      <span className="top">
        <span className={"wr-status" + (s.status === "claimed" ? " claimed" : "")}>{label}</span>
        <span className="date">{date}</span>
      </span>
      <span className="idrow">
        <span className="thumb">
          {s.logo && s.picked
            ? <span dangerouslySetInnerHTML={{ __html: logoSvg("appicon", s.picked.name, DEFAULT_PALETTE, { variant: "icon", accent: (s.logo.accent as any) || "dawn", seed: s.logo.seed || 0, height: 30 }) }} />
            : null}
        </span>
        <span className="nm">{s.picked?.name || s.names?.[0]?.name || "Untitled"}</span>
      </span>
      <span className="br">{s.sentence}</span>
      <span className="wr-seg4">{segs.map((on, i) => <span key={i} className={on ? "on" : ""} />)}</span>
      <span className="foot">
        <span className="na">{next}</span>
        <span className="opn pill">Open →</span>
      </span>
    </button>
  );
}

function SignIn({ ready, onUser }: { ready: boolean; onUser: (u: WUser, s: SavedSearch[]) => void }) {
  const gbtn = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const init = () => {
      const w = window as any;
      if (!w.google?.accounts?.id || !gbtn.current) return;
      w.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (resp: any) => {
          const r = await authGoogle(resp.credential);
          if (r) onUser(r.user, r.searches);
          else setErr("Sign-in didn't stick, try again.");
        },
      });
      w.google.accounts.id.renderButton(gbtn.current, { type: "standard", theme: "filled_black", size: "large", text: "continue_with", shape: "pill", width: 300 });
    };
    return loadGsi(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  return (
    <div className="wr">
      <div className="wr-glow" />
      <div className="wr-top">
        <a className="wr-brand" href={BASE()} style={{ textDecoration: "none" }}>
          <span className="bx"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M 2 8.5 A 4 4 0 0 1 10 8.5 Z" fill="#000" /></svg></span>
          <span className="bt">the naming studio</span>
        </a>
      </div>
      <div className="wr-stage center" style={{ textAlign: "center", alignItems: "center" }}>
        <p className="wr-kicker" style={{ marginBottom: 14 }}>Your account</p>
        <h1 className="wr-h" style={{ marginBottom: 10 }}>Every name you've started.</h1>
        <p className="wr-lead" style={{ marginBottom: 26, maxWidth: 380 }}>Sign in to pick up where you left off, and to keep your brand books and logo packs.</p>
        {GOOGLE_CLIENT_ID
          ? <div ref={gbtn} style={{ minHeight: 44 }} />
          : <p className="wr-hint">Google sign-in is being set up. Check back shortly.</p>}
        {err && <p className="wr-hint" style={{ marginTop: 10 }}>{err}</p>}
      </div>
    </div>
  );
}
