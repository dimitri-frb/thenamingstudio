// Brand Book — rebuilt to the "document viewer" design: dark backdrop, macOS
// window chrome, left sidebar nav, warm parchment paper document.
// Self-contained with inline styles; no Tailwind classes except no-print/bb-printonly.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { naming, type Brief, type BrandBook as BrandBookData } from "../lib/namingApi";
import "../cosmos/cosmos.css"; // no-print / bb-printonly print classes live here

const SERIF = "ui-serif,'New York',Georgia,serif";
const SANS  = "-apple-system,'SF Pro Text',system-ui,sans-serif";
const MONO  = "ui-monospace,'SF Mono',monospace";

// Warm paper palette — isolated from the app's design tokens.
const INK   = "#211c18";
const PAPER = "#f6f2ec";
const MUTED = "#6f665b";
const GOLD  = "#b8944e";
const ASH   = "#e8ded0";
const HAIR  = "rgba(33,28,24,.13)";

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600" +
  "&family=Space+Grotesk:wght@500;700&family=Playfair+Display:wght@500;700" +
  "&family=Source+Sans+3:wght@400;600&family=Poppins:wght@500;600" +
  "&family=Inter:wght@400;500;600&display=swap";

const PAIRINGS: Record<string, { label: string; heading: string; body: string; hName: string; bName: string }> = {
  editorial: { label: "Editorial", heading: "'Fraunces',Georgia,serif",           body: "'Inter',system-ui,sans-serif",       hName: "Fraunces",        bName: "Inter" },
  modern:    { label: "Modern",    heading: "'Space Grotesk',system-ui,sans-serif", body: "'Inter',system-ui,sans-serif",      hName: "Space Grotesk",   bName: "Inter" },
  classic:   { label: "Classic",   heading: "'Playfair Display',Georgia,serif",    body: "'Source Sans 3',system-ui,sans-serif", hName: "Playfair Display", bName: "Source Sans 3" },
  friendly:  { label: "Friendly",  heading: "'Poppins',system-ui,sans-serif",      body: "'Inter',system-ui,sans-serif",       hName: "Poppins",         bName: "Inter" },
  warm:      { label: "Warm",      heading: "'Instrument Serif',Georgia,serif",    body: "'Geist',system-ui,sans-serif",       hName: "Instrument Serif", bName: "Geist" },
};

const NAV_LINKS = [
  { href: "#bb-top",    label: "Overview" },
  { href: "#bb-story",  label: "The story" },
  { href: "#bb-voice",  label: "Personality & voice" },
  { href: "#bb-colour", label: "Colour" },
  { href: "#bb-type",   label: "Typography" },
  { href: "#bb-msg",    label: "Messaging" },
];

export function BrandBook({ brief, name, onClose }: { brief: Brief; name: string; onClose: () => void }) {
  const [bb, setBb] = useState<BrandBookData | null>(null);
  const [error, setError] = useState(false);
  const [mobile, setMobile] = useState(() => window.innerWidth <= 640);

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth <= 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!document.getElementById("bb-fonts")) {
      const l = document.createElement("link");
      l.id = "bb-fonts"; l.rel = "stylesheet"; l.href = FONT_HREF;
      document.head.appendChild(l);
    }
    if (!document.getElementById("bb-spin-kf")) {
      const s = document.createElement("style");
      s.id = "bb-spin-kf";
      s.textContent = "@keyframes bb-spin{to{transform:rotate(360deg)}}";
      document.head.appendChild(s);
    }
    let alive = true;
    naming.brandbook(brief, name).then((d) => alive && setBb(d)).catch(() => alive && setError(true));
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 60, overflowY: "auto", background: "#111", fontFamily: SANS, WebkitFontSmoothing: "antialiased" } as React.CSSProperties}>

      {/* ── Top bar ── */}
      <div className="no-print" style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 24px", background: "rgba(17,17,17,.92)", backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <button onClick={onClose} style={{ fontSize: 13.5, color: "rgba(255,255,255,.55)", background: "none", border: "none", cursor: "pointer", fontFamily: SANS }}>← Back to your name</button>
        {!mobile && <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".2em", textTransform: "uppercase", color: "rgba(255,255,255,.3)", fontFamily: MONO }}>Brand book · {name}</span>}
        <button onClick={() => window.print()} disabled={!bb}
          style={{ fontSize: 13, fontFamily: SERIF, fontStyle: "italic", color: !bb ? "rgba(255,255,255,.25)" : "#fff", background: !bb ? "rgba(255,255,255,.06)" : GOLD, border: "none", borderRadius: 8, padding: "7px 16px", cursor: !bb ? "default" : "pointer", transition: "background .2s" }}>
          ↓ Save as PDF
        </button>
      </div>

      {/* ── Viewer ── */}
      <main style={{ display: "flex", justifyContent: "center", padding: mobile ? "0" : "32px 20px 60px" }}>
        <div style={{ width: "100%", maxWidth: 1100 }}>

          {/* Window frame */}
          <div style={{ background: "#fff", border: mobile ? "none" : "1px solid rgba(0,0,0,.16)", borderRadius: mobile ? 0 : 16, overflow: "hidden", boxShadow: mobile ? "none" : "0 44px 110px -34px rgba(0,0,0,.7)" }}>

            {/* Title bar — hidden on mobile */}
            {!mobile && (
            <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 14, height: 46, padding: "0 16px", borderBottom: `1px solid ${HAIR}`, background: "rgba(246,242,236,.9)", backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)" }}>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                {(["#ff5f57", "#febc2e", "#28c840"] as const).map((c) => (
                  <span key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c, display: "block" }} />
                ))}
              </div>
              <span style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 500, color: MUTED }}>{name} — brand book.pdf</span>
              <button onClick={() => window.print()} disabled={!bb}
                style={{ fontSize: 12.5, fontWeight: 600, color: !bb ? MUTED : "#fff", background: !bb ? ASH : GOLD, border: "none", borderRadius: 8, padding: "6px 13px", cursor: !bb ? "default" : "pointer" }}>
                Save as PDF
              </button>
            </div>
            )}

            {/* Sidebar + paper */}
            <div style={{ display: "flex", minHeight: 600 }}>

              {/* Sidebar nav — hidden on mobile */}
              <aside className="no-print" style={{ width: 210, flexShrink: 0, background: "#f8f7f5", borderRight: `1px solid ${HAIR}`, padding: "20px 14px", display: mobile ? "none" : "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#8a8a8f", padding: "0 10px 8px", display: "block" }}>On this page</span>
                {NAV_LINKS.map(({ href, label }, i) => (
                  <a key={href} href={href}
                    style={{ display: "flex", alignItems: "center", padding: "8px 10px", borderRadius: 8, fontSize: 13.5, fontWeight: i === 0 ? 600 : 500, color: i === 0 ? GOLD : MUTED, background: i === 0 ? "rgba(184,148,78,.1)" : "transparent", textDecoration: "none" }}>
                    {label}
                  </a>
                ))}
                {bb && (
                  <div style={{ marginTop: "auto", padding: "14px 10px 2px", display: "flex", flexDirection: "column", gap: 6, borderTop: `1px solid ${HAIR}` }}>
                    <span style={{ fontSize: 11.5, color: MUTED }}>Delivered from your brief</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, fontFamily: MONO, color: INK }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#28c840", display: "block" }} />
                      {name.toLowerCase()}.com
                    </span>
                  </div>
                )}
              </aside>

              {/* Paper area */}
              <div style={{ flex: 1, padding: mobile ? 0 : 26, display: "flex", justifyContent: "center", background: mobile ? PAPER : "repeating-linear-gradient(45deg,transparent,transparent 11px,rgba(0,0,0,.025) 11px,rgba(0,0,0,.025) 12px),#efefef" }}>
                {!bb ? (
                  <div style={{ width: "100%", maxWidth: 660, background: PAPER, border: `1px solid ${HAIR}`, borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 480, gap: 16, padding: 40 }}>
                    {error ? (
                      <>
                        <p style={{ fontFamily: SERIF, fontSize: 22, fontStyle: "italic", color: INK, textAlign: "center" }}>We couldn't compose the brand book.</p>
                        <button onClick={onClose} style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 14, background: GOLD, color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", cursor: "pointer" }}>← Back</button>
                      </>
                    ) : (
                      <>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid ${ASH}`, borderTopColor: GOLD, animation: "bb-spin 1s linear infinite" }} />
                        <p style={{ fontFamily: SERIF, fontSize: 22, fontStyle: "italic", color: INK }}>Composing your brand book…</p>
                        <p style={{ fontSize: 13.5, color: MUTED }}>Drawing on everything you told us.</p>
                      </>
                    )}
                  </div>
                ) : (
                  <Paper bb={bb} name={name} mobile={mobile} />
                )}
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>,
    document.body,
  );
}

// ── The paper document ───────────────────────────────────────────────────────

function Paper({ bb, name, mobile }: { bb: BrandBookData; name: string; mobile?: boolean }) {
  const pair = PAIRINGS[bb.fontKey] || PAIRINGS.editorial;
  const hp = mobile ? "20px" : "54px"; // horizontal padding shorthand
  // essence is "word · word · word" — split into chips
  const essence = bb.essence
    ? bb.essence.split(/[·,;]/).map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <div id="bb-top" style={{ width: "100%", maxWidth: 660, background: PAPER, color: INK, border: mobile ? "none" : `1px solid ${HAIR}`, borderRadius: mobile ? 0 : 6, boxShadow: mobile ? "none" : "0 30px 70px -34px rgba(0,0,0,.45)", overflow: "hidden", fontFamily: SANS }}>

      {/* Cover */}
      <div style={{ padding: mobile ? "32px 20px 28px" : "52px 54px 40px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".22em", textTransform: "uppercase", color: GOLD }}>Brand book</span>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: MUTED }}>v1.0 · 2026</span>
        </div>
        <h1 style={{ fontFamily: SERIF, fontSize: mobile ? 44 : 76, lineHeight: .98, fontWeight: 600, letterSpacing: "-.02em", margin: "16px 0 0", color: INK }}>{name}</h1>
        <p style={{ fontFamily: SERIF, fontSize: mobile ? 17 : 21, fontStyle: "italic", color: MUTED, margin: "10px 0 0" }}>{bb.tagline}</p>
        {essence.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
            {essence.map((e) => (
              <span key={e} style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: INK, padding: "5px 12px", border: `1px solid ${HAIR}`, borderRadius: 980 }}>{e}</span>
            ))}
          </div>
        )}
      </div>

      <PHair hp={hp} />

      {/* The story */}
      <PSection id="bb-story" label="The story" hp={hp}>
        <p style={{ fontSize: 16.5, lineHeight: 1.62, margin: "16px 0 0", maxWidth: "52ch" }}>{bb.story}</p>
        <div style={{ marginTop: 22, padding: "18px 22px", borderLeft: `2px solid ${GOLD}`, background: "rgba(184,148,78,.08)", borderRadius: "0 8px 8px 0" }}>
          <p style={{ fontFamily: SERIF, fontSize: 15, fontStyle: "italic", lineHeight: 1.6, color: INK, margin: 0 }}>{bb.whyName}</p>
        </div>
      </PSection>

      {/* Personality & voice */}
      <PSection id="bb-voice" label="Personality & voice" hp={hp}>
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          {bb.voice.adjectives.map((w) => (
            <span key={w} style={{ fontFamily: SERIF, fontSize: 15, padding: "7px 16px", border: `1px solid ${HAIR}`, borderRadius: 980 }}>{w}</span>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 14, marginTop: 20 }}>
          <VoiceCard tone="do"   title="Do"    items={bb.voice.dos} />
          <VoiceCard tone="dont" title="Don't" items={bb.voice.donts} />
        </div>
        <p style={{ fontFamily: SERIF, fontSize: mobile ? 18 : 22, fontStyle: "italic", lineHeight: 1.4, textAlign: "center", margin: "26px 0 0", color: INK }}>"{bb.voice.sample}"</p>
      </PSection>

      {/* Colour */}
      <PSection id="bb-colour" label="Colour" hp={hp}>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(3,1fr)" : "repeat(5,1fr)", gap: 12, marginTop: 16 }}>
          {bb.palette.map((s) => <SwatchCard key={s.hex} swatch={s} />)}
        </div>
      </PSection>

      {/* Typography */}
      <PSection id="bb-type" label="Typography" hp={hp}>
        <div style={{ marginTop: 16, border: `1px solid ${HAIR}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "22px 24px", borderBottom: `1px solid ${HAIR}` }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: MUTED }}>Display · {pair.hName}</span>
              <span style={{ fontSize: 11, fontFamily: MONO, color: GOLD }}>Aa</span>
            </div>
            <p style={{ fontFamily: pair.heading, fontSize: mobile ? 26 : 38, fontWeight: 600, letterSpacing: "-.02em", lineHeight: 1.1, margin: "10px 0 0", color: INK }}>{bb.tagline || name}</p>
          </div>
          <div style={{ padding: "22px 24px" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: MUTED }}>Body · {pair.bName}</span>
              <span style={{ fontSize: 11, fontFamily: MONO, color: GOLD }}>Aa</span>
            </div>
            <p style={{ fontFamily: pair.body, fontSize: 15, lineHeight: 1.6, margin: "10px 0 0", maxWidth: "56ch", color: INK }}>
              Body copy sets the everyday tone — readable, even, and quietly confident. {bb.fontNote}
            </p>
          </div>
        </div>
      </PSection>

      {/* Messaging kit */}
      <PSection id="bb-msg" label="Messaging kit" hp={hp}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          <MsgCard label="Elevator pitch" text={bb.messaging.pitch} />
          <MsgCard label="Boilerplate"    text={bb.messaging.boilerplate} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: MUTED }}>Taglines</span>
            {bb.messaging.taglines.map((t) => <TaglineRow key={t} text={t} />)}
          </div>
          {bb.messaging.valueProps?.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: MUTED }}>Value props</span>
              {bb.messaging.valueProps.map((v) => (
                <span key={v} style={{ display: "flex", gap: 9, fontSize: 14, lineHeight: 1.5, color: INK }}>
                  <span style={{ color: GOLD, flexShrink: 0 }}>✓</span>{v}
                </span>
              ))}
            </div>
          )}
        </div>
      </PSection>

      {/* Footer */}
      <div style={{ margin: `28px ${hp} 0`, padding: "20px 0 36px", borderTop: `1px solid ${HAIR}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: MUTED }}>That's your starter brand book.</span>
        <span style={{ fontFamily: SERIF, fontSize: 14, fontStyle: "italic", color: INK }}>The Naming Studio</span>
      </div>

    </div>
  );
}

// ── Atoms ────────────────────────────────────────────────────────────────────

function PHair({ hp = "54px" }: { hp?: string }) {
  return <div style={{ height: 1, background: HAIR, margin: `0 ${hp}` }} />;
}

function PSection({ id, label, children, hp = "54px" }: { id: string; label: string; children: React.ReactNode; hp?: string }) {
  return (
    <div id={id} style={{ padding: `36px ${hp} 8px` }}>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".16em", textTransform: "uppercase", color: MUTED }}>{label}</span>
      {children}
    </div>
  );
}

function VoiceCard({ tone, title, items }: { tone: "do" | "dont"; title: string; items: string[] }) {
  const accent = tone === "do" ? "#3f7d4e" : "#b0553f";
  return (
    <div style={{ border: `1px solid ${HAIR}`, borderRadius: 12, padding: "18px 20px", background: "rgba(255,255,255,.5)" }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: accent }}>{title}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 12 }}>
        {items.map((it) => (
          <span key={it} style={{ display: "flex", gap: 9, fontSize: 13.5, lineHeight: 1.45, color: tone === "dont" ? MUTED : INK }}>
            <span style={{ color: accent, flexShrink: 0 }}>{tone === "do" ? "✓" : "✕"}</span>{it}
          </span>
        ))}
      </div>
    </div>
  );
}

function SwatchCard({ swatch }: { swatch: { hex: string; name: string; role: string } }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try { navigator.clipboard.writeText(swatch.hex); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <span style={{ height: 74, borderRadius: 10, background: swatch.hex, border: `1px solid ${HAIR}`, display: "block" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: INK }}>{swatch.name}</span>
        <span style={{ fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase", color: MUTED }}>{swatch.role}</span>
        <button onClick={copy}
          style={{ marginTop: 3, alignSelf: "flex-start", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", fontFamily: MONO, color: copied ? "#3f7d4e" : GOLD, background: "none", border: "none", padding: 0, cursor: "pointer" }}>
          {copied ? "✓ Copied" : swatch.hex.toUpperCase()}
        </button>
      </div>
    </div>
  );
}

function MsgCard({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try { navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div style={{ border: `1px solid ${HAIR}`, borderRadius: 12, padding: "16px 18px", background: "rgba(255,255,255,.5)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: MUTED }}>{label}</span>
        <button onClick={copy}
          style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: copied ? "#3f7d4e" : GOLD, background: "none", border: "none", padding: 0, cursor: "pointer" }}>
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <p style={{ fontSize: 15, lineHeight: 1.5, margin: 0, color: INK }}>{text}</p>
    </div>
  );
}

function TaglineRow({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try { navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", border: `1px solid ${HAIR}`, borderRadius: 10 }}>
      <span style={{ fontFamily: SERIF, fontSize: 16, color: INK }}>{text}</span>
      <button onClick={copy}
        style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: copied ? "#3f7d4e" : GOLD, background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}>
        {copied ? "✓" : "Copy"}
      </button>
    </div>
  );
}
