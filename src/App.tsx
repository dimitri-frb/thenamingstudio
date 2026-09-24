// Router for the Naming Studio "Wrapped" app:
//   /            the flow (landing → name → own it)     [?test = sample data + jump bar]
//   /account     every name you've started (Google account)
//   /admin       the funnel + every search (central log)
// GitHub Pages serves 404.html → index.html, so deep paths work.
import { WrappedApp } from "./wrapped/WrappedApp";
import { AccountPage } from "./wrapped/AccountPage";
import { AdminPage } from "./wrapped/AdminPage";

export default function App() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.replace(/^#\/?/, "");
  const is = (name: string) =>
    new RegExp(`(?:^|/)${name}/?$`).test(path) || params.has(name) || hash === name;

  if (is("admin")) return <AdminPage />;
  if (is("account")) return <AccountPage />;

  return (
    <WrappedApp
      test={params.has("test") || hash === "test"}
      resume={params.get("resume") || undefined}
    />
  );
}
