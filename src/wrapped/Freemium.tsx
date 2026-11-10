// Handoff 29 · the freemium brand flow. Everything is open; each page carries
// ONE "PRO" card for the next level, and "See →" opens the Pro sheet (a bottom
// sheet on phones, a centred dialog on desktop). €29 once, yours forever.
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X_FONTS } from "./logos";
import { CUSTOM_PAL, PAL_OPEN, PAL_PRO, TYPE_OPEN, TYPE_PRO, palFromHex, type FmPalette } from "./freemium";

const sv = (svg: string) => <span className="sv" dangerouslySetInnerHTML={{ __html: svg }} />;
export const ProTag = () => <span className="fm-tag mono">PRO</span>;

/** One per page: the next level, a one-line pitch, a small visual, "See →". */
export function ProCard({ title, sub, onSee, children, cta = "See →" }: { title: string; sub: string; onSee: () => void; children?: ReactNode; cta?: string }) {
  return (
    <div className="fm-pro" role="button" tabIndex={0} onClick={onSee} onKeyDown={(e) => { if (e.key === "Enter") onSee(); }}>
      <div className="h"><ProTag /><b>{title}</b><span className="see">{cta}</span></div>
      <p className="s">{sub}</p>
      {children}
    </div>
  );
}

/** G·4 · the Pro sheet (mobile) / dialog (desktop). */
export function ProSheet({ name, price, step, title, lead, cta, onGet, onClose, track, early }: {
  name: string; price: number; step: string; title?: string; lead?: string; cta?: string;
  onGet: () => void; onClose: () => void; track: (ev: string, p?: Record<string, unknown>) => void; early?: boolean;
}) {
  useEffect(() => { track("pro_sheet_seen", { step, price }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return createPortal(
    <div className="fm-sheet" onClick={onClose}>
      <div className="in" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`${name} Pro`}>
        <span className="grab" />
        <p className="tg"><ProTag /><span className="mono">{name.toUpperCase()} PRO</span></p>
        <h3>{title || `More of everything, for ${name}.`}</h3>
        {lead && <p className="lead">{lead}</p>}
        <ul>
          <li>Personalise your logo: symbol, colour, type, layout</li>
          <li>Every palette, your own colour, all typefaces</li>
          <li>Every file, editable ones included: brand book, deck, cards, posts</li>
          <li>Ad copy, story formats and print-ready cards</li>
        </ul>
        <p className="price"><b className="mono">€{price}</b><span>once · yours forever</span></p>
        <button className="wr-btnor fm-get" onClick={() => { track("pro_purchase_clicked", { step, price }); onGet(); }}>{cta || `Get ${name} Pro · €${price}`}</button>
        {early && <p className="early">Payments open soon: Pro is free while we're in early access.</p>}
        <button className="wr-link" onClick={onClose}>{step.startsWith("dl:") ? "Keep previewing" : "Not now"}</button>
      </div>
    </div>, document.body);
}

/** A short confirmation once Pro is on. */
export function ProToast({ onDone }: { onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2600); return () => clearTimeout(t); }, [onDone]);
  return createPortal(<div className="fm-toast"><span className="ok">✓</span> Pro unlocked</div>, document.body);
}

/* ── G·1 · Colours ── */
export function ColoursStep({ name, cur, pro, brief, preview, onPick, onPro, onNext, onBack }: {
  name: string; cur: { k: string; pal: string[] }; pro: boolean; brief: FmPalette | null; preview: ReactNode;
  onPick: (k: string, pal: string[]) => void; onPro: () => void; onNext: () => void; onBack: () => void;
}) {
  const open = brief ? [brief, ...PAL_OPEN.slice(0, 3)] : PAL_OPEN;
  const row = (o: FmPalette, small = false) => (
    <button key={o.k} className={"fm-pal" + (cur.k === o.k ? " on" : "") + (small ? " sm" : "")} onClick={() => onPick(o.k, o.pal)}>
      <span className="sw">{o.pal.map((c, i) => <i key={i} style={{ background: c }} />)}</span>
      <span className="tx"><b>{o.k}</b>{!small && <em>{o.d}</em>}</span>
      {cur.k === o.k && <span className="ck">✓</span>}
    </button>
  );
  const customHex = cur.k === CUSTOM_PAL ? cur.pal[0] : "#ff9e7a";
  return (
    <>
      <div className="wr-stage fm-step">
        <div className="fl">
          <p className="wr-kicker">2 of 5 · Colours</p>
          <h1 className="wr-h ttl">Pick {name}'s colours.</h1>
          <div className="fm-pals">{open.map((o) => row(o))}</div>
        </div>
        <div className="fr">
          <div className="fm-live">{preview}</div>
          {pro ? (
            <div className="fm-pro on">
              <div className="h"><ProTag /><b>Every palette + your own colour</b></div>
              <div className="fm-pals sm">{PAL_PRO.map((o) => row(o, true))}</div>
              <label className="fm-custom">
                <input type="color" value={customHex} onChange={(e) => onPick(CUSTOM_PAL, palFromHex(e.target.value))} />
                <span><b>{CUSTOM_PAL}</b><em className="mono">{cur.k === CUSTOM_PAL ? customHex.toUpperCase() : "Pick any colour"}</em></span>
              </label>
            </div>
          ) : (
            <ProCard title="9 more palettes + custom" sub={`Fine-tune every shade of ${name}.`} onSee={onPro}>
              <span className="fm-strip">{PAL_PRO.slice(0, 5).map((o) => <span key={o.k}>{o.pal.map((c, i) => <i key={i} style={{ background: c }} />)}</span>)}</span>
            </ProCard>
          )}
        </div>
      </div>
      <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
        <button className="wr-btn" style={{ maxWidth: 340 }} onClick={onNext}>Next: typeface →</button>
        <button className="wr-link" onClick={onBack}>← Back</button>
      </div>
    </>
  );
}

/* ── G·2 · Typeface ── */
export function TypeStep({ name, cur, pro, onPick, onPro, onNext, onBack, pairOf }: {
  name: string; cur: number; pro: boolean; onPick: (fi: number) => void; onPro: () => void; onNext: () => void; onBack: () => void; pairOf: (fi: number) => string;
}) {
  const face = (fi: number) => { const f = X_FONTS[fi]; return { fontFamily: `'${f.f}', ${f.serif ? "serif" : "sans-serif"}`, fontWeight: f.w, textTransform: f.caps ? "uppercase" as const : undefined, letterSpacing: f.sp ? `${f.sp}em` : undefined }; };
  return (
    <>
      <div className="wr-stage fm-step">
        <div className="fl">
          <p className="wr-kicker">3 of 5 · Typeface</p>
          <h1 className="wr-h ttl">How should {name} read?</h1>
          <div className="fm-types">
            {TYPE_OPEN.map((t) => (
              <button key={t.fi} className={"fm-type" + (cur === t.fi ? " on" : "")} onClick={() => onPick(t.fi)}>
                <span className="nm" style={face(t.fi)}>{name}</span>
                <span className="tx"><b>{X_FONTS[t.fi].f}</b><em>{t.d}</em></span>
                {cur === t.fi && <span className="ck">✓</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="fr">
          {pro ? (
            <div className="fm-pro on">
              <div className="h"><ProTag /><b>Every typeface + pairings</b></div>
              <div className="fm-tlist">
                {TYPE_PRO.map((t) => (
                  <button key={t.fi} className={cur === t.fi ? "on" : ""} onClick={() => onPick(t.fi)}>
                    <span style={face(t.fi)}>{name}</span><em>{X_FONTS[t.fi].f} · with {pairOf(t.fi)}</em>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ProCard title="12 more typefaces + pairings" sub={`Headline and body pairs, set for ${name}.`} onSee={onPro}>
              <span className="fm-tprev">{[0, 3, 13].map((fi) => <span key={fi} style={face(fi)}>{name}</span>)}</span>
            </ProCard>
          )}
        </div>
      </div>
      <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
        <button className="wr-btn" style={{ maxWidth: 340 }} onClick={onNext}>Next: logos →</button>
        <button className="wr-link" onClick={onBack}>← Colours</button>
      </div>
    </>
  );
}

/* ── G·0 · What we'll make ── */
export function IntroStep({ name, art, onBuild, onLater }: {
  name: string; art: { card: string; post: string; slide: string; logo: string }; onBuild: () => void; onLater: () => void;
}) {
  const items = ["Logo", "Colours", "Typeface", "Brand book", "Socials kit", "Launch posts", "Business cards", "Pitch deck"];
  return (
    <>
      <div className="wr-stage fm-intro">
        <div className="il">
          <p className="wr-kicker">It's yours</p>
          <h1 className="nm">{name}</h1>
          <p className="wr-lead">Next, its brand. Here's what we'll make for {name}:</p>
          <div className="get">
            <p className="k mono">You get · about 4 minutes</p>
            <ul>{items.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
        </div>
        <div className="collage" aria-hidden>
          <span className="pc card">{sv(art.card)}<em>Business cards</em></span>
          <span className="pc post">{sv(art.post)}<em>Launch posts</em></span>
          <span className="pc slide">{sv(art.slide)}<em>Pitch deck</em></span>
          <span className="pc logo">{sv(art.logo)}<em>Your logo</em></span>
        </div>
      </div>
      <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
        <button className="wr-btnor cbig" onClick={onBuild}>Build my brand →</button>
        <button className="wr-link" onClick={onLater}>Later</button>
      </div>
    </>
  );
}
