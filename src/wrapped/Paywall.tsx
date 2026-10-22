// Handoff 19 · brand paywall, phase 1 ("You're early") + the paid kits.
// P·1 snapshot (free) → P·2 unlock → P·3 early access; P·5a locked pages;
// P·6 "why not now?"; 08·k socials kit; 08·m marketing kit (3 tabs).
import React, { useMemo, useState } from "react";
import type { WBook, WKit } from "./api";
import { logoSvg, type Palette } from "./logos";
import { avatarSvg, bannerSvg, postSvg, zipOf, type KitLogo } from "./kitArt";

export interface PayCtx {
  name: string;
  domain: string;
  pal: Palette;
  logoLight: string;            // the picked logo, light variant (svg)
  kitLogo: KitLogo;
  voice: string[];              // three adjectives
  headFont: string;             // the logo's typeface, as a label
  price: number;
  onBuyDomain: () => void;
  track: (ev: string, payload?: Record<string, unknown>) => void;
}

const SWATCH_NAMES: (keyof Palette)[] = ["dawn", "haze", "nova", "night"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ── P·1 · Brand snapshot: the free payoff ── */
export function Snapshot({ c, unlocked, onNext }: { c: PayCtx; unlocked: boolean; onNext: () => void }) {
  const v = (c.voice.length ? c.voice.slice(0, 3) : ["warm", "clear", "confident"]).map((w) => w.toLowerCase());
  return (
    <>
      <div className="wr-stage wr-pw">
        <p className="wr-kicker">Your free preview</p>
        <h1 className="wr-h ttl">Here's {c.name}'s first look.</h1>
        <div className="logotile" dangerouslySetInnerHTML={{ __html: c.logoLight }} />
        <div className="sw">
          {SWATCH_NAMES.map((k) => (
            <div key={k} className="s">
              <i style={{ background: c.pal[k] }} />
              <b>{cap(k)}</b>
              <span className="mono">{c.pal[k].toUpperCase()}</span>
            </div>
          ))}
        </div>
        <div className="types">
          <div className="t"><span className="aa">Aa</span><b>{c.headFont}</b><span>Headlines</span></div>
          <div className="t"><span className="aa mono">Aa</span><b>JetBrains Mono</b><span>Details &amp; numbers</span></div>
        </div>
        <div className="voice">
          <span className="k mono">Voice</span>
          <p>{c.name} sounds <i className="wr-cgrad">{v.slice(0, -1).join(", ")}{v.length > 1 ? ", " : ""}{v[v.length - 1]}</i>.</p>
        </div>
      </div>
      <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
        <button className="wr-btnor cbig" onClick={onNext}>{unlocked ? "Open my brand kit →" : "Get the full brand →"}</button>
        <button className="wr-link" onClick={c.onBuyDomain}>Buy {c.domain} ↗</button>
      </div>
    </>
  );
}

/* ── P·2 · Unlock: the paywall ── */
export function Unlock({ c, onUnlock, onKeep }: { c: PayCtx; onUnlock: () => void; onKeep: () => void }) {
  const p = c.pal;
  const previews: { label: string; art: React.ReactElement }[] = [
    { label: "Brand book · 12 pages", art: (
      <div className="pv book" style={{ background: `linear-gradient(135deg, ${p.dawn}, ${p.haze} 55%, ${p.nova})` }}>
        <span className="pg"><i /><i /><i className="s" /></span>
        <span className="pg w"><i /><i /><i /><i className="s" /></span>
      </div>) },
    { label: "Logo pack · SVG + PNG", art: (
      <div className="pv pack">
        <span className="lt" dangerouslySetInnerHTML={{ __html: c.logoLight }} />
        <span className="lt" style={{ background: p.night }} dangerouslySetInnerHTML={{ __html: logoSvg(c.kitLogo.key, c.name, p, { ...c.kitLogo.opts, variant: "night", height: 60 }) }} />
        <span className="lt" style={{ background: p.dawn }} dangerouslySetInnerHTML={{ __html: logoSvg("appicon", c.name, p, { ...c.kitLogo.opts, custom: undefined, variant: "icon", height: 60 }) }} />
        <span className="lt" style={{ background: p.haze }} />
        <span className="lt" style={{ background: p.nova }} />
        <span className="lt" style={{ background: "#F7F5F1" }} />
      </div>) },
    { label: "Socials kit", art: (
      <div className="pv soc" style={{ background: `linear-gradient(135deg, ${p.dawn}, ${p.haze})` }}>
        <span className="av" dangerouslySetInnerHTML={{ __html: avatarSvg(c.kitLogo) }} />
        <span className="hn mono">@{c.name.toLowerCase().replace(/[^a-z0-9]/g, "")}</span>
      </div>) },
    { label: "Marketing kit", art: (
      <div className="pv mkt" style={{ background: p.night }}>
        <span className="k mono">Launch post</span>
        <b>Meet {c.name}.<br />A new beginning.</b>
      </div>) },
  ];
  return (
    <>
      <div className="wr-stage wr-pw">
        <p className="wr-kicker">The full brand</p>
        <h1 className="wr-h ttl">Everything {c.name} needs to launch.</h1>
        <div className="pvgrid">
          {previews.map((x) => (
            <div key={x.label} className="pvc">
              <div className="pvw">{x.art}<span className="fog" /><span className="lock">🔒 Locked</span></div>
              <b>{x.label}</b>
            </div>
          ))}
        </div>
        <div className="price">
          <span className="n mono">€{c.price}</span>
          <span className="t"><b>One-time, yours forever</b><span>Pay once · instant access</span></span>
        </div>
      </div>
      <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
        <button className="wr-btnor cbig" onClick={onUnlock}>Unlock {c.name}'s brand · €{c.price}</button>
        <button className="wr-link" onClick={onKeep}>Keep my free preview</button>
      </div>
    </>
  );
}

/* ── P·3 · You're early (phase 1: no payment) ── */
export function Early({ c, onOpen }: { c: PayCtx; onOpen: () => void }) {
  return (
    <>
      <div className="wr-stage center wr-pw early" style={{ textAlign: "center", alignItems: "center" }}>
        <span className="chip mono">★ Early access</span>
        <h1 className="wr-h big">You're early.</h1>
        <p className="wr-lead" style={{ maxWidth: 320, margin: "0 auto" }}>Payments open soon, so your full brand kit is free today.</p>
        <p className="fine mono">You won't be charged · {c.name}'s kit stays in your account</p>
      </div>
      <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
        <button className="wr-btnor cbig" onClick={onOpen}>Open my brand kit →</button>
      </div>
    </>
  );
}

/* ── P·5a · Locked page (brand book, personalise, socials kit, marketing kit) ── */
export type LockKind = "book" | "pers" | "pack" | "socials" | "mkt";
export function Locked({ c, kind, book, onUnlock, onBack }: {
  c: PayCtx; kind: LockKind; book: WBook | null; onUnlock: () => void; onBack: () => void;
}) {
  const v = book?.voice;
  const sec = kind === "book"
    ? {
        kicker: "02 · Voice",
        head: v?.words?.length ? v.words.slice(0, 3).map((w) => cap(w) + ".").join(" ") : "Warm. Clear. Quietly confident.",
        para: v?.yes || `${c.name} talks like a friend who has been there. Short sentences, plain words, one idea at a time.`,
        rows: (v?.lines || []).slice(0, 3).map((l) => `${cap(l.word)}: ${l.note}`),
        chip: "Part of the full brand book",
        more: "11 more pages · story, messaging, colours & type in use",
      }
    : kind === "pack"
      ? { kicker: "Logo pack", head: `${c.name} in every version.`, para: "Primary, reversed, one-colour and on the gradient, plus the app icon and favicon, as SVG and PNG.", rows: ["Primary · on light", "Reversed · on night", "App icon + favicon · 32 & 16 px"], chip: "Part of the full brand", more: "Logo pack · SVG + PNG, every version, app icon" }
    : kind === "pers"
      ? { kicker: "Personalise", head: `Make ${c.name}'s logo yours.`, para: "Change the symbol, the colour, the typeface and the layout, then download every version.", rows: ["Symbol · 8 shapes", "Colour · any hex", "Typeface · 1,500 fonts"], chip: "Part of the full brand", more: "Logo pack · SVG + PNG, every version, app icon" }
      : kind === "socials"
        ? { kicker: "Socials kit", head: `${c.name}, ready for every feed.`, para: "Your profile picture, banners and bios, sized for each network.", rows: ["Profile picture · 1080 × 1080", "LinkedIn + X banners", "Short and long bios"], chip: "Part of the socials kit", more: "Instagram, TikTok, X and LinkedIn" }
        : { kicker: "Marketing kit", head: `Launch ${c.name}.`, para: "Launch posts, ad copy and a first campaign, in your colours and voice.", rows: ["3 launch posts + stories", "Google + Meta ad copy", "A 3-week campaign plan"], chip: "Part of the marketing kit", more: "Ready to post, ready to paste" };
  return (
    <>
      <div className="wr-stage wr-pw">
        <div className="lockpage">
          <span className="lock">🔒 Locked</span>
          <p className="k mono">{sec.kicker}</p>
          <h2>{sec.head}</h2>
          <p className="para">{sec.para}</p>
          {sec.rows.map((r) => <p key={r} className="row">{r}</p>)}
          <span className="fade" />
          <div className="foot">
            <span className="pchip">🔒 {sec.chip}</span>
            <span className="more">{sec.more}</span>
          </div>
        </div>
      </div>
      <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
        <button className="wr-btnor cbig" onClick={onUnlock}>Unlock · €{c.price}</button>
        <button className="wr-link" onClick={onBack}>Back to my preview</button>
      </div>
    </>
  );
}

/* ── P·6 · Why not now? ── */
const WHY = ["Too expensive", "Just exploring", "I only needed the name", "I'll come back", "Other"];
export function WhyNot({ onPick, onSkip }: { onPick: (reason: string) => void; onSkip: () => void }) {
  return (
    <div className="wr-whynot" onClick={onSkip}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <span className="grab" />
        <h3>Not today? One tap, why?</h3>
        <p>Your name and preview stay saved either way.</p>
        <div className="chips">{WHY.map((w) => <button key={w} onClick={() => onPick(w)}>{w}</button>)}</div>
        <button className="wr-link skip" onClick={onSkip}>Skip</button>
      </div>
    </div>
  );
}

/* ── copy chip ── */
function Copy({ text, block, track }: { text: string; block: string; track: PayCtx["track"] }) {
  const [ok, setOk] = useState(false);
  return (
    <button className="copy" onClick={() => {
      void navigator.clipboard?.writeText(text);
      track("kit_copy", { block });
      setOk(true); setTimeout(() => setOk(false), 1400);
    }}>{ok ? "Copied ✓" : "Copy"}</button>
  );
}

function KitWait({ fail, onRetry, what }: { fail: boolean; onRetry: () => void; what: string }) {
  return fail
    ? <div className="kitwait"><p>We couldn't write {what} just now.</p><button className="wr-btn2" onClick={onRetry}>↻ Try again</button></div>
    : <div className="kitwait"><span className="wr-spin" /> Writing {what}…</div>;
}

/* ── 08·k · Socials kit ── */
export function SocialsKit({ c, kit, kitFail, onRetry, onNext, onBack }: {
  c: PayCtx; kit: WKit | null; kitFail: boolean; onRetry: () => void; onNext: () => void; onBack: () => void;
}) {
  const handle = c.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const av = useMemo(() => avatarSvg(c.kitLogo), [c.kitLogo]);
  const tagline = kit?.bioShort?.replace(/\s*\S+\.\S+\s*$/, "") || "";
  const li = useMemo(() => bannerSvg(c.kitLogo, 1584, 396, tagline), [c.kitLogo, tagline]);
  const xb = useMemo(() => bannerSvg(c.kitLogo, 1500, 500, tagline), [c.kitLogo, tagline]);
  const posts = useMemo(() => (kit?.posts || []).map((p, i) => postSvg(c.kitLogo, i, p.title)), [c.kitLogo, kit]);
  const dl = (asset: string, files: Parameters<typeof zipOf>[0], name: string) => { c.track("kit_asset_downloaded", { asset }); void zipOf(files, name); };
  const all = () => dl("socials_all", [
    { name: `${handle}-profile-1080.png`, svg: av, h: 1080 },
    { name: `${handle}-linkedin-banner-1584x396.png`, svg: li, h: 396 },
    { name: `${handle}-x-banner-1500x500.png`, svg: xb, h: 500 },
    { name: "bios.txt", text: kit ? `SHORT (Instagram · TikTok · X)\n${kit.bioShort}\n\nLONG (LinkedIn)\n${kit.bioLong}\n` : "" },
  ], `${handle}-socials-kit.zip`);
  return (
    <>
      <div className="wr-stage wr-pw kit">
        <p className="wr-kicker">Socials kit</p>
        <h1 className="wr-h ttl">{c.name}, ready for every feed.</h1>
        <p className="wr-lead sub">Your profile picture, banners and bios, sized for each network.</p>

        <p className="lbl mono">Profile picture</p>
        <div className="card avs">
          <span className="a l" dangerouslySetInnerHTML={{ __html: av }} />
          <span className="a m" dangerouslySetInnerHTML={{ __html: av }} />
          <span className="a s" dangerouslySetInnerHTML={{ __html: av }} />
          <button className="dl" onClick={() => dl("profile_png", [{ name: `${handle}-profile-1080.png`, svg: av, h: 1080 }], `${handle}-profile.zip`)}>↓ PNG</button>
          <span className="fine mono">1080 × 1080 · works for all four networks</span>
        </div>

        {!kit ? <KitWait fail={kitFail} onRetry={onRetry} what="the socials kit" /> : (
          <>
            <p className="lbl mono">Instagram preview</p>
            <div className="ig">
              <div className="hd">
                <span className="a" dangerouslySetInnerHTML={{ __html: av }} />
                <span><b>{handle}</b><span className="bio">{kit.bioShort}</span><span className="url">{c.domain}</span></span>
              </div>
              <div className="grid3">{posts.map((p, i) => <span key={i} dangerouslySetInnerHTML={{ __html: p }} />)}</div>
            </div>

            <p className="lbl mono">Banners</p>
            <div className="card ban">
              <span className="b" dangerouslySetInnerHTML={{ __html: li }} />
              <span className="row"><span className="mono">LinkedIn · 1584 × 396</span><button className="dl" onClick={() => dl("banner_linkedin", [{ name: `${handle}-linkedin-banner-1584x396.png`, svg: li, h: 396 }], `${handle}-linkedin-banner.zip`)}>↓ PNG</button></span>
              <span className="b" dangerouslySetInnerHTML={{ __html: xb }} />
              <span className="row"><span className="mono">X · 1500 × 500</span><button className="dl" onClick={() => dl("banner_x", [{ name: `${handle}-x-banner-1500x500.png`, svg: xb, h: 500 }], `${handle}-x-banner.zip`)}>↓ PNG</button></span>
            </div>

            <p className="lbl mono">Bios</p>
            <div className="card txt"><span className="k mono">Short · Instagram / TikTok / X</span><Copy text={kit.bioShort} block="bio_short" track={c.track} /><p>{kit.bioShort}</p></div>
            <div className="card txt"><span className="k mono">Long · LinkedIn</span><Copy text={kit.bioLong} block="bio_long" track={c.track} /><p>{kit.bioLong}</p></div>
          </>
        )}
      </div>
      <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
        <button className="wr-btn" onClick={onNext}>Next: marketing kit →</button>
        <span className="urow">
          <button className="wr-link" onClick={onBack}>← Socials</button>
          {kit && <button className="wr-link" onClick={all}>↓ Download all</button>}
        </span>
      </div>
    </>
  );
}

/* ── 08·m · Marketing kit (Launch posts · Ad copy · First campaign) ── */
export function MarketingKit({ c, kit, kitFail, onRetry, onFinish, onBack }: {
  c: PayCtx; kit: WKit | null; kitFail: boolean; onRetry: () => void; onFinish: () => void; onBack: () => void;
}) {
  const [tab, setTab] = useState<0 | 1 | 2>(0);
  const handle = c.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const posts = useMemo(() => (kit?.posts || []).map((p, i) => postSvg(c.kitLogo, i, p.title)), [c.kitLogo, kit]);
  const stories = useMemo(() => (kit?.posts || []).map((p, i) => postSvg(c.kitLogo, i, p.title, 1080, 1920)), [c.kitLogo, kit]);
  const dl = (asset: string, files: Parameters<typeof zipOf>[0], name: string) => { c.track("kit_asset_downloaded", { asset }); void zipOf(files, name); };
  const adsText = kit ? `GOOGLE ADS · SEARCH\nHeadlines:\n${kit.googleHeadlines.join("\n")}\n\nDescription:\n${kit.googleDescription}\n\nMETA · INSTAGRAM & FACEBOOK\nPrimary text:\n${kit.metaPrimary}\n\nHeadline:\n${kit.metaHeadline}\n` : "";
  const planText = kit ? kit.weeks.map((w) => `${w.title}\n${w.line}\nChannels: ${w.channels.join(", ")}\n`).join("\n") : "";
  const primary =
    tab === 0 ? <button className="wr-btn" onClick={() => setTab(1)}>Next: ad copy →</button>
    : tab === 1 ? <button className="wr-btn" onClick={() => setTab(2)}>Next: first campaign →</button>
    : <button className="wr-btn" onClick={onFinish}>Finish →</button>;
  const links =
    tab === 0 ? <><button className="wr-link" onClick={onBack}>← Socials kit</button>{kit && <button className="wr-link" onClick={() => dl("posts_all", posts.map((svg, i) => ({ name: `${handle}-post-${i + 1}.png`, svg, h: 1080 })), `${handle}-launch-posts.zip`)}>↓ Download all</button>}</>
    : tab === 1 ? <><button className="wr-link" onClick={() => setTab(0)}>← Launch posts</button>{kit && <button className="wr-link" onClick={() => { void navigator.clipboard?.writeText(adsText); c.track("kit_copy", { block: "ads_all" }); }}>Copy all</button>}</>
    : <><button className="wr-link" onClick={() => setTab(1)}>← Ad copy</button>{kit && <button className="wr-link" onClick={() => dl("plan", [{ name: `${handle}-first-campaign.txt`, text: planText }], `${handle}-first-campaign.zip`)}>↓ Download the plan</button>}</>;
  return (
    <>
      <div className="wr-stage wr-pw kit">
        <p className="wr-kicker">Marketing kit</p>
        <h1 className="wr-h ttl">Launch {c.name}.</h1>
        <p className="wr-lead sub">Posts, ad copy and a first campaign, all in {c.name}'s colours and voice.</p>
        <div className="seg">
          {["Launch posts", "Ad copy", "First campaign"].map((t, i) => (
            <button key={t} className={tab === i ? "on" : ""} onClick={() => setTab(i as 0 | 1 | 2)}>{t}</button>
          ))}
        </div>
        {!kit ? <KitWait fail={kitFail} onRetry={onRetry} what="the marketing kit" /> : tab === 0 ? (
          <>
            <p className="lbl mono">3 launch posts · 1080 × 1080</p>
            <div className="posts">
              {posts.map((p, i) => (
                <div key={i} className="post">
                  <span className={"k mono" + (i > 0 ? " dk" : "")}>{kit.posts[i]?.label}</span>
                  <span className="img" dangerouslySetInnerHTML={{ __html: p }} />
                </div>
              ))}
            </div>
            <p className="lbl mono">Caption · launch post</p>
            <div className="card txt"><span className="k mono">{kit.posts[1]?.label || "Day 3"}</span><Copy text={kit.posts[1]?.caption || ""} block="caption_launch" track={c.track} /><p>{kit.posts[1]?.caption}</p></div>
            <div className="dlrow">
              <button className="dl" onClick={() => dl("posts_all", posts.map((svg, i) => ({ name: `${handle}-post-${i + 1}.png`, svg, h: 1080 })), `${handle}-launch-posts.zip`)}>↓ All posts</button>
              <button className="dl" onClick={() => dl("stories", stories.map((svg, i) => ({ name: `${handle}-story-${i + 1}-1080x1920.png`, svg, h: 1920 })), `${handle}-stories.zip`)}>↓ Stories 1080 × 1920</button>
            </div>
          </>
        ) : tab === 1 ? (
          <>
            <p className="lbl mono">Google Ads · search</p>
            <div className="card txt"><span className="k mono">Headlines · max 30</span><Copy text={kit.googleHeadlines.join("\n")} block="google_headlines" track={c.track} /><p className="mono pre">{kit.googleHeadlines.join("\n")}</p></div>
            <div className="card txt"><span className="k mono">Description · max 90</span><Copy text={kit.googleDescription} block="google_description" track={c.track} /><p>{kit.googleDescription}</p></div>
            <p className="lbl mono">Meta · Instagram &amp; Facebook</p>
            <div className="card txt"><span className="k mono">Primary text</span><Copy text={kit.metaPrimary} block="meta_primary" track={c.track} /><p>{kit.metaPrimary}</p></div>
            <div className="card txt"><span className="k mono">Headline</span><Copy text={kit.metaHeadline} block="meta_headline" track={c.track} /><p>{kit.metaHeadline}</p></div>
          </>
        ) : (
          <>
            <p className="lbl mono">Your first three weeks</p>
            <div className="weeks">
              {kit.weeks.map((w, i) => (
                <div key={w.title} className="wk">
                  <span className="n">{i + 1}</span>
                  <div><b>{w.title}</b><p>{w.line}</p><span className="chs">{w.channels.map((ch) => <i key={ch}>{ch}</i>)}</span></div>
                </div>
              ))}
            </div>
            <div className="card note"><b>Every asset is in the kit.</b> Posts, captions and ads above are matched to each week.</div>
          </>
        )}
      </div>
      <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
        {primary}
        <span className="urow">{links}</span>
      </div>
    </>
  );
}
