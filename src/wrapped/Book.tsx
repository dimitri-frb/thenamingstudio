// The brand book: ten A4 pages generated from the chosen name, concept and logo.
// Rendered small (page previews), large (07b preview overlay) and to print
// (Download PDF = the browser's print-to-PDF on #bk-print).
import { useEffect, useRef, useState } from "react";
import type { WBook } from "./api";
import { logoSvg, toPalette, type Palette } from "./logos";

export interface BookCtx {
  name: string;
  domain: string;          // e.g. aurova.com
  book: WBook;
  logoKey: string;         // chosen logo concept (falls back to sunrise)
  logoAccent: "dawn" | "haze" | "nova";
}

const PAGE_W = 794;  // 210mm @96dpi
const PAGE_H = 1119; // 296mm @96dpi

export const PAGE_TITLES = [
  "Cover", "01 · The story", "02 · The name", "03 · Saying it", "04 · Who we are",
  "05 · The wordmark", "06 · Colour & type", "07 · Voice", "08 · Messaging", "09 · In use",
];

/* ── one page ── */
export function BookPage({ i, ctx }: { i: number; ctx: BookCtx }) {
  const { book, name } = ctx;
  const pal = toPalette(book.palette);
  const grad = `linear-gradient(120deg, ${pal.dawn}, ${pal.haze} 50%, ${pal.nova})`;
  const mark = (variant: "light" | "night" | "dawn" | "mono", h = 60) =>
    ({ __html: logoSvg(ctx.logoKey || "sunrise", name, pal, { variant, accent: ctx.logoAccent, height: h }) });

  const foot = i > 0 ? (
    <div className="bk-foot">
      <span>{name} · Brand book</span>
      <span>Built by The Naming Studio · {i + 1}</span>
    </div>
  ) : null;

  const S = { // shared inline styles
    h: { fontFamily: "var(--serif)", fontWeight: 500, letterSpacing: "-0.02em" } as const,
    kick: { fontSize: "8.5pt", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, opacity: 0.5 },
    body: { fontSize: "10.5pt", lineHeight: 1.6 },
    small: { fontSize: "9pt", lineHeight: 1.55, opacity: 0.75 },
  };

  switch (i) {
    case 0: return ( // Cover — Night, gradient sun, contents
      <div className="bk-page dark" style={{ ["--bk-night" as any]: pal.night, background: pal.night }}>
        <div style={S.kick}>Brand book · Edition 1</div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", gap: 18 }}>
          <div style={{ width: 130, height: 65, borderRadius: "130px 130px 0 0", background: grad }} />
          <div style={{ ...S.h, fontSize: "44pt", lineHeight: 1 }}>{name}</div>
          <div style={{ ...S.h, fontStyle: "italic", fontSize: "13pt", opacity: 0.85 }}>{book.tagline}</div>
          <div style={{ ...S.kick, marginTop: 10 }}>{book.saying.plain} · {book.saying.ipa}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6pt 14pt", fontSize: "8.5pt", opacity: 0.75, marginBottom: 26 }}>
          {PAGE_TITLES.slice(1).map((t) => <span key={t}>{t}</span>)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8pt", opacity: 0.55 }}>
          <span>{ctx.domain}</span><span>Built by The Naming Studio</span>
        </div>
      </div>
    );
    case 1: return ( // The story
      <div className="bk-page">
        <div style={S.kick}>01 · The story</div>
        <h2 style={{ ...S.h, fontSize: "26pt", margin: "16pt 0 14pt" }}>{book.story.headline}</h2>
        <p style={{ ...S.body, maxWidth: "80%" }}>{book.story.para}</p>
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "12pt", paddingBottom: "24pt" }}>
          {[["In one sentence", book.story.oneSentence], ["We believe", book.story.believe], ["We do", book.story.wedo], ["For", book.story.whofor]].map(([k, v]) => (
            <div key={k} style={{ borderTop: "1px solid rgba(0,0,0,.12)", paddingTop: "8pt", display: "flex", gap: "14pt" }}>
              <b style={{ ...S.kick, flex: "0 0 110pt", opacity: 0.45 }}>{k}</b>
              <span style={S.body}>{v}</span>
            </div>
          ))}
        </div>
        {foot}
      </div>
    );
    case 2: return ( // The name
      <div className="bk-page">
        <div style={S.kick}>02 · The name</div>
        <h2 style={{ ...S.h, fontSize: "24pt", margin: "16pt 0 6pt" }}>{book.origin.headline}</h2>
        <div style={{ ...S.h, fontSize: "15pt", opacity: 0.6, marginBottom: "16pt" }}>
          {book.origin.parts.map((p) => p.part).join(" + ")} → <span style={{ opacity: 1 }}>{name}</span>
        </div>
        <div style={{ display: "flex", gap: "16pt" }}>
          {book.origin.parts.map((p) => (
            <div key={p.part} style={{ flex: 1, background: "#f6f5f8", borderRadius: "8pt", padding: "12pt" }}>
              <div style={{ ...S.h, fontStyle: "italic", fontSize: "14pt" }}>{p.part}</div>
              <div style={{ ...S.kick, margin: "3pt 0 8pt" }}>{p.lang} · “{p.gloss}”</div>
              <p style={{ ...S.small, margin: 0 }}>{p.para}</p>
            </div>
          ))}
        </div>
        <div style={{ ...S.kick, margin: "18pt 0 8pt" }}>What the name carries</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8pt 16pt" }}>
          {book.origin.carries.map((c) => (
            <div key={c.word} style={{ borderTop: "1px solid rgba(0,0,0,.12)", paddingTop: "6pt" }}>
              <b style={{ fontSize: "10.5pt" }}>{c.word}</b>
              <div style={S.small}>{c.note}</div>
            </div>
          ))}
        </div>
        <p style={{ ...S.body, marginTop: "auto", paddingBottom: "24pt", opacity: 0.8 }}>{book.origin.closing}</p>
        {foot}
      </div>
    );
    case 3: return ( // Saying it
      <div className="bk-page">
        <div style={S.kick}>03 · Saying it</div>
        <h2 style={{ ...S.h, fontSize: "24pt", margin: "16pt 0 14pt" }}>
          {book.saying.syllables.length} syllables{book.saying.syllables.some((s) => s.stress) ? ", stress on “" + (book.saying.syllables.find((s) => s.stress)?.s || "") + "”" : ""}
        </h2>
        <div style={{ display: "flex", gap: "10pt", alignItems: "baseline", marginBottom: "6pt" }}>
          {book.saying.syllables.map((s, j) => (
            <span key={j} style={{ ...S.h, fontSize: s.stress ? "30pt" : "20pt", opacity: s.stress ? 1 : 0.5 }}>{s.s}</span>
          ))}
        </div>
        <div style={{ ...S.kick, marginBottom: "20pt" }}>IPA · {book.saying.ipa}</div>
        <div style={{ ...S.kick, marginBottom: "8pt" }}>How it sounds around the world</div>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "9.5pt" }}>
          <tbody>
            {book.saying.world.map((w) => (
              <tr key={w.language}>
                <td style={{ padding: "6pt 0", borderTop: "1px solid rgba(0,0,0,.12)", width: "26%", fontWeight: 600 }}>{w.language}</td>
                <td style={{ padding: "6pt 0", borderTop: "1px solid rgba(0,0,0,.12)", width: "28%", fontFamily: "var(--mono)", fontSize: "8.5pt" }}>{w.sounds}</td>
                <td style={{ padding: "6pt 0", borderTop: "1px solid rgba(0,0,0,.12)", opacity: 0.65 }}>{w.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", gap: "16pt", marginTop: "auto", paddingBottom: "24pt" }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...S.kick, marginBottom: "6pt" }}>Write it</div>
            {book.saying.writeYes.map((w) => <div key={w} style={S.body}>{w}</div>)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...S.kick, marginBottom: "6pt" }}>Never</div>
            {book.saying.writeNever.map((w) => <div key={w} style={{ ...S.body, textDecoration: "line-through", opacity: 0.5 }}>{w}</div>)}
          </div>
        </div>
        {foot}
      </div>
    );
    case 4: return ( // Who we are
      <div className="bk-page">
        <div style={S.kick}>04 · Who we are</div>
        <h2 style={{ ...S.h, fontSize: "24pt", margin: "16pt 0 16pt" }}>Mission, vision, values</h2>
        {[["Mission", book.who.mission], ["Vision", book.who.vision]].map(([k, v]) => (
          <div key={k} style={{ borderTop: "1px solid rgba(0,0,0,.12)", padding: "8pt 0", display: "flex", gap: "14pt" }}>
            <b style={{ ...S.kick, flex: "0 0 90pt", opacity: 0.45 }}>{k}</b>
            <span style={{ ...S.body, fontSize: "11.5pt" }}>{v}</span>
          </div>
        ))}
        <div style={{ ...S.kick, margin: "14pt 0 8pt" }}>Values</div>
        <div style={{ display: "flex", gap: "12pt" }}>
          {book.who.values.map((v) => (
            <div key={v.name} style={{ flex: 1, background: "#f6f5f8", borderRadius: "8pt", padding: "10pt" }}>
              <b style={{ fontSize: "10.5pt" }}>{v.name}</b>
              <p style={{ ...S.small, margin: "4pt 0 0" }}>{v.note}</p>
            </div>
          ))}
        </div>
        <div style={{ ...S.kick, margin: "18pt 0 10pt" }}>Personality</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10pt", paddingBottom: "24pt" }}>
          {book.who.personality.map((p) => (
            <div key={p.left} style={{ display: "flex", alignItems: "center", gap: "10pt", fontSize: "9pt" }}>
              <span style={{ flex: "0 0 60pt" }}>{p.left}</span>
              <div style={{ flex: 1, height: 3, background: "rgba(0,0,0,.1)", borderRadius: 2, position: "relative" }}>
                <i style={{ position: "absolute", top: -3.5, left: `${Math.min(97, Math.max(2, p.pos))}%`, width: 10, height: 10, borderRadius: "50%", background: "#1a1823" }} />
              </div>
              <span style={{ flex: "0 0 60pt", textAlign: "right" }}>{p.right}</span>
            </div>
          ))}
        </div>
        {foot}
      </div>
    );
    case 5: return ( // The wordmark
      <div className="bk-page">
        <div style={S.kick}>05 · The wordmark</div>
        <h2 style={{ ...S.h, fontSize: "24pt", margin: "16pt 0 16pt" }}>One word, set with care</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10pt", marginBottom: "18pt" }}>
          <div style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: "8pt", display: "grid", placeItems: "center", padding: "16pt 6pt" }} dangerouslySetInnerHTML={mark("light", 46)} />
          <div style={{ background: pal.night, borderRadius: "8pt", display: "grid", placeItems: "center", padding: "16pt 6pt" }} dangerouslySetInnerHTML={mark("night", 46)} />
          <div style={{ background: grad, borderRadius: "8pt", display: "grid", placeItems: "center", padding: "16pt 6pt" }} dangerouslySetInnerHTML={mark("mono", 46)} />
        </div>
        <div style={{ display: "flex", gap: "16pt", paddingBottom: "24pt" }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...S.kick, marginBottom: "6pt" }}>Do</div>
            <p style={S.small}>Keep clear space equal to the “{name[0] || "A"}” height. Use on white, {book.palette[3]?.name || "Night"}, or the {book.palette[0]?.name || "Dawn"} gradient. Set in one colour only.</p>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...S.kick, marginBottom: "6pt" }}>Don't</div>
            <p style={S.small}>Stretch, outline or add effects. Place on busy photography. Recreate it in another typeface.</p>
          </div>
        </div>
        {foot}
      </div>
    );
    case 6: return ( // Colour & type
      <div className="bk-page">
        <div style={S.kick}>06 · Colour & type</div>
        <h2 style={{ ...S.h, fontSize: "24pt", margin: "16pt 0 16pt" }}>From first light to night</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10pt", marginBottom: "12pt" }}>
          {book.palette.map((c) => (
            <div key={c.name}>
              <div style={{ height: "70pt", borderRadius: "8pt", background: c.hex, border: "1px solid rgba(0,0,0,.08)" }} />
              <b style={{ fontSize: "9.5pt", display: "block", marginTop: "5pt" }}>{c.name}</b>
              <span style={{ fontFamily: "var(--mono)", fontSize: "8pt", opacity: 0.6 }}>{c.hex.toUpperCase()}</span>
            </div>
          ))}
        </div>
        <p style={{ ...S.small, maxWidth: "88%" }}>{book.colourNote}</p>
        <div style={{ ...S.kick, margin: "16pt 0 8pt" }}>Type</div>
        <div style={{ display: "flex", gap: "16pt", paddingBottom: "24pt" }}>
          <div style={{ flex: 1, borderTop: "1px solid rgba(0,0,0,.12)", paddingTop: "8pt" }}>
            <span style={{ fontSize: "26pt", fontWeight: 800, letterSpacing: "-0.03em" }}>Aa</span>
            <div style={{ fontSize: "9.5pt", fontWeight: 600, marginTop: "4pt" }}>SF Pro Display · Heavy</div>
            <div style={S.small}>Headlines, tight tracking</div>
          </div>
          <div style={{ flex: 1, borderTop: "1px solid rgba(0,0,0,.12)", paddingTop: "8pt" }}>
            <span style={{ fontSize: "26pt", fontWeight: 400 }}>Aa</span>
            <div style={{ fontSize: "9.5pt", fontWeight: 600, marginTop: "4pt" }}>SF Pro Text · Regular</div>
            <div style={S.small}>Body, generous line height</div>
          </div>
        </div>
        {foot}
      </div>
    );
    case 7: return ( // Voice
      <div className="bk-page">
        <div style={S.kick}>07 · Voice</div>
        <h2 style={{ ...S.h, fontSize: "24pt", margin: "16pt 0 16pt" }}>{book.voice.words.join(". ")}.</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "10pt" }}>
          {book.voice.lines.map((l) => (
            <div key={l.word} style={{ borderTop: "1px solid rgba(0,0,0,.12)", paddingTop: "8pt", display: "flex", gap: "14pt" }}>
              <b style={{ flex: "0 0 90pt", fontSize: "10.5pt" }}>{l.word}</b>
              <span style={S.body}>{l.note}</span>
            </div>
          ))}
        </div>
        <div style={{ ...S.kick, margin: "20pt 0 10pt" }}>Say it like this</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10pt", paddingBottom: "24pt" }}>
          <div style={{ background: "#f6f5f8", borderRadius: "8pt", padding: "12pt" }}>
            <b style={{ ...S.kick, opacity: 0.45 }}>Yes</b>
            <div style={{ ...S.h, fontStyle: "italic", fontSize: "13pt", marginTop: "4pt" }}>“{book.voice.yes}”</div>
          </div>
          <div style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: "8pt", padding: "12pt", opacity: 0.6 }}>
            <b style={{ ...S.kick }}>Not</b>
            <div style={{ fontSize: "11pt", marginTop: "4pt", textDecoration: "line-through" }}>“{book.voice.not}”</div>
          </div>
        </div>
        {foot}
      </div>
    );
    case 8: return ( // Messaging
      <div className="bk-page">
        <div style={S.kick}>08 · Messaging</div>
        <h2 style={{ ...S.h, fontSize: "24pt", margin: "16pt 0 16pt" }}>What we say, at every length</h2>
        {[["Tagline", book.tagline], ["One-liner", book.messaging.oneLiner], ["Elevator pitch", book.messaging.pitch], ["Boilerplate", book.messaging.boilerplate]].map(([k, v]) => (
          <div key={k} style={{ borderTop: "1px solid rgba(0,0,0,.12)", padding: "8pt 0" }}>
            <b style={{ ...S.kick, opacity: 0.45 }}>{k}</b>
            <p style={{ ...S.body, margin: "4pt 0 0", fontSize: k === "Tagline" ? "13pt" : "10pt" }}>{v}</p>
          </div>
        ))}
        <div style={{ display: "flex", gap: "16pt", marginTop: "auto", paddingBottom: "24pt" }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...S.kick, marginBottom: "6pt" }}>Words we use</div>
            <div style={S.body}>{book.messaging.use.join(" · ")}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...S.kick, marginBottom: "6pt" }}>Words we avoid</div>
            <div style={{ ...S.body, opacity: 0.5, textDecoration: "line-through" }}>{book.messaging.avoid.join(" · ")}</div>
          </div>
        </div>
        {foot}
      </div>
    );
    default: return ( // In use
      <div className="bk-page">
        <div style={S.kick}>09 · In use</div>
        <h2 style={{ ...S.h, fontSize: "24pt", margin: "16pt 0 16pt" }}>{name}, out in the world</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12pt", paddingBottom: "24pt" }}>
          <div style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: "8pt", padding: "12pt", display: "grid", placeItems: "center", minHeight: "110pt" }}>
            <div dangerouslySetInnerHTML={{ __html: logoSvg("appicon", name, pal, { variant: "icon", accent: ctx.logoAccent, height: 74 }) }} />
          </div>
          <div style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: "8pt", padding: "12pt", display: "flex", flexDirection: "column", justifyContent: "center", gap: "4pt" }}>
            <div dangerouslySetInnerHTML={mark("light", 26)} />
            <div style={{ fontSize: "9pt", fontWeight: 600, marginTop: "6pt" }}>Camille Martin</div>
            <div style={{ ...S.small }}>Founder · camille@{ctx.domain}</div>
          </div>
          <div style={{ gridColumn: "1 / -1", background: pal.night, color: "#fff", borderRadius: "8pt", padding: "14pt" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12pt" }}>
              <div dangerouslySetInnerHTML={mark("night", 20)} />
              <div style={{ fontSize: "7.5pt", opacity: 0.7, display: "flex", gap: "10pt" }}>
                <span>How it works</span><span>Pricing</span><span style={{ background: "#fff", color: "#000", borderRadius: 99, padding: "2pt 7pt", fontWeight: 700 }}>Start</span>
              </div>
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "16pt", fontWeight: 500 }}>{book.tagline}</div>
            <div style={{ fontSize: "8.5pt", marginTop: "5pt", opacity: 0.7 }}>Website header</div>
          </div>
          <div style={{ gridColumn: "1 / -1", border: "1px solid rgba(0,0,0,.12)", borderRadius: "8pt", padding: "10pt", fontSize: "8.5pt", opacity: 0.8 }}>
            Camille Martin · Founder<br />
            <b>{name}</b> · {ctx.domain} · {book.tagline}
            <div style={{ ...S.kick, marginTop: "5pt", opacity: 0.4 }}>Email signature</div>
          </div>
        </div>
        {foot}
      </div>
    );
  }
}

/* ── scaled page (fits parent width) ── */
export function ScaledPage({ i, ctx, width }: { i: number; ctx: BookCtx; width: number }) {
  const s = width / PAGE_W;
  return (
    <div style={{ width, height: PAGE_H * s, overflow: "hidden", borderRadius: 8, boxShadow: "0 18px 50px -20px rgba(0,0,0,.7)", flex: "0 0 auto" }}>
      <div style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${s})`, transformOrigin: "top left" }}>
        <BookPage i={i} ctx={ctx} />
      </div>
    </div>
  );
}

/* ── print root: all 10 pages, shown only by @media print ── */
export function BookPrint({ ctx }: { ctx: BookCtx }) {
  return (
    <div id="bk-print" style={{ position: "absolute", left: -99999, top: 0 }}>
      {PAGE_TITLES.map((_, i) => <BookPage key={i} i={i} ctx={ctx} />)}
    </div>
  );
}

export function printBook(): void {
  requestAnimationFrame(() => setTimeout(() => window.print(), 60));
}

/* ── 07b preview overlay ── */
export function BookPreview({ ctx, onClose }: { ctx: BookCtx; onClose: () => void }) {
  const [page, setPage] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(360);

  useEffect(() => {
    const measure = () => {
      const el = wrapRef.current;
      if (!el) return;
      const availW = el.clientWidth - 8;
      const availH = el.clientHeight - 8;
      setW(Math.max(220, Math.min(availW, (availH / PAGE_H) * PAGE_W)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown" || e.key === "ArrowRight") setPage((p) => Math.min(9, p + 1));
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") setPage((p) => Math.max(0, p - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // swipe (mobile)
  const touchX = useRef(0);

  return (
    <div className="wr-bprev">
      <div className="bar">
        <button className="wr-back" onClick={onClose} aria-label="Close">‹</button>
        <span className="t">{ctx.name} · Brand book</span>
        <span className="pg">Page {page + 1} of 10</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="wr-btn2" onClick={printBook}>↓ Export PDF</button>
        </div>
      </div>
      <div className="main">
        <div className="thumbs">
          {PAGE_TITLES.map((t, i) => (
            <button key={t} className={"thumb" + (i === page ? " on" : "")} onClick={() => setPage(i)} title={t}>
              <div style={{ width: 90, height: (90 / PAGE_W) * PAGE_H, transform: `scale(${90 / PAGE_W})`, transformOrigin: "top left" }}>
                <BookPage i={i} ctx={ctx} />
              </div>
            </button>
          ))}
        </div>
        <div
          className="pagewrap" ref={wrapRef}
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (dx < -40) setPage((p) => Math.min(9, p + 1));
            if (dx > 40) setPage((p) => Math.max(0, p - 1));
          }}
        >
          <ScaledPage i={page} ctx={ctx} width={w} />
        </div>
      </div>
      <div className="wr-dots">{PAGE_TITLES.map((_, i) => <i key={i} className={i === page ? "on" : ""} />)}</div>
      <div className="wr-khint" style={{ justifyContent: "center", padding: "0 0 14px" }}>
        <span className="wr-key">↑</span><span className="wr-key">↓</span> to turn pages · <span className="wr-key">esc</span> to close
      </div>
    </div>
  );
}

export type { Palette };
