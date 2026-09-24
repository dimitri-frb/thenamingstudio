// 10 · Your account: every name you've started, with resume, downloads and
// settings. Signed out, it's a single Google sign-in on the black stage.
import { useEffect, useRef, useState } from "react";
import "./wrapped.css";
import {
  GOOGLE_CLIENT_ID, authGoogle, fetchMe, loadGsi, loadSession, saveSession,
  type SavedSearch, type WUser,
} from "./api";

const BASE = () => (import.meta as any).env.BASE_URL || "/";

export function AccountPage() {
  const [user, setUser] = useState<WUser | null>(() => loadSession()?.user || null);
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [checked, setChecked] = useState(false);
  const [tab, setTab] = useState<"names" | "downloads" | "settings">("names");

  useEffect(() => {
    fetchMe().then((r) => {
      setUser(r.user);
      setSearches([...r.searches].sort((a, b) => (b.updated || b.at) - (a.updated || a.at)));
      setChecked(true);
    });
  }, []);

  if (!user) return <SignIn ready={checked} onUser={(u, s) => { setUser(u); setSearches(s); }} />;

  const first = (user.name || user.email).split(/[ @]/)[0];
  const ready = searches.filter((s) => s.picked);

  return (
    <div className="wr-acct">
      <div className="wrap">
        <div className="wr-top" style={{ padding: "18px 0 0" }}>
          <a className="wr-brand" href={BASE()} style={{ textDecoration: "none" }}>
            <span className="bx"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M 2 8.5 A 4 4 0 0 1 10 8.5 Z" fill="#000" /></svg></span>
            <span className="bt">the naming studio</span>
          </a>
          <span className="wr-hidemob" style={{ display: "inline-flex", gap: 8 }}>
            {(["names", "downloads", "settings"] as const).map((t) => (
              <button key={t} className={"wr-tab" + (tab === t ? " on" : "")} onClick={() => setTab(t)}>
                {t === "names" ? `My names ${searches.length || ""}` : t === "downloads" ? "Downloads" : "Settings"}
              </button>
            ))}
          </span>
        </div>

        {tab === "names" && (
          <>
            <h1 className="wr-h" style={{ margin: "30px 0 2px" }}>Welcome back, {cap(first)}</h1>
            <p className="wr-lead" style={{ color: "var(--text3)" }}>Your names</p>
            <button className="wr-newbtn" onClick={() => window.location.assign(BASE())}>＋ Name something new</button>
            {!searches.length && <p className="wr-hint">Nothing yet. Start your first name above.</p>}
            {searches.map((s) => <SearchCard key={s.id} s={s} />)}
          </>
        )}

        {tab === "downloads" && (
          <>
            <h1 className="wr-h" style={{ margin: "30px 0 14px" }}>Downloads</h1>
            {!ready.length && <p className="wr-hint">Pick a name first, its brand book and logo pack will land here.</p>}
            {ready.map((s) => (
              <div key={s.id}>
                <p className="wr-kicker" style={{ margin: "18px 0 4px" }}>{s.picked!.name} · ready to use</p>
                <div className="wr-dlrow">
                  <span><span className="tt" style={{ display: "block" }}>Brand book</span><span className="ss">10 pages · PDF</span></span>
                  <span className="act"><button className="wr-btn2" onClick={() => open(s)}>↓ Open</button></span>
                </div>
                <div className="wr-dlrow">
                  <span><span className="tt" style={{ display: "block" }}>Logo pack</span><span className="ss">SVG · PNG</span></span>
                  <span className="act"><button className="wr-btn2" onClick={() => open(s)}>↓ Open</button></span>
                </div>
                {s.domain && (
                  <div className="wr-dlrow">
                    <span><span className="tt" style={{ display: "block" }}>{s.domain}</span><span className="ss">your domain</span></span>
                    <span className="act"><a className="wr-btn2" style={{ textDecoration: "none", display: "inline-block" }} href={`https://${s.domain}`} target="_blank" rel="noopener noreferrer">Manage ↗</a></span>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {tab === "settings" && (
          <>
            <h1 className="wr-h" style={{ margin: "30px 0 18px" }}>Settings</h1>
            <div className="wr-dlrow" style={{ borderTop: "1px solid var(--hairline)" }}>
              <span><span className="tt" style={{ display: "block" }}>{user.name || "Founder"}</span><span className="ss">{user.email}</span></span>
              <span className="act"><button className="wr-btn2" onClick={() => { saveSession(null); setUser(null); setSearches([]); }}>Sign out</button></span>
            </div>
            <p className="wr-hint" style={{ marginTop: 16 }}>Signed in with Google. Your searches are saved to this account.</p>
          </>
        )}
      </div>

      {/* mobile bottom bar */}
      <div className="wr-acctbar wr-hidedesk">
        {(["names", "downloads", "settings"] as const).map((t) => (
          <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
            <span style={{ fontSize: 16 }}>{t === "names" ? "✦" : t === "downloads" ? "↓" : "⚙"}</span>
            {t === "names" ? "My names" : t === "downloads" ? "Downloads" : "Settings"}
          </button>
        ))}
      </div>
    </div>
  );
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const open = (s: SavedSearch) => window.location.assign(BASE() + "?resume=" + encodeURIComponent(s.id));

function SearchCard({ s }: { s: SavedSearch }) {
  const date = new Date(s.updated || s.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const label = s.status === "claimed" ? "Claimed" : s.status === "ready" ? "Names ready" : "Exploring";
  const segs = [s.steps?.domain === "done", s.steps?.logo === "done", s.steps?.book === "done", s.steps?.socials === "done"];
  const next =
    s.status === "claimed" ? [s.domain, s.steps?.book === "done" ? "brand book" : ""].filter(Boolean).join(" · ") :
    s.names?.length ? `Pick one of ${s.names.length} names` :
    s.starred?.length ? `${s.starred.length} words starred` : "Continue the brief";
  return (
    <div className="wr-scard">
      <div className="top">
        <span className={"wr-status" + (s.status === "claimed" ? " claimed" : "")}>{label}</span>
        <span className="date">{date}</span>
      </div>
      <div className="nm">{s.picked?.name || "Untitled"}</div>
      <div className="br">{s.sentence}</div>
      {s.picked && <div className="wr-seg4">{segs.map((on, i) => <span key={i} className={on ? "on" : ""} />)}</div>}
      <div className="foot">
        <span className="na">{next}</span>
        <button className="open" onClick={() => open(s)}>Open →</button>
      </div>
    </div>
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
