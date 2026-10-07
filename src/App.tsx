// Router for the Naming Studio "Wrapped" app:
//   /              the flow (landing → name → own it)     [?test = sample data + jump bar]
//   /test/<step>   the flow on the Tiller fixture, opened straight at that step
//   /account       every name you've started (Google account)
//   /admin         the funnel + every search (central log)
// GitHub Pages serves 404.html → index.html, so deep paths work.
import { WrappedApp } from "./wrapped/WrappedApp";
import { SharePage } from "./wrapped/SharePage";
import { AccountPage } from "./wrapped/AccountPage";
import { AdminPage } from "./wrapped/AdminPage";
import { setFixture } from "./wrapped/api";

export default function App() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.replace(/^#\/?/, "");
  const is = (name: string) =>
    new RegExp(`(?:^|/)${name}/?$`).test(path) || params.has(name) || hash === name;

  // /s/<id>: the public page behind a shared link
  const shareMatch = path.match(/(?:^|\/)s\/([a-z0-9-]{3,60})\/?$/);
  if (shareMatch) return <SharePage id={shareMatch[1]} />;

  if (is("admin") || /(?:^|\/)admin\/users\/?$/.test(path)) return <AdminPage />;
  if (is("settings")) return <AccountPage initialTab="settings" />;
  if (is("account")) return <AccountPage />;

  // /test/1-brief, /test/8-logos… run the flow on the Tiller example.
  const testPath = /(?:^|\/)test(?:\/|$)/.test(path);
  if (testPath) setFixture("tiller");

  return (
    <WrappedApp
      test={testPath || params.has("test") || hash === "test"}
      resume={params.get("resume") || undefined}
      go={params.get("go") || undefined}
    />
  );
}
