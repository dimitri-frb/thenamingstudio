// Router for the Naming Studio "Wrapped" app:
//   /              the flow (landing → name → own it)     [?test = sample data + jump bar]
//   /test/<step>   the flow on the Tiller fixture, opened straight at that step
//   /account       every name you've started (Google account)
//   /admin         the funnel + every search (central log)
// GitHub Pages serves 404.html → index.html, so deep paths work.
import { lazy, Suspense } from "react";
import { WrappedApp } from "./wrapped/WrappedApp";
import { setFixture } from "./wrapped/api";

// Every ad click downloads the flow; the admin, account and share pages ride
// in their own chunks so they never weigh on a founder's first paint.
const SharePage = lazy(() => import("./wrapped/SharePage").then((m) => ({ default: m.SharePage })));
const AccountPage = lazy(() => import("./wrapped/AccountPage").then((m) => ({ default: m.AccountPage })));
const AdminPage = lazy(() => import("./wrapped/AdminPage").then((m) => ({ default: m.AdminPage })));

export default function App() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.replace(/^#\/?/, "");
  const is = (name: string) =>
    new RegExp(`(?:^|/)${name}/?$`).test(path) || params.has(name) || hash === name;

  // /s/<id>: the public page behind a shared link
  const shareMatch = path.match(/(?:^|\/)s\/([a-z0-9-]{3,60})\/?$/);
  if (shareMatch) return <Suspense fallback={null}><SharePage id={shareMatch[1]} /></Suspense>;

  if (is("admin") || /(?:^|\/)admin\/users\/?$/.test(path)) return <Suspense fallback={null}><AdminPage /></Suspense>;
  if (is("settings")) return <Suspense fallback={null}><AccountPage initialTab="settings" /></Suspense>;
  if (is("account")) return <Suspense fallback={null}><AccountPage /></Suspense>;

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
