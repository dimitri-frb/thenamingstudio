// The brand book: ten A4 pages generated from the chosen name, concept and logo.
// Rendered small (page previews), large (07b preview overlay) and to print
// (Download PDF = the browser's print-to-PDF on #bk-print).
import { useEffect, useRef, useState } from "react";
import type { WBook } from "./api";
import { logoSvg, toPalette, type CustomLogo, type LogoFont, type LogoShape, type Palette } from "./logos";

export interface BookCtx {
  name: string;
  domain: string;          // e.g. aurova.com
  book: WBook;
  logoKey: string;         // chosen logo concept (falls back to sunrise)
  logoAccent: "dawn" | "haze" | "nova";
  logoSeed?: number;       // which round the concept came from (shapes vary per seed)
  logoFont?: LogoFont;     // explicit font pick from the logo page
  logoShape?: LogoShape;   // shape language from the taste quiz
  logoCustom?: CustomLogo; // the personalized lockup, when the founder tuned one
}

// The book's structural labels follow the language of its copy.
const BK_EN = {
  edition: "Brand book · Edition 1", brandbook: "Brand book", builtBy: "Built by Name Name",
  story: "01 · The story", oneSentence: "In one sentence", believe: "We believe", wedo: "We do", whofor: "For",
  theName: "02 · The name", carries: "What the name carries",
  saying: "03 · Saying it", syllables: (n: number) => `${n} syllables`, stressOn: (sy: string) => `, stress on “${sy}”`, world: "How it sounds around the world", writeIt: "Write it", never: "Never",
  who: "04 · Who we are", mvv: "Mission, vision, values", mission: "Mission", vision: "Vision", values: "Values", personality: "Personality",
  wordmark: "05 · The wordmark", setWithCare: "One word, set with care", onNight: "On night", oneColour: "One colour, on the gradient", onPaper: "On paper", doo: "Do", dont: "Don't", minSize: "Minimum size", files: "Files",
  minSizeTxt: "24 px high on screen · 8 mm in print.", filesTxt: "The logo pack ships SVG and PNG, in every version shown here.",
  colour: "06 · Colour & type", fromTo: (a: string, b: string) => `From ${a} to ${b}`, type: "Type", headlines: "Headlines, tight tracking", body: "Body, generous line height",
  voice: "07 · Voice", sayLike: "Say it like this", yes: "Yes", not: "Not",
  messaging: "08 · Messaging", everyLength: "What we say, at every length", tagline: "Tagline", oneLiner: "One-liner", pitch: "Elevator pitch", boiler: "Boilerplate", use: "Words we use", avoid: "Words we avoid",
  inUse: "09 · In use", outThere: (n: string) => `${n}, out in the world`, appIcon: "App icon", bizCard: "Business card", webHeader: "Website header", emailSig: "Email signature", founder: "Founder",
};
const BK_FR: typeof BK_EN = {
  edition: "Brand book · Édition 1", brandbook: "Brand book", builtBy: "Créé par Name Name",
  story: "01 · L'histoire", oneSentence: "En une phrase", believe: "Nous croyons", wedo: "Nous faisons", whofor: "Pour",
  theName: "02 · Le nom", carries: "Ce que le nom porte",
  saying: "03 · Le prononcer", syllables: (n: number) => `${n} syllabes`, stressOn: (sy: string) => `, accent sur « ${sy} »`, world: "Comment il sonne dans le monde", writeIt: "L'écrire", never: "Jamais",
  who: "04 · Qui nous sommes", mvv: "Mission, vision, valeurs", mission: "Mission", vision: "Vision", values: "Valeurs", personality: "Personnalité",
  wordmark: "05 · Le logotype", setWithCare: "Un mot, composé avec soin", onNight: "Sur fond nuit", oneColour: "Une couleur, sur le dégradé", onPaper: "Sur papier", doo: "À faire", dont: "À éviter", minSize: "Taille minimale", files: "Fichiers",
  minSizeTxt: "24 px à l'écran · 8 mm en impression.", filesTxt: "Le pack logo contient SVG et PNG, dans chaque version montrée ici.",
  colour: "06 · Couleur & typo", fromTo: (a: string, b: string) => `De ${a} à ${b}`, type: "Typographie", headlines: "Titres, interlettrage serré", body: "Texte courant, interligne généreux",
  voice: "07 · La voix", sayLike: "Le dire comme ça", yes: "Oui", not: "Non",
  messaging: "08 · Les messages", everyLength: "Ce que nous disons, à chaque format", tagline: "Tagline", oneLiner: "En une ligne", pitch: "Pitch", boiler: "Boilerplate", use: "Mots que nous utilisons", avoid: "Mots que nous évitons",
  inUse: "09 · En usage", outThere: (n: string) => `${n}, dans le monde`, appIcon: "Icône d'app", bizCard: "Carte de visite", webHeader: "En-tête du site", emailSig: "Signature d'e-mail", founder: "Fondatrice/Fondateur",
};

const PAGE_W = 794;  // 210mm @96dpi
const PAGE_H = 1119; // 296mm @96dpi

export const PAGE_TITLES = [
  "Cover", "01 · The story", "02 · The name", "03 · Saying it", "04 · Who we are",
  "05 · The wordmark", "06 · Colour & type", "07 · Voice", "08 · Messaging", "09 · In use",
];
const PAGE_TITLES_FR = [
  "Couverture", "01 · L'histoire", "02 · Le nom", "03 · Le prononcer", "04 · Qui nous sommes",
  "05 · Le logotype", "06 · Couleur & typo", "07 · La voix", "08 · Les messages", "09 · En usage",
];

/* ── one page ── */
export function BookPage({ i, ctx }: { i: number; ctx: BookCtx }) {
  const { book, name } = ctx;
  const T = (book.lang || "en").toLowerCase().startsWith("fr") ? BK_FR : BK_EN;
  const pal = toPalette(book.palette);
  const grad = `linear-gradient(120deg, ${pal.dawn}, ${pal.haze} 50%, ${pal.nova})`;
  const mark = (variant: "light" | "night" | "dawn" | "mono", h = 60) =>
    ({ __html: logoSvg(ctx.logoKey || "sunrise", name, pal, { variant, accent: ctx.logoAccent, seed: ctx.logoSeed || 0, font: ctx.logoFont, shape: ctx.logoShape, custom: ctx.logoCustom, height: h }) });

  const foot = i > 0 ? (
    <div className="bk-foot">
      <span>{name} · {T.brandbook}</span>
      <span>{T.builtBy} · {i + 1}</span>
    </div>
  ) : null;

  const S = { // shared inline styles
    h: { fontFamily: "var(--bookserif)", fontWeight: 500, letterSpacing: "-0.02em" } as const,
    kick: { fontSize: "8.5pt", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, opacity: 0.5 },
    body: { fontSize: "10.5pt", lineHeight: 1.6 },
    small: { fontSize: "9pt", lineHeight: 1.55, opacity: 0.75 },
  };

  switch (i) {
    case 0: return ( // Cover — Night, gradient sun, contents
      <div className="bk-page dark" style={{ ["--bk-night" as any]: pal.night, background: pal.night }}>
        <div style={S.kick}>{T.edition}</div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", gap: 18 }}>
          <div dangerouslySetInnerHTML={{ __html: logoSvg(ctx.logoKey || "sunrise", name, pal, { variant: "tile", accent: ctx.logoAccent, seed: ctx.logoSeed || 0, font: ctx.logoFont, shape: ctx.logoShape, custom: ctx.logoCustom, height: 64 }) }} />
          <div style={{ ...S.h, fontSize: "44pt", lineHeight: 1 }}>{name}</div>
          <div style={{ ...S.h, fontStyle: "italic", fontSize: "13pt", opacity: 0.85 }}>{book.tagline}</div>
          <div style={{ ...S.kick, marginTop: 10 }}>{book.saying.plain} · {book.saying.ipa}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6pt 14pt", fontSize: "8.5pt", opacity: 0.75, marginBottom: 26 }}>
          {((book.lang || "en").toLowerCase().startsWith("fr") ? PAGE_TITLES_FR : PAGE_TITLES).slice(1).map((t) => <span key={t}>{t}</span>)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8pt", opacity: 0.55 }}>
          <span>{ctx.domain}</span><span>{T.builtBy}</span>
        </div>
      </div>
    );
    case 1: return ( // The story
      <div className="bk-page">
        <div style={S.kick}>{T.story}</div>
        <h2 style={{ ...S.h, fontSize: "26pt", margin: "16pt 0 14pt" }}>{book.story.headline}</h2>
        <p style={{ ...S.body, maxWidth: "80%" }}>{book.story.para}</p>
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "12pt", paddingBottom: "24pt" }}>
          {[[T.oneSentence, book.story.oneSentence], [T.believe, book.story.believe], [T.wedo, book.story.wedo], [T.whofor, book.story.whofor]].map(([k, v]) => (
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
        <div style={S.kick}>{T.theName}</div>
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
        <div style={{ ...S.kick, margin: "18pt 0 8pt" }}>{T.carries}</div>
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
        <div style={S.kick}>{T.saying}</div>
        <h2 style={{ ...S.h, fontSize: "24pt", margin: "16pt 0 14pt" }}>
          {T.syllables(book.saying.syllables.length)}{book.saying.syllables.some((s) => s.stress) ? T.stressOn(book.saying.syllables.find((s) => s.stress)?.s || "") : ""}
        </h2>
        <div style={{ display: "flex", gap: "10pt", alignItems: "baseline", marginBottom: "6pt" }}>
          {book.saying.syllables.map((s, j) => (
            <span key={j} style={{ ...S.h, fontSize: s.stress ? "30pt" : "20pt", opacity: s.stress ? 1 : 0.5 }}>{s.s}</span>
          ))}
        </div>
        <div style={{ ...S.kick, marginBottom: "20pt" }}>IPA · {book.saying.ipa}</div>
        <div style={{ ...S.kick, marginBottom: "8pt" }}>{T.world}</div>
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
            <div style={{ ...S.kick, marginBottom: "6pt" }}>{T.writeIt}</div>
            {book.saying.writeYes.map((w) => <div key={w} style={S.body}>{w}</div>)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...S.kick, marginBottom: "6pt" }}>{T.never}</div>
            {book.saying.writeNever.map((w) => <div key={w} style={{ ...S.body, textDecoration: "line-through", opacity: 0.5 }}>{w}</div>)}
          </div>
        </div>
        {foot}
      </div>
    );
    case 4: return ( // Who we are
      <div className="bk-page">
        <div style={S.kick}>{T.who}</div>
        <h2 style={{ ...S.h, fontSize: "24pt", margin: "16pt 0 16pt" }}>{T.mvv}</h2>
        {[[T.mission, book.who.mission], [T.vision, book.who.vision]].map(([k, v]) => (
          <div key={k} style={{ borderTop: "1px solid rgba(0,0,0,.12)", padding: "8pt 0", display: "flex", gap: "14pt" }}>
            <b style={{ ...S.kick, flex: "0 0 90pt", opacity: 0.45 }}>{k}</b>
            <span style={{ ...S.body, fontSize: "11.5pt" }}>{v}</span>
          </div>
        ))}
        <div style={{ ...S.kick, margin: "14pt 0 8pt" }}>{T.values}</div>
        <div style={{ display: "flex", gap: "12pt" }}>
          {book.who.values.map((v) => (
            <div key={v.name} style={{ flex: 1, background: "#f6f5f8", borderRadius: "8pt", padding: "10pt" }}>
              <b style={{ fontSize: "10.5pt" }}>{v.name}</b>
              <p style={{ ...S.small, margin: "4pt 0 0" }}>{v.note}</p>
            </div>
          ))}
        </div>
        <div style={{ ...S.kick, margin: "18pt 0 10pt" }}>{T.personality}</div>
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
        <div style={S.kick}>{T.wordmark}</div>
        <h2 style={{ ...S.h, fontSize: "24pt", margin: "16pt 0 14pt" }}>{T.setWithCare}</h2>
        <div style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: "10pt", display: "grid", placeItems: "center", padding: "34pt 10pt", marginBottom: "12pt" }} dangerouslySetInnerHTML={mark("light", 78)} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10pt", marginBottom: "16pt" }}>
          {([["night", pal.night, T.onNight], ["mono", grad, T.oneColour], ["light", "#f4f2ee", T.onPaper]] as const).map(([v, bg, label]) => (
            <div key={label}>
              <div style={{ background: bg, borderRadius: "8pt", display: "grid", placeItems: "center", padding: "20pt 6pt", border: "1px solid rgba(0,0,0,.06)" }} dangerouslySetInnerHTML={mark(v, 34)} />
              <div style={{ ...S.kick, marginTop: "5pt", letterSpacing: "0.1em" }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "16pt" }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...S.kick, marginBottom: "6pt" }}>{T.doo}</div>
            <p style={S.small}>Keep clear space equal to the “{name[0] || "A"}” height. Use on white, {book.palette[3]?.name || "Night"}, or the {book.palette[0]?.name || "Dawn"} gradient. Set in one colour only.</p>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...S.kick, marginBottom: "6pt" }}>{T.dont}</div>
            <p style={S.small}>Stretch, outline or add effects. Place on busy photography. Recreate it in another typeface.</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "16pt", marginTop: "auto", paddingBottom: "24pt" }}>
          <div style={{ flex: 1, borderTop: "1px solid rgba(0,0,0,.12)", paddingTop: "8pt" }}>
            <div style={{ ...S.kick, marginBottom: "4pt" }}>{T.minSize}</div>
            <p style={{ ...S.small, margin: 0 }}>{T.minSizeTxt}</p>
          </div>
          <div style={{ flex: 1, borderTop: "1px solid rgba(0,0,0,.12)", paddingTop: "8pt" }}>
            <div style={{ ...S.kick, marginBottom: "4pt" }}>{T.files}</div>
            <p style={{ ...S.small, margin: 0 }}>{T.filesTxt}</p>
          </div>
        </div>
        {foot}
      </div>
    );
    case 6: return ( // Colour & type
      <div className="bk-page">
        <div style={S.kick}>{T.colour}</div>
        <h2 style={{ ...S.h, fontSize: "24pt", margin: "16pt 0 16pt" }}>{T.fromTo((book.palette[0]?.name || "dawn").toLowerCase(), (book.palette[book.palette.length - 1]?.name || "night").toLowerCase())}</h2>
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
        <div style={{ ...S.kick, margin: "16pt 0 8pt" }}>{T.type}</div>
        <div style={{ display: "flex", gap: "16pt", paddingBottom: "24pt" }}>
          <div style={{ flex: 1, borderTop: "1px solid rgba(0,0,0,.12)", paddingTop: "8pt" }}>
            <span style={{ fontSize: "26pt", fontWeight: 800, letterSpacing: "-0.03em" }}>Aa</span>
            <div style={{ fontSize: "9.5pt", fontWeight: 600, marginTop: "4pt" }}>SF Pro Display · Heavy</div>
            <div style={S.small}>{T.headlines}</div>
          </div>
          <div style={{ flex: 1, borderTop: "1px solid rgba(0,0,0,.12)", paddingTop: "8pt" }}>
            <span style={{ fontSize: "26pt", fontWeight: 400 }}>Aa</span>
            <div style={{ fontSize: "9.5pt", fontWeight: 600, marginTop: "4pt" }}>SF Pro Text · Regular</div>
            <div style={S.small}>{T.body}</div>
          </div>
        </div>
        {foot}
      </div>
    );
    case 7: return ( // Voice
      <div className="bk-page">
        <div style={S.kick}>{T.voice}</div>
        <h2 style={{ ...S.h, fontSize: "24pt", margin: "16pt 0 16pt" }}>{book.voice.words.join(". ")}.</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "10pt" }}>
          {book.voice.lines.map((l) => (
            <div key={l.word} style={{ borderTop: "1px solid rgba(0,0,0,.12)", paddingTop: "8pt", display: "flex", gap: "14pt" }}>
              <b style={{ flex: "0 0 90pt", fontSize: "10.5pt" }}>{l.word}</b>
              <span style={S.body}>{l.note}</span>
            </div>
          ))}
        </div>
        <div style={{ ...S.kick, margin: "20pt 0 10pt" }}>{T.sayLike}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10pt", paddingBottom: "24pt" }}>
          <div style={{ background: "#f6f5f8", borderRadius: "8pt", padding: "12pt" }}>
            <b style={{ ...S.kick, opacity: 0.45 }}>{T.yes}</b>
            <div style={{ ...S.h, fontStyle: "italic", fontSize: "13pt", marginTop: "4pt" }}>“{book.voice.yes}”</div>
          </div>
          <div style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: "8pt", padding: "12pt", opacity: 0.6 }}>
            <b style={{ ...S.kick }}>{T.not}</b>
            <div style={{ fontSize: "11pt", marginTop: "4pt", textDecoration: "line-through" }}>“{book.voice.not}”</div>
          </div>
        </div>
        {foot}
      </div>
    );
    case 8: return ( // Messaging
      <div className="bk-page">
        <div style={S.kick}>{T.messaging}</div>
        <h2 style={{ ...S.h, fontSize: "24pt", margin: "16pt 0 16pt" }}>{T.everyLength}</h2>
        {[[T.tagline, book.tagline], [T.oneLiner, book.messaging.oneLiner], [T.pitch, book.messaging.pitch], [T.boiler, book.messaging.boilerplate]].map(([k, v]) => (
          <div key={k} style={{ borderTop: "1px solid rgba(0,0,0,.12)", padding: "8pt 0" }}>
            <b style={{ ...S.kick, opacity: 0.45 }}>{k}</b>
            <p style={{ ...S.body, margin: "4pt 0 0", fontSize: k === T.tagline ? "13pt" : "10pt" }}>{v}</p>
          </div>
        ))}
        <div style={{ display: "flex", gap: "16pt", marginTop: "auto", paddingBottom: "24pt" }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...S.kick, marginBottom: "6pt" }}>{T.use}</div>
            <div style={S.body}>{book.messaging.use.join(" · ")}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...S.kick, marginBottom: "6pt" }}>{T.avoid}</div>
            <div style={{ ...S.body, opacity: 0.5, textDecoration: "line-through" }}>{book.messaging.avoid.join(" · ")}</div>
          </div>
        </div>
        {foot}
      </div>
    );
    default: return ( // In use
      <div className="bk-page">
        <div style={S.kick}>{T.inUse}</div>
        <h2 style={{ ...S.h, fontSize: "24pt", margin: "16pt 0 16pt" }}>{T.outThere(name)}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12pt", flex: 1, gridTemplateRows: "1fr auto auto", paddingBottom: "24pt" }}>
          <div style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: "8pt", padding: "12pt", display: "grid", placeItems: "center", minHeight: "150pt" }}>
            <div style={{ textAlign: "center" }}>
              <div dangerouslySetInnerHTML={{ __html: logoSvg("appicon", name, pal, { variant: "icon", accent: ctx.logoAccent, seed: ctx.logoSeed || 0, shape: ctx.logoShape, height: 92 }) }} />
              <div style={{ ...S.kick, marginTop: "8pt" }}>{T.appIcon}</div>
            </div>
          </div>
          <div style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: "8pt", padding: "16pt", display: "flex", flexDirection: "column", justifyContent: "center", gap: "4pt" }}>
            <div dangerouslySetInnerHTML={mark("light", 34)} />
            <div style={{ fontSize: "10pt", fontWeight: 600, marginTop: "10pt" }}>Camille Martin</div>
            <div style={{ ...S.small }}>{T.founder} · camille@{ctx.domain}</div>
            <div style={{ ...S.kick, marginTop: "8pt", opacity: 0.4 }}>{T.bizCard}</div>
          </div>
          <div style={{ gridColumn: "1 / -1", background: pal.night, color: "#fff", borderRadius: "8pt", padding: "18pt" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16pt" }}>
              <div dangerouslySetInnerHTML={mark("night", 26)} />
              <div style={{ fontSize: "8.5pt", opacity: 0.8, display: "flex", gap: "12pt", alignItems: "center" }}>
                <span>How it works</span><span>Pricing</span><span style={{ background: "#fff", color: "#000", borderRadius: 99, padding: "3pt 9pt", fontWeight: 700 }}>Start</span>
              </div>
            </div>
            <div style={{ fontFamily: "var(--bookserif)", fontSize: "19pt", fontWeight: 500 }}>{book.tagline}</div>
            <div style={{ fontSize: "8.5pt", marginTop: "6pt", opacity: 0.7 }}>{T.webHeader}</div>
          </div>
          <div style={{ gridColumn: "1 / -1", border: "1px solid rgba(0,0,0,.12)", borderRadius: "8pt", padding: "13pt", fontSize: "9.5pt", opacity: 0.85 }}>
            Camille Martin · {T.founder}<br />
            <b>{name}</b> · {ctx.domain} · {book.tagline}
            <div style={{ ...S.kick, marginTop: "6pt", opacity: 0.4 }}>{T.emailSig}</div>
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

export function printBook(title?: string): void {
  // The browser names the PDF after the page title, so the download carries
  // the found name ("Aurova - Brand book.pdf"), not the site's title.
  const prev = document.title;
  if (title) document.title = title;
  const restore = () => { document.title = prev; window.removeEventListener("afterprint", restore); };
  window.addEventListener("afterprint", restore);
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
          <button className="wr-btn2" onClick={() => printBook(`${ctx.name} - Brand book`)}>↓ Export PDF</button>
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
