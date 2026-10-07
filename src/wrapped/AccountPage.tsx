// My names (design U·d / U·m): every signed-in user's flows on the white
// paper theme, with resume, share, delete, and the shared settings pane.
import { useEffect, useRef, useState } from "react";
import "./wrapped.css";
import {
  GOOGLE_CLIENT_ID, adminRoles, authGoogle, fetchMe, loadGsi, loadSession, saveSession,
  searchDel, type SavedSearch, type WUser,
} from "./api";
import { AvatarMenu, BASE, SettingsPane } from "./paper";
import { STEPS } from "./AdminPage";

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// A saved search maps onto the same 0-9 steps the admin uses.
function stepOf(s: SavedSearch): number {
  if (s.steps?.socials === "done") return 9;
  if (s.steps?.book === "done") return 8;
  if (s.logo) return 7;
  if (s.steps?.domain === "done") return 6;
  if (s.picked) return 5;
  if (s.names?.length) return 4;
  if (s.starred?.length) return 3;
  if (s.concept) return 2;
  return 1;
}

export function AccountPage({ initialTab }: { initialTab?: "mine" | "settings" | "all" } = {}) {
  const [user, setUser] = useState<WUser | null>(() => loadSession()?.user || null);
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<"all" | "progress" | "done">("all");
  const [settings, setSettings] = useState(initialTab === "settings");
  const demo = new URLSearchParams(window.location.search).has("demo");

  useEffect(() => {
    if (demo) {
      setUser({ sub: "demo", email: "dimitri@dfginvest.fr", name: "Dimitri Farber" });
      setSearches(DEMO);
      setIsAdmin(true);
      setLoading(false);
      return;
    }
    fetchMe().then((r) => {
      if (r.user) { setUser(r.user); setSearches(r.searches); }
      setLoading(false);
    });
    adminRoles().then((r) => setIsAdmin(!!r && !r.hasOwnProperty("error")));
  }, [demo]);

  const logout = () => { saveSession(null); setUser(null); window.location.assign(BASE()); };

  if (!user) return <SignIn onUser={(u, s) => { setUser(u); setSearches(s); }} loading={loading} />;

  const prog = searches.filter((s) => stepOf(s) < 9);
  const done = searches.filter((s) => stepOf(s) >= 9);
  const shown = tab === "progress" ? prog : tab === "done" ? done : searches;

  return (
    <div className="kadm kacc">
      <div className="bar">
        <span className="brand"><span className="bt">NAME NAME</span></span>
        <span style={{ flex: 1 }} />
        <a className="newcta" href={BASE()}>＋ Name something new</a>
        <AvatarMenu me={user} isAdmin={isAdmin} current="account" onLogout={logout} />
      </div>

      <div className="wrap">
        {settings ? (
          <>
            <button className="backlink" onClick={() => { setSettings(false); try { window.history.replaceState(null, "", BASE() + "account"); } catch { /* */ } }}>← My names</button>
            <SettingsPane me={user} />
          </>
        ) : (
          <>
            <p className="hi">Hi {cap((user.name || "there").split(" ")[0])}</p>
            <div className="headrow">
              <h2>Your names</h2>
              <span className="tabs">
                {([["All", "all", searches.length], ["In progress", "progress", prog.length], ["Completed", "done", done.length]] as const).map(([l, v, n]) => (
                  <button key={v} className={tab === v ? "on" : ""} onClick={() => setTab(v as any)}>{l} <i>{n}</i></button>
                ))}
              </span>
            </div>
            {!loading && !searches.length && <p className="hint" style={{ marginTop: 18 }}>Nothing yet. Name something.</p>}
            <div className="cards">
              {shown.map((s) => <FlowCard key={s.id} s={s} demo={demo} onDeleted={() => setSearches((xs) => xs.filter((x) => x.id !== s.id))} />)}
            </div>
          </>
        )}
      </div>
      <a className="newcta mobilefix" href={BASE()}>＋ Name something new</a>
    </div>
  );
}

function FlowCard({ s, demo, onDeleted }: { s: SavedSearch; demo: boolean; onDeleted: () => void }) {
  const st = stepOf(s);
  const completed = st >= 9;
  const date = new Date(s.updated || s.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const resume = (go?: string) => `${BASE()}?resume=${encodeURIComponent(s.id)}${go ? `&go=${go}` : ""}`;
  const line = completed
    ? [s.domain, "brand book"].filter(Boolean).join(" · ")
    : s.names?.length ? `${s.names.length} names shortlisted`
    : s.starred?.length ? `${s.starred.length} words starred`
    : "Just started";
  return (
    <div className={"fcard" + (completed ? " donecard" : "")}>
      <div className="top">
        <span className={"pill" + (completed ? " dark" : "")}>{completed ? "Completed" : `Stopped at ${STEPS[st]}`}</span>
        <span className="date mono">{date}</span>
      </div>
      <h3>{s.picked?.name || s.names?.[0]?.name || "No name yet"}</h3>
      {s.sentence && <p className="brief">“{s.sentence}”</p>}
      <div className="prog">
        <span className="mono">{String(st + 1).padStart(2, "0")} / 10</span>
        <span className="segs">{STEPS.map((_, i) => <i key={i} className={i < st ? "d" : i === st ? "c" : ""} />)}</span>
      </div>
      <p className="line">{line}</p>
      <div className="acts">
        {completed ? (
          <>
            <a className="btn dark" href={resume("book")}>Open brand book</a>
            <a className="btn ghost" href={resume()}>Share</a>
          </>
        ) : (
          <>
            <a className="btn orange" href={resume()}>Continue →</a>
            <button className="btn ghost" onClick={async () => { if (demo || await searchDel(s.id)) onDeleted(); }}>Delete</button>
          </>
        )}
      </div>
    </div>
  );
}

function SignIn({ onUser, loading }: { onUser: (u: WUser, s: SavedSearch[]) => void; loading: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const init = () => {
      const w = window as any;
      if (!w.google?.accounts?.id || !host.current) return;
      w.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (resp: any) => {
          const r = await authGoogle(resp.credential);
          if (r) onUser(r.user, r.searches);
        },
      });
      w.google.accounts.id.renderButton(host.current, { type: "standard", theme: "filled_black", size: "large", text: "continue_with", shape: "pill", width: 300 });
    };
    return loadGsi(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="kadm gate">
      <span className="bt">NAME NAME</span>
      <p>{loading ? "Checking your session…" : "Your names live behind your Google account."}</p>
      <div ref={host} />
      <a href={BASE()}>← Back to the studio</a>
    </div>
  );
}

/* ?demo data for styling */
const DEMO: SavedSearch[] = [
  { id: "d1", at: Date.now() - 6 * 864e5, updated: Date.now() - 5.6 * 864e5, sentence: "An AI naming studio with a strategist's rigor, in minutes.", chips: [], picked: { name: "Aurova", roots: "", parts: [], tagline: "", score: 97 }, domain: "aurova.com", logo: { key: "sunrise", title: "Sunrise", seed: 0 }, steps: { domain: "done", book: "done", socials: "done" }, status: "claimed", names: [] as any },
  { id: "d2", at: Date.now() - 2 * 864e5, updated: Date.now() - 864e5, sentence: "A calm budgeting app for students and first jobs.", chips: [], names: [{ name: "Lumora" } as any, { name: "Sava" } as any, { name: "N0" } as any], steps: {}, status: "ready" },
  { id: "d3", at: Date.now() - 12 * 864e5, updated: Date.now() - 11 * 864e5, sentence: "A specialty coffee brand for slow mornings.", chips: [], starred: [{ w: "ember", m: "" }, { w: "roast", m: "" }] as any, steps: {}, status: "exploring" },
];
