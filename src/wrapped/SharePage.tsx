// The public page behind a shared link (design 09·i): what invitees see when
// a founder shares their claimed name. Read-only, no account needed.
import { useEffect, useState } from "react";
import { shareGet, type ShareData } from "./api";
import { logoSvg, toPalette, type CustomLogo } from "./logos";

export function SharePage({ id }: { id: string }) {
  const [share, setShare] = useState<ShareData | null | undefined>(undefined);
  useEffect(() => { shareGet(id).then((s) => setShare(s)); }, [id]);

  const BASE = () => (import.meta as any).env.BASE_URL || "/";
  const start = () => { window.location.href = BASE(); };

  if (share === undefined) {
    return <div className="wr"><div className="wr-stage center"><div className="wr-load"><span className="wr-spin" /> Opening…</div></div></div>;
  }
  if (!share) {
    return (
      <div className="wr">
        <div className="wr-stage center" style={{ textAlign: "center", alignItems: "center" }}>
          <h1 className="wr-h" style={{ marginBottom: 10 }}>This link has expired.</h1>
          <p className="wr-lead" style={{ marginBottom: 24 }}>But the studio is open.</p>
          <button className="wr-btn" style={{ maxWidth: 240 }} onClick={start}>Start naming →</button>
        </div>
      </div>
    );
  }

  const pal = toPalette(share.palette);
  const logo = share.logo;
  return (
    <div className="wr wr-share">
      <div className="wr-top">
        <span className="wr-brand"><span className="bt">NAME NAMES</span></span>
        <span className="lockurl">🔒 {window.location.host}{window.location.pathname}</span>
        <span />
      </div>
      <div className="wr-stage center">
        <div className="wr-lwrap cols">
          <div className="l">
            <p className="wr-kicker" style={{ marginBottom: 14 }}>
              {share.owner ? `${share.owner} has a new name to share` : "A new name to share"}
            </p>
            <h1 className="wr-bigname" style={{ textAlign: "left", fontSize: 72, lineHeight: 1.02, margin: "0 0 18px" }}>
              Meet {share.name}.
            </h1>
            {(share.meaning || share.tagline) && (
              <p className="wr-lead" style={{ maxWidth: 440, marginBottom: 22 }}>{share.meaning || share.tagline}</p>
            )}
            <div className="pills">
              {share.plain && <span className="p mono">/{share.plain.replace(/\s+/g, "·")}/</span>}
              {share.domain && <span className="p mono"><i className="dot" />{share.domain}</span>}
              {!!share.chips?.length && <span className="p">{share.chips.slice(0, 2).join(" · ")}</span>}
            </div>
          </div>
          <div className="r">
            <div className="card" dangerouslySetInnerHTML={{
              __html: logoSvg(logo?.key || "sunrise", share.name, pal, {
                variant: logo?.key === "appicon" ? "icon" : "light",
                accent: (logo?.accent as any) || "dawn",
                seed: logo?.seed || 0,
                font: logo?.font as any,
                shape: logo?.shape as any,
                custom: logo?.custom as CustomLogo | undefined,
                height: 120,
              }),
            }} />
            <div className="sw">
              {(share.palette || []).slice(0, 4).map((c) => <i key={c.name} style={{ background: c.hex }} title={c.name} />)}
            </div>
          </div>
        </div>
      </div>
      <div className="wr-foot">
        <div className="wr-sharebar">
          <b>Naming something too?</b>
          <span>Name, domain &amp; brand in minutes.</span>
          <button onClick={start}>Start naming →</button>
        </div>
      </div>
    </div>
  );
}
