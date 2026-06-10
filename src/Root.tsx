// Top-level router. Hash-based so it deep-links on GitHub Pages with no 404.html
// gymnastics (#/studio and #/classic both load on refresh and when shared).
//
//   #/            -> the chooser (Home)
//   #/classic     -> v1, the original 9-step funnel (App, untouched)
//   #/studio      -> v2, the new 7-phase studio flow
//
// Shared external links (?vote=…, ?brandbook=…) are intercepted first and routed
// to v1's App, which already renders the swipe-vote / brand-book demo for them,
// so those keep working from the bare domain regardless of hash.

import { useEffect, useState } from "react";
import App from "./App";
import { Home } from "./Home";
import { StudioApp } from "./v2/StudioApp";
import { markVariant } from "./lib/variant";

type Route = "home" | "classic" | "studio";

function readRoute(): Route {
  const h = window.location.hash.replace(/^#\/?/, "").toLowerCase();
  if (h.startsWith("studio")) return "studio";
  if (h.startsWith("classic")) return "classic";
  return "home";
}

export default function Root() {
  const [route, setRoute] = useState<Route>(readRoute);

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Shared-link landings (friend vote / brand-book demo) are handled by v1's App.
  const params = new URLSearchParams(window.location.search);
  if (params.has("vote") || params.has("brandbook")) return <App />;

  if (route === "studio") {
    return <StudioApp onExit={() => { window.location.hash = "#/"; }} />;
  }

  if (route === "classic") {
    markVariant("v1");
    return <App />;
  }

  return <Home onPick={(p) => { window.location.hash = `#/${p}`; }} />;
}
