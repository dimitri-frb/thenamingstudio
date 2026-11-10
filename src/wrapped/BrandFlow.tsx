// Handoff 28 · the brand flow after the paywall: one hub, six pieces done in
// order (Logo · Brand book · Socials kit · Marketing kit · Business cards ·
// Pitch deck), each "pick a version → see what you get → pick a format",
// a download sheet (bottom sheet on phones, dialog on desktop), then All set.
// Visuals come from the families engine (handoff 27).
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ProCard } from "./Freemium";
import { buildLogoPack, logoSvg, svgToPng, type Palette } from "./logos";
import { outlineSvg } from "./outline";
import { svgPdf } from "./pdf";
import { download, makeZip } from "./zip";
import { nest } from "./bookArt";
import { FAM_SHORT, avatar, banner, cardBack, cardFront, post, type Fam, type FamData } from "./families";
import type { DeckInput } from "./Kits2";
import { THEMES, deckContent, deckPptx2, deckScenes, sceneSvg, type DeckBrand, type Theme } from "./deck2";
import type { KitLogo } from "./kitArt";
import type { WDeck2, WDeckSlide, WKit } from "./api";

export type PieceId = "logo" | "book" | "socials" | "mkt" | "cards" | "deck";
export const PIECES: { id: PieceId; label: string }[] = [
  { id: "logo", label: "Logo" }, { id: "book", label: "Brand book" }, { id: "socials", label: "Socials kit" },
  { id: "mkt", label: "Marketing kit" }, { id: "cards", label: "Business cards" }, { id: "deck", label: "Pitch deck" },
];
export interface FlowState { sel: Partial<Record<PieceId, number>>; dl: Partial<Record<PieceId, string>> }
export interface FlowCtx {
  name: string; domain: string; pal: Palette; logo: KitLogo; fam: Fam; fd: FamData;
  kit: WKit | null; deckInput: DeckInput; deckAi: WDeck2 | WDeckSlide[] | null;
  me: { name?: string; email?: string } | null;
  account: string | null;          // the signed-in email the run is saved to (null = not signed in)
  local?: boolean;                 // a shop, café, salon…: Instagram, Facebook and Google, not LinkedIn and X
  st: FlowState; setSel: (p: PieceId, v: number) => void; setDl: (p: PieceId, f: string) => void;
  bookReady: boolean; bookPdf: () => void; bookWord: () => Promise<void>; bookHtml: () => Promise<{ html: string; filename: string }>; bookPreview: () => void;
  persBtn: () => void; track: (ev: string, p?: Record<string, unknown>) => void;
  // handoff 29 · freemium: preview free, download with Pro (the logo PNG is free)
  pro: boolean; price: number;
  openPro: (step: string, o?: { title?: string; lead?: string; cta?: string; then?: () => void }) => void;
}
// The cover images each kind of business actually needs.
const BANNERS = (local?: boolean) => local
  ? [{ id: "facebook-cover", label: "Facebook", w: 1640, h: 624 }, { id: "google-business-cover", label: "Google Business", w: 1080, h: 608 }]
  : [{ id: "linkedin-banner", label: "LinkedIn", w: 1584, h: 396 }, { id: "x-banner", label: "X", w: 1500, h: 500 }];
const LOGO_V = ["Primary", "Reversed", "Mono", "On colour"];
const BOOK_V = ["Night", "Editorial", "Colour"];
const DECK_V = [...THEMES];
export const versionsOf = (p: PieceId): string[] => (p === "logo" ? LOGO_V : p === "book" ? BOOK_V : p === "deck" ? DECK_V : [...FAM_SHORT]);
const defaultSel = (p: PieceId, c: FlowCtx) => (p === "socials" || p === "mkt" || p === "cards" ? c.fam : 0);
export const selOf = (p: PieceId, c: FlowCtx) => c.st.sel[p] ?? defaultSel(p, c);
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const sv = (svg: string) => <span className="sv" dangerouslySetInnerHTML={{ __html: svg }} />;
const dayOf = (label: string, i: number) => label.match(/Day\s*\d+/i)?.[0] || `Day ${[1, 3, 7][i] || i + 1}`;
const enc = new TextEncoder();
const deckBrand = (c: FlowCtx): DeckBrand => ({ name: c.name, sym: c.fd.sym, font: c.fd.font, pal: c.pal, site: c.domain, email: c.me?.email || "", founder: c.me?.name || c.deckInput.founder, brief: c.deckInput.brief, tagline: c.deckInput.tagline, concept: c.deckInput.concept });
const scenesOf = (c: FlowCtx, t: Theme) => { const b = deckBrand(c); return deckScenes(t, b, deckContent(b, c.deckAi)); };
const blobBytes = async (b: Blob) => new Uint8Array(await b.arrayBuffer());

/* ── the visuals of each piece ── */
function logoVariant(c: FlowCtx, v: number, h = 220): string {
  const variant = v === 1 ? "night" : v === 2 ? "mono" : v === 3 ? "dawn" : "light";
  // fill the tile with the logo's own ground (no dark frame round a coloured logo)
  const svg = logoSvg(c.logo.key, c.name, c.pal, { ...c.logo.opts, variant, height: h });
  // Fit the whole logo (never crop a long name) and paint the rest of the tile
  // with the logo's own ground, so there's no dark frame round it.
  let out = svg, ground = "transparent";
  const g = svg.match(/<rect width="[^"]+" height="[^"]+"(?: rx="[^"]+")? fill="([^"]+)"\/?>(?:<\/rect>)?/);
  if (g) {
    const ref = g[1].match(/^url\(#([^)]+)\)$/);
    if (!ref) ground = g[1];
    else {
      // a gradient ground: the tile carries it in CSS, edge to edge
      const def = svg.match(new RegExp(`<linearGradient id="${ref[1]}"[\\s\\S]*?<\\/linearGradient>`))?.[0] || "";
      const stops = [...def.matchAll(/offset="([^"]+)" stop-color="([^"]+)"/g)].map((m) => `${m[2]} ${Math.round(parseFloat(m[1]) * 100)}%`);
      if (stops.length) { ground = `linear-gradient(135deg, ${stops.join(", ")})`; out = svg.replace(g[0], ""); }
    }
  }
  return out.replace("<svg ", `<svg preserveAspectRatio="xMidYMid meet" style="background:${ground}" `);
}
function posts(c: FlowCtx, f: Fam, story = false): string[] {
  const ps = c.kit?.posts?.length ? c.kit.posts : [{ title: `Something new is coming: ${c.name}.`, label: "Day 1" }, { title: `${c.name} is here.`, label: "Day 3" }, { title: c.fd.tagline || `Why we started ${c.name}.`, label: "Day 7" }];
  return ps.slice(0, 3).map((p, i) => post(f, c.fd, p.title, dayOf(p.label || "", i), 1080, story ? 1920 : 1080));
}
const bannerData = (c: FlowCtx) => ({ ...c.fd, tagline: c.fd.tagline || c.kit?.bioShort?.replace(/\s*\S+\.\S+\s*$/, "") || c.name });
/** A book cover in a given style, small (for version tiles and the hub). */
function bookThumb(c: FlowCtx, k: number): string {
  const bg = k === 0 ? c.pal.night : k === 1 ? "#f4f2ee" : c.pal.dawn;
  const lg = logoSvg(c.logo.key, c.name, c.pal, { ...c.logo.opts, variant: k === 0 ? "night" : k === 2 ? "mono" : "light", height: 120 }).replace(/<rect width="[^"]+" height="[^"]+" fill="[^"]+"\/>/, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" width="210" height="297"><rect width="210" height="297" fill="${bg}"/>` +
    (k === 0 ? `<radialGradient id="bt" cx="50%" cy="105%" r="60%"><stop offset="0" stop-color="${c.pal.dawn}" stop-opacity=".5"/><stop offset="1" stop-color="${c.pal.dawn}" stop-opacity="0"/></radialGradient><rect width="210" height="297" fill="url(#bt)"/>` : "") +
    nest(lg, 30, 110, 150, 60) + `<rect x="24" y="250" width="162" height="1" fill="${k === 0 ? "#fff" : "#000"}" opacity=".25"/></svg>`;
}
export function thumbOf(p: PieceId, c: FlowCtx): string {
  const v = selOf(p, c) as Fam;
  if (p === "logo") return logoVariant(c, v, 80);
  if (p === "book") return bookThumb(c, selOf("book", c));
  if (p === "socials") return avatar(v, c.fd, 200);
  if (p === "mkt") return posts(c, v)[1] || avatar(v, c.fd, 200);
  if (p === "cards") return cardFront(v, "A", { ...c.fd, person: c.me?.name || "Your name" });
  return sceneSvg(scenesOf(c, v as Theme)[0], 480);
}

/** G·0 · the collage: their card, a Day 1 post, a pitch slide (Paper, light on dark), the logo tile. */
export function introArt(c: FlowCtx): { card: string; post: string; slide: string; logo: string } {
  const f = c.fam;
  return {
    card: cardFront(0 as Fam, "A", { ...c.fd, person: c.me?.name || "Your name" }),
    post: posts(c, f)[0],
    slide: sceneSvg(scenesOf(c, 1)[0], 480),
    logo: logoSvg(c.logo.key.startsWith("x:") ? c.logo.key : "appicon", c.name, c.pal, { ...c.logo.opts, variant: "icon", height: 160 }),
  };
}
/** The free download: the primary logo as a 2000 px PNG. */
export async function logoPng(c: FlowCtx): Promise<void> {
  const svg = logoVariant(c, 0, 400);
  download(new Blob([(await svgToPng(await outlineSvg(svg), 2000)) as Uint8Array<ArrayBuffer>], { type: "image/png" }), `${slug(c.name)}-logo.png`);
  c.track("logo_png_downloaded");
}

/* ── formats: what each piece downloads as ── */
export interface Format { id: string; label: string; group?: string; editable?: boolean; best: string; size: string; help?: string; run: () => Promise<void | string> }
function docx(title: string, blocks: { h?: string; p?: string }[]): Blob {
  const x = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const para = (t: string, bold = false, size = 22) => `<w:p><w:r><w:rPr>${bold ? "<w:b/>" : ""}<w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${x(t)}</w:t></w:r></w:p>`;
  const body = para(title, true, 36) + blocks.map((b) => (b.h ? para(b.h, true, 26) : "") + (b.p ? b.p.split("\n").map((l) => para(l)).join("") : "")).join("");
  const files = [
    { name: "[Content_Types].xml", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`) },
    { name: "_rels/.rels", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`) },
    { name: "word/document.xml", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`) },
  ];
  return makeZip(files);
}
async function textPdf(title: string, blocks: { h?: string; p?: string }[]): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 22;
  const line = (t: string, size: number, bold: boolean) => {
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size);
    for (const l of doc.splitTextToSize(t, 170) as string[]) { if (y > 280) { doc.addPage(); y = 20; } doc.text(l, 20, y); y += size * 0.45; }
  };
  line(title, 20, true); y += 4;
  for (const b of blocks) { if (b.h) { y += 3; line(b.h, 13, true); } if (b.p) for (const l of b.p.split("\n")) line(l, 11, false); }
  return doc.output("blob");
}
function copyBlocks(c: FlowCtx): { h?: string; p?: string }[] {
  const k = c.kit;
  if (!k) return [];
  return [
    ...k.posts.map((p) => ({ h: `${p.label} · launch post`, p: `On the image: ${p.title}\nCaption: ${p.caption}` })),
    { h: "Google Ads · search", p: `Headlines:\n${k.googleHeadlines.join("\n")}\nDescription: ${k.googleDescription}` },
    { h: "Meta Ads · Instagram & Facebook", p: `Primary text: ${k.metaPrimary}\nHeadline: ${k.metaHeadline}` },
  ];
}
export function formatsOf(p: PieceId, c: FlowCtx): Format[] {
  const nm = slug(c.name), v = selOf(p, c) as Fam;
  const zipSvgs = async (files: { name: string; svg: string; h?: number; png?: boolean }[], zipName: string) => {
    const out: { name: string; data: Uint8Array }[] = [];
    for (const f of files) {
      const o = await outlineSvg(f.svg);
      out.push(f.png ? { name: f.name, data: await svgToPng(o, f.h || 1080) } : { name: f.name, data: enc.encode(o) });
    }
    download(makeZip(out), zipName);
  };
  if (p === "logo") {
    const svg = () => logoVariant(c, v, 400);
    return [
      { id: "svg", label: "SVG", editable: true, best: "Edit in Figma or Illustrator", size: "1 file", run: async () => { download(new Blob([await outlineSvg(svg())], { type: "image/svg+xml" }), `${nm}-logo-${slug(LOGO_V[v])}.svg`); } },
      { id: "png", label: "PNG", best: "Website, social, documents", size: "2000 px", run: async () => { download(new Blob([(await svgToPng(svg(), 2000)) as Uint8Array<ArrayBuffer>], { type: "image/png" }), `${nm}-logo-${slug(LOGO_V[v])}.png`); } },
      { id: "pdf", label: "PDF", best: "Send to a printer", size: "vector", run: async () => {
        const s = svg(); const m = s.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/); const ar = m ? Number(m[1]) / Number(m[2]) : 2;
        download(await svgPdf([s], 120, 120 / ar, `${c.name} logo`), `${nm}-logo-${slug(LOGO_V[v])}.pdf`);
      } },
      { id: "eps", label: "EPS", editable: true, best: "For print shops, sign makers and older design tools", size: "vector", run: async () => {
        const { svgToEps } = await import("./eps");
        download(new Blob([svgToEps(await outlineSvg(svg()), `${c.name} logo`)], { type: "application/postscript" }), `${nm}-logo-${slug(LOGO_V[v])}.eps`);
      } },
      { id: "pack", label: "Full logo pack", best: "Every version, app icons, favicon, colours", size: ".zip", run: async () => {
        const pack = await buildLogoPack(c.name, c.logo.key, (c.logo.opts?.accent as any) || "dawn", c.logo.opts?.seed || 0,
          [{ name: "Dawn", hex: c.pal.dawn }, { name: "Haze", hex: c.pal.haze }, { name: "Nova", hex: c.pal.nova }, { name: "Night", hex: c.pal.night }],
          c.logo.opts?.font, c.logo.opts?.shape, c.logo.opts?.custom);
        download(pack.blob, pack.filename);
      } },
    ];
  }
  if (p === "book") return [
    { id: "pdf", label: "PDF", best: "Share, print, present", size: "12 pages", run: async () => c.bookPdf() },
    { id: "word", label: "Word", editable: true, best: "Edit the text in Word or Pages", size: ".doc", run: () => c.bookWord() },
    { id: "gdocs", label: "Google Docs", editable: true, best: "Edit the text in Google Docs", size: ".html", help: "In Google Drive: New → File upload, then double-click the file and choose Open with Google Docs.", run: async () => { const r = await c.bookHtml(); download(new Blob([r.html], { type: "text/html" }), `${r.filename}.html`); } },
  ];
  if (p === "socials") {
    const bd = bannerData(c);
    const files = (png: boolean) => [
      { name: `${nm}-profile-1080.${png ? "png" : "svg"}`, svg: avatar(v, c.fd, 1080), h: 1080, png },
      ...BANNERS(c.local).map((b) => ({ name: `${nm}-${b.id}-${b.w}x${b.h}.${png ? "png" : "svg"}`, svg: banner(v, bd, b.w, b.h), h: b.h, png })),
    ];
    const bios = c.kit ? [{ name: "bios.txt", data: enc.encode(c.local
      ? `SHORT (Instagram · TikTok)\n${c.kit.bioShort}\n\nLONG (Facebook · Google Business)\n${c.kit.bioLong}\n`
      : `SHORT (Instagram · TikTok · X)\n${c.kit.bioShort}\n\nLONG (LinkedIn)\n${c.kit.bioLong}\n`) }] : [];
    const z = async (png: boolean, zn: string) => {
      const out: { name: string; data: Uint8Array }[] = [...bios];
      for (const f of files(png)) { const o = await outlineSvg(f.svg); out.push({ name: f.name, data: png ? await svgToPng(o, f.h) : enc.encode(o) }); }
      download(makeZip(out), zn);
    };
    return [
      { id: "png", label: "PNG", best: "Upload straight to each network", size: "3 images + bios", run: () => z(true, `${nm}-socials-kit.zip`) },
      { id: "svg", label: "SVG", editable: true, best: "Edit in Figma or Illustrator", size: "3 files + bios", run: () => z(false, `${nm}-socials-kit-svg.zip`) },
    ];
  }
  if (p === "mkt") {
    const ps = posts(c, v), st = posts(c, v, true);
    const imgs = (png: boolean) => [
      ...ps.map((s, i) => ({ name: `${nm}-post-${i + 1}.${png ? "png" : "svg"}`, svg: s, h: 1080, png })),
      ...st.map((s, i) => ({ name: `${nm}-story-${i + 1}-1080x1920.${png ? "png" : "svg"}`, svg: s, h: 1920, png })),
    ];
    const blocks = copyBlocks(c);
    return [
      { id: "png", label: "PNG", group: "Posts & stories", best: "Posts and stories, ready to post", size: "6 images", run: () => zipSvgs(imgs(true), `${nm}-launch-posts.zip`) },
      { id: "svg", label: "SVG", group: "Posts & stories", editable: true, best: "Edit the posts in Figma or Illustrator", size: "6 files", run: () => zipSvgs(imgs(false), `${nm}-launch-posts-svg.zip`) },
      { id: "word", label: "Word", group: "Captions & ads", editable: true, best: "Edit every caption and ad", size: ".docx", run: async () => download(docx(`${c.name} · launch copy`, blocks), `${nm}-launch-copy.docx`) },
      { id: "gdocs", label: "Google Docs", group: "Captions & ads", editable: true, best: "Edit every caption and ad in Google Docs", size: ".docx", help: "In Google Drive: New → File upload, then double-click the file and choose Open with Google Docs.", run: async () => download(docx(`${c.name} · launch copy`, blocks), `${nm}-launch-copy.docx`) },
      { id: "pdf", label: "PDF", group: "Captions & ads", best: "Read and share", size: "A4", run: async () => download(await textPdf(`${c.name} · launch copy`, blocks), `${nm}-launch-copy.pdf`) },
    ];
  }
  if (p === "cards") {
    const cd = { ...c.fd, person: c.me?.name || c.fd.person, email: c.me?.email || c.fd.email };
    return [
      { id: "pdf", label: "PDF print", best: "3 mm bleed + crop marks, any print shop", size: "front + back", run: async () => download(await svgPdf([cardFront(v, "A", cd, { bleed: true, marks: true }), cardBack(v, cd, true, { bleed: true, marks: true })], 97, 67, `${c.name} business cards`), `${nm}-business-cards-print.pdf`) },
      { id: "svg", label: "SVG", editable: true, best: "Edit in Figma or Illustrator", size: "2 files", run: () => zipSvgs([{ name: `${nm}-card-front.svg`, svg: cardFront(v, "A", cd) }, { name: `${nm}-card-back.svg`, svg: cardBack(v, cd, true) }], `${nm}-business-cards-svg.zip`) },
      { id: "png", label: "PNG", best: "Ready to upload to an online printer", size: "2 files", run: () => zipSvgs([{ name: `${nm}-card-front.png`, svg: cardFront(v, "A", cd), h: 1100, png: true }, { name: `${nm}-card-back.png`, svg: cardBack(v, cd, true), h: 1100, png: true }], `${nm}-business-cards-png.zip`) },
    ];
  }
  const sc = scenesOf(c, v as Theme);
  const pptx = async () => download(await deckPptx2(sc, `${c.name} pitch deck`), `${c.name} - Pitch deck.pptx`);
  return [
    { id: "pdf", label: "PDF", best: "Share, print, present", size: "10 slides", run: async () => download(await svgPdf(sc.map((s) => sceneSvg(s, 1600)), 297, 167.0625, `${c.name} pitch deck`), `${c.name} - Pitch deck.pdf`) },
    { id: "pptx", label: "PowerPoint", editable: true, best: "Edit in PowerPoint", size: ".pptx", run: pptx },
    { id: "key", label: "Keynote", editable: true, best: "Opens in Keynote on Mac", size: ".pptx", help: "Double-click the file: Keynote opens it and keeps every text box editable.", run: pptx },
    { id: "gslides", label: "Google Slides", editable: true, best: "Edit the deck in Google Slides", size: ".pptx", help: "In Google Drive: New → File upload, then double-click the file and choose Open with Google Slides.", run: pptx },
  ];
}

/* ═════ G·5 · Your kit: preview all six, logo PNG free, the rest with Pro ═════ */
const DESC: Record<PieceId, string> = { logo: "PNG free", book: "12 pages · PDF", socials: "Profile, banners, bios", mkt: "3 launch posts + stories", cards: "Print PDF", deck: "10 slides · PDF" };
export function KitHub({ c, onOpen, onZip, zipBusy, onBuy }: { c: FlowCtx; onOpen: (p: PieceId) => void; onZip: () => void; zipBusy: boolean; onBuy: () => void }) {
  const [pngBusy, setPngBusy] = useState(false);
  useEffect(() => { c.track("brand_step_seen", { step: "kit" }); c.track("kit_hub_seen", { pro: c.pro }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  const all = () => { c.track("download_clicked", { piece: "kit", format: "zip", is_pro: c.pro }); if (c.pro) onZip(); else c.openPro("kit", { then: onZip }); };
  return (
    <>
      <div className="wr-stage bf-hub fm-kit">
        <div className="hl">
          <p className="wr-kicker">5 of 5 · Your kit</p>
          <h1 className="wr-h ttl">{c.name}'s kit is ready.</h1>
        </div>
        <div className="rows">
          {PIECES.map((p, i) => (
            <div key={p.id} className="row" role="button" tabIndex={0} onClick={() => onOpen(p.id)} onKeyDown={(e) => { if (e.key === "Enter") onOpen(p.id); }}>
              <span className="n mono">{String(i + 1).padStart(2, "0")}</span>
              <span className={"th" + (p.id === "logo" ? " wh" : "")} dangerouslySetInnerHTML={{ __html: thumbOf(p.id, c) }} />
              <span className="tx"><b>{p.label}</b><em>{DESC[p.id]}</em></span>
              {p.id === "logo"
                ? <button className="png mono" disabled={pngBusy} onClick={async (e) => { e.stopPropagation(); setPngBusy(true); try { await logoPng(c); } finally { setPngBusy(false); } }}>{pngBusy ? "…" : "↓ PNG"}</button>
                : <span className="ch">Preview ›</span>}
            </div>
          ))}
        </div>
        <div className="hr">
          <ProCard title={c.pro ? "Download everything" : "Download the whole kit"} sub={c.pro ? "Every piece in its chosen version, in one zip." : `Every file and format, editable. €${c.price} once.`} onSee={all} cta={c.pro ? "↓ Zip" : "See →"}>
            <span className="fm-chips">{["KEY", "PPTX", "SLIDES", "SVG", "EPS", "PDF"].map((x) => <i key={x} className="mono">{x}</i>)}</span>
          </ProCard>
        </div>
      </div>
      <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
        <button className="wr-btn" style={{ maxWidth: 340 }} onClick={all} disabled={zipBusy}>{zipBusy ? "Preparing…" : <>↓ Download my kit {!c.pro && <span className="fm-tag mono">PRO</span>}</>}</button>
        <span className="urow">
          <button className="wr-link" onClick={() => onOpen("book")}>Open the pieces →</button>
          {c.domain && <button className="wr-link" onClick={() => { c.track("domain_buy_clicked", { domain: c.domain, from: "kit" }); onBuy(); }}>Buy {c.domain} ↗</button>}
        </span>
      </div>
    </>
  );
}

/* ═════ the download sheet ═════ */
/** Formats in their groups, in first-seen order ("" = ungrouped). */
const groupsOf = (fs: Format[]): [string, Format[]][] => {
  const m = new Map<string, Format[]>();
  for (const f of fs) { const g = f.group || ""; m.set(g, [...(m.get(g) || []), f]); }
  return [...m.entries()];
};
const ICON: Record<string, string> = { pdf: "PDF", pptx: "PPTX", key: "KEY", gslides: "G", gdocs: "G", word: "DOC", svg: "SVG", png: "PNG", eps: "EPS", pack: "ZIP" };
function DownloadSheet({ c, p, formats, onClose }: { c: FlowCtx; p: PieceId; formats: Format[]; onClose: () => void }) {
  const [f, setF] = useState(formats.find((x) => x.id === c.st.dl[p])?.id || formats[0].id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [opened, setOpened] = useState("");
  const cur = formats.find((x) => x.id === f) || formats[0];
  const v = selOf(p, c);
  const go = async () => {
    if (busy) return;
    setBusy(true); setErr("");
    try {
      const res = await cur.run();
      if (typeof res === "string" && res) setOpened(res);
      c.setDl(p, cur.id);
      c.track("piece_downloaded", { piece: p, version: versionsOf(p)[v], format: cur.id });
      if (p === "logo" && cur.id === "png") c.track("logo_png_downloaded");
      if (!cur.help && !(typeof res === "string" && res)) onClose();
    } catch { setErr("That didn't work. Try again, or pick another format."); }
    setBusy(false);
  };
  return createPortal(
    <div className="bf-sheet" onClick={onClose}>
      <div className="in" onClick={(e) => e.stopPropagation()}>
        <span className="grab" />
        {c.pro && <p className="fm-unl"><span className="fm-ok">✓</span> Pro unlocked</p>}
        <h3>Download the {PIECES.find((x) => x.id === p)!.label.toLowerCase()}.</h3>
        <p className="sub">Version {"ABCD"[v]} · {versionsOf(p)[v]}</p>
        <div className="fmts">
          {groupsOf(formats).map(([g, fs]) => [g ? <p key={"g" + g} className="fg mono">{g}</p> : null, ...fs.map((x) => (
            <button key={x.id} className={x.id === f ? "on" : ""} onClick={() => { setF(x.id); c.track("format_selected", { piece: p, format: x.id }); }}>
              <span className="ic mono">{ICON[x.id] || x.label.slice(0, 3).toUpperCase()}</span>
              <span className="tx"><b>{x.label}{x.editable && <i className="mono">EDITABLE</i>}</b><em>{x.best}</em></span>
              <span className="sz mono">{x.size}</span>
            </button>
          ))])}
        </div>
        {opened ? <p className="help ok">✓ It's in your Google Drive. <a href={opened} target="_blank" rel="noopener">Open it ↗</a></p> : cur.help && <p className="help">{cur.help}</p>}
        {err && <p className="help err">{err}</p>}
        <button className="wr-btn" onClick={go} disabled={busy}>{busy ? "Preparing…" : `↓ Download ${cur.group ? `${cur.group.toLowerCase()} · ` : ""}${cur.label.split(" · ")[0]}`}</button>
        <button className="wr-link" onClick={onClose}>{c.st.dl[p] ? "Done" : "Cancel"}</button>
      </div>
    </div>, document.body);
}

/* ═════ G·6–G·10 · a piece: versions, full preview, one PRO card ═════ */
const TITLE: Record<PieceId, (n: string) => string> = {
  logo: () => "Your logo, every version.", book: (n) => `${n}'s brand book.`, socials: (n) => `${n}, ready for every feed.`,
  mkt: (n) => `Launch ${n}.`, cards: (n) => `Hand out ${n}.`, deck: (n) => `Pitch ${n}.`,
};
// What Pro adds on each piece (only what the files really contain).
const PRO_OF: Record<PieceId, { t: string; s: string; chips: string[] }> = {
  logo: { t: "Every format + the full pack", s: "SVG, PDF, EPS, app icons, favicon. The PNG is free.", chips: ["SVG", "PDF", "EPS", "ZIP"] },
  book: { t: "Download + editable files", s: "Preview is free. Pro downloads the PDF and editable Word and Google Docs.", chips: ["PDF", "WORD", "G DOCS"] },
  socials: { t: "Download the socials kit", s: "Profile picture and covers as PNG and editable SVG, plus bios.", chips: ["PNG", "SVG", "BIOS"] },
  mkt: { t: "Download + ads & stories", s: "Posts and stories as PNG and SVG, every caption, Google and Meta ad copy.", chips: ["PNG", "SVG", "WORD", "PDF"] },
  cards: { t: "Print-ready files", s: "Print PDF with bleed and crop marks, SVG and PNG.", chips: ["PDF", "SVG", "PNG"] },
  deck: { t: "Download + editable slides", s: "PDF, PowerPoint, Keynote and Google Slides.", chips: ["PDF", "PPTX", "KEY", "SLIDES"] },
};
const KIT: PieceId[] = ["book", "socials", "mkt", "cards", "deck"];
export function PiecePage({ c, p, onNext, onHub, extra }: { c: FlowCtx; p: PieceId; onNext: () => void; onHub: () => void; extra?: ReactNode }) {
  const ki = KIT.indexOf(p);
  const vs = versionsOf(p);
  const v = selOf(p, c);
  const [sheet, setSheet] = useState(false);
  const [present, setPresent] = useState(false);
  const [copied, setCopied] = useState("");
  const all = useMemo(() => formatsOf(p, c), [p, c]);
  // Without Pro, the logo's PNG is the free download; everything else opens the Pro sheet.
  const formats = c.pro ? all : all.filter((f) => p === "logo" && f.id === "png");
  const label = PIECES.find((x) => x.id === p)!.label;
  useEffect(() => { c.track("brand_step_seen", { step: "piece", piece: p }); c.track("piece_seen", { piece: p }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [p]);
  const download = () => {
    c.track("download_clicked", { piece: p, format: c.st.dl[p] || "", is_pro: c.pro });
    if (c.pro || p === "logo") { setSheet(true); return; }
    c.openPro("dl:" + p, { title: `Keep ${c.name}'s ${label.toLowerCase()}.`, lead: "Previewing is free. Downloading comes with Pro.", cta: `Unlock and download · €${c.price}`, then: () => setSheet(true) });
  };
  const preview: ReactNode = (() => {
    const f = v as Fam;
    if (p === "logo") return <div className={"pv logo" + (v === 0 || v === 2 ? " wh" : "")}>{sv(logoVariant(c, v, 260))}<p className="fine">Every version comes in the pack, plus the symbol on its own, app icons and a favicon.</p></div>;
    if (p === "socials") { const bs = BANNERS(c.local); return <div className="pv soc">{sv(banner(f, bannerData(c), bs[0].w, bs[0].h))}<div className="avrow"><span className="av">{sv(avatar(f, c.fd, 200))}</span><span><b>Profile picture · {bs[0].label} and {bs[1].label} covers · bios</b><em className="mono">1080 × 1080 · {bs.map((b) => `${b.w} × ${b.h}`).join(" · ")}</em></span></div>{c.kit && <p className="bio"><b>Bio</b> {c.kit.bioShort}</p>}</div>; }
    if (p === "mkt") return <div className="pv mk">{posts(c, f).map((s2, k) => <span key={k}>{sv(s2)}<em className="mono">Day {[1, 3, 7][k]}</em></span>)}{c.kit?.posts?.[0]?.caption && <p className="bio"><b>Launch caption</b> {c.kit.posts[0].caption}</p>}</div>;
    if (p === "cards") { const cd = { ...c.fd, person: c.me?.name || "Your name", email: c.me?.email || c.fd.email }; return <div className="pv cards">{sv(cardFront(f, "A", cd))}{sv(cardBack(f, cd, true))}</div>; }
    if (p === "book") return <div className="pv book">{extra}</div>;
    return <div className="pv deck">{scenesOf(c, v as Theme).map((s2, k) => <span key={k} onClick={() => setPresent(true)}>{sv(sceneSvg(s2, k ? 480 : 960))}</span>)}</div>;
  })();
  const copy = (text: string, what: string) => { void navigator.clipboard?.writeText(text); setCopied(what); setTimeout(() => setCopied(""), 1800); c.track("kit_copy", { block: what }); };
  // The free action of each piece.
  const free = p === "book" ? { l: "Open the preview", f: () => { c.track("piece_preview_opened", { piece: p }); c.bookPreview(); } }
    : p === "socials" && c.kit ? { l: copied === "bios" ? "✓ Copied" : "Copy bios", f: () => copy(`${c.kit!.bioShort}\n\n${c.kit!.bioLong}`, "bios") }
    : p === "mkt" && c.kit ? { l: copied === "captions" ? "✓ Copied" : "Copy captions", f: () => copy(c.kit!.posts.map((x) => `${x.label}\n${x.caption}`).join("\n\n"), "captions") }
    : p === "deck" ? { l: "▶ Present now", f: () => { c.track("deck_present"); c.track("piece_preview_opened", { piece: p }); setPresent(true); } }
    : p === "logo" ? { l: c.pro ? "✎ Personalise" : "✎ Personalise · PRO", f: () => (c.pro ? c.persBtn() : c.openPro("logo")) }
    : null;
  const pro = PRO_OF[p];
  const nextLabel = ki >= 0 && ki < 4 ? `Next: ${PIECES.find((x) => x.id === KIT[ki + 1])!.label.toLowerCase()} →` : p === "deck" ? "Next: all set →" : "Your kit →";
  const dlLabel = <>↓ Download {label.toLowerCase()} {!c.pro && p !== "logo" && <span className="fm-tag mono">PRO</span>}</>;
  return (
    <>
      <div className="wr-stage bf-piece fm-piece">
        <div className="pl">
          <p className="wr-kicker">{ki >= 0 ? `${ki + 1} of 5 · ${label}` : label}</p>
          <h1 className="wr-h ttl">{TITLE[p](c.name)}</h1>
          {p === "logo" ? (
            <div className="vers grid">
              {vs.map((lab, k) => (
                <button key={lab} className={k === v ? "on" : ""} onClick={() => { if (k !== v) { c.setSel(p, k); c.track("version_selected", { piece: p, version: lab, was_default: false }); } }}>
                  <span className={"vt" + (k === 0 || k === 2 ? " wh" : "")} dangerouslySetInnerHTML={{ __html: logoVariant(c, k, 120) }} />
                  {k === v && <span className="ck">✓</span>}
                  <em>{"ABCD"[k]} · {lab}</em>
                </button>
              ))}
            </div>
          ) : (
            <div className="fm-vchips">
              {vs.map((lab, k) => <button key={lab} className={k === v ? "on" : ""} onClick={() => { if (k !== v) { c.setSel(p, k); c.track("version_selected", { piece: p, version: lab, was_default: false }); } }}>{lab}</button>)}
            </div>
          )}
          {p === "cards" && <div className="cardfields">{extra}</div>}
        </div>
        <div className="pm">{preview}</div>
        <div className="pr">
          {c.pro ? (
            <div className="fm-pro on">
              <div className="h"><span className="fm-ok">✓</span><b>Pro · every format</b></div>
              <div className="chips">
                {all.map((x) => <button key={x.id} className={c.st.dl[p] === x.id ? "on" : ""} onClick={() => setSheet(true)}>{x.label.split(" · ")[0]}{x.editable && <i className="mono">EDIT</i>}</button>)}
              </div>
            </div>
          ) : (
            <ProCard title={pro.t} sub={pro.s} onSee={() => c.openPro("piece:" + p, { then: () => setSheet(true) })}>
              <span className="fm-chips">{pro.chips.map((x) => <i key={x} className="mono">{x}</i>)}</span>
            </ProCard>
          )}
        </div>
      </div>
      <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
        {p === "book"
          ? <button className="wr-btn" style={{ maxWidth: 340 }} onClick={free!.f}>Open the preview →</button>
          : <button className="wr-btn" style={{ maxWidth: 340 }} onClick={download}>{p === "logo" && !c.pro ? "↓ Download PNG" : dlLabel}</button>}
        <span className="urow">
          {p === "logo" && <button className="wr-link" onClick={onHub}>← Your kit</button>}
          {p === "book" && <button className="wr-link" onClick={download}>↓ Download{!c.pro && " · PRO"}</button>}
          {free && p !== "book" && <button className="wr-link" onClick={free.f}>{free.l}</button>}
          <button className="wr-link" onClick={p === "logo" ? onHub : onNext}>{nextLabel}</button>
        </span>
      </div>
      {sheet && <DownloadSheet c={c} p={p} formats={formats.length ? formats : all} onClose={() => setSheet(false)} />}
      {present && <Present c={c} onClose={() => setPresent(false)} onDownload={() => { setPresent(false); download(); }} />}
    </>
  );
}

/** ▶ Present now: the deck full screen, free (arrows / swipe / tap). */
function Present({ c, onClose, onDownload }: { c: FlowCtx; onClose: () => void; onDownload: () => void }) {
  const sc = useMemo(() => scenesOf(c, selOf("deck", c) as Theme), [c]);
  const [i, setI] = useState(0);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight" || e.key === " ") setI((x) => Math.min(sc.length - 1, x + 1)); if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1)); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [sc.length, onClose]);
  let x0 = 0;
  return createPortal(
    <div className="fm-present" onTouchStart={(e) => { x0 = e.touches[0].clientX; }} onTouchEnd={(e) => { const d = e.changedTouches[0].clientX - x0; if (d < -40) setI((x) => Math.min(sc.length - 1, x + 1)); if (d > 40) setI((x) => Math.max(0, x - 1)); }}>
      <div className="bar"><button onClick={onClose} aria-label="Close">✕</button><span>{c.name} · Pitch deck</span><span className="mono">{i + 1} / {sc.length}</span></div>
      <div className="sl" onClick={() => setI((x) => Math.min(sc.length - 1, x + 1))}>{sv(sceneSvg(sc[i], 1280))}</div>
      <div className="ft">
        <button className="wr-link" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={!i}>‹ Back</button>
        <button className="wr-btn" style={{ maxWidth: 300 }} onClick={onDownload}>↓ Download deck {!c.pro && <span className="fm-tag mono">PRO</span>}</button>
        <button className="wr-link" onClick={() => setI((x) => Math.min(sc.length - 1, x + 1))} disabled={i >= sc.length - 1}>Next ›</button>
      </div>
    </div>, document.body);
}

/* ═════ 7 · All set ═════ */
export function AllSet({ c, onAgain, onBuy, onZip, onAccount, onChangeDomain, zipBusy }: {
  c: FlowCtx; onAgain: (p: PieceId) => void; onBuy: () => void; onZip: () => void; onAccount: () => void; onChangeDomain: () => void; zipBusy: boolean;
}) {
  useEffect(() => { c.track("all_set_seen"); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  return (
    <>
      <div className="wr-stage bf-all">
        <span className="okbig">✓</span>
        <h1 className="wr-h ttl">{c.name}'s brand is ready.</h1>
        <p className="wr-lead sub">{c.account
          ? <>Saved to your account ({c.account}): come back any time to change a version or download another format.</>
          : <>Sign in to keep it: without an account, closing this page loses your kit.</>}</p>
        <div className="list">
          {PIECES.map((p) => {
            const v = selOf(p.id, c), f = c.st.dl[p.id];
            return (
              <button key={p.id} className="li" onClick={() => onAgain(p.id)}>
                <span className={"th" + (p.id === "logo" && (v === 0 || v === 2) ? " wh" : "")} dangerouslySetInnerHTML={{ __html: thumbOf(p.id, c) }} />
                <span className="tx"><b>{p.label}</b><em className="mono">{f ? "✓ Downloaded" : "Ready"} · {"ABCD"[v]} · {versionsOf(p.id)[v]}</em></span>
                <span className="open">{f ? "Again" : "Open"} ›</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
        {c.domain
          ? <button className="wr-btn" style={{ maxWidth: 340 }} onClick={() => { c.track("domain_buy_clicked", { domain: c.domain }); onBuy(); }}>Last step: buy {c.domain} ↗</button>
          : <button className="wr-btn" style={{ maxWidth: 340 }} onClick={onChangeDomain}>Last step: pick your domain →</button>}
        <span className="urow">
          <button className="wr-link" onClick={onZip} disabled={zipBusy}>{zipBusy ? "Preparing…" : "↓ Everything (.zip)"}</button>
          {c.domain && <button className="wr-link" onClick={onChangeDomain}>Change domain</button>}
          <button className="wr-link" onClick={onAccount}>{c.account ? "Go to my account" : "Sign in to save it"}</button>
        </span>
      </div>
    </>
  );
}

/* ═════ "↓ Everything" — every piece in its chosen version, ready-to-use formats ═════ */
export async function everythingZip(c: FlowCtx, scope: "so_far" | "all"): Promise<void> {
  const nm = slug(c.name);
  const out: { name: string; data: Uint8Array }[] = [];
  const want = (p: PieceId) => scope === "all" || !!c.st.dl[p] || c.st.sel[p] != null;
  const add = async (path: string, svg: string, png?: number) => { const o = await outlineSvg(svg); out.push({ name: `${nm}-brand-kit/${path}`, data: png ? await svgToPng(o, png) : enc.encode(o) }); };
  if (want("logo")) {
    const pack = await buildLogoPack(c.name, c.logo.key, (c.logo.opts?.accent as any) || "dawn", c.logo.opts?.seed || 0,
      [{ name: "Dawn", hex: c.pal.dawn }, { name: "Haze", hex: c.pal.haze }, { name: "Nova", hex: c.pal.nova }, { name: "Night", hex: c.pal.night }], c.logo.opts?.font, c.logo.opts?.shape, c.logo.opts?.custom);
    out.push({ name: `${nm}-brand-kit/1-logo/${pack.filename}`, data: await blobBytes(pack.blob) });
  }
  if (want("book") && c.bookReady) {
    // The book's document version (opens in a browser, Word or Google Docs);
    // the designed PDF still downloads from its own page.
    try { const r = await c.bookHtml(); out.push({ name: `${nm}-brand-kit/2-brand-book/${r.filename}.html`, data: enc.encode(r.html) }); } catch { /* the rest of the kit still ships */ }
  }
  if (want("socials")) {
    const f = selOf("socials", c) as Fam, bd = bannerData(c);
    await add(`3-socials/${nm}-profile-1080.png`, avatar(f, c.fd, 1080), 1080);
    for (const b of BANNERS(c.local)) await add(`3-socials/${nm}-${b.id}.png`, banner(f, bd, b.w, b.h), b.h);
    if (c.kit) out.push({ name: `${nm}-brand-kit/3-socials/bios.txt`, data: enc.encode(`${c.kit.bioShort}\n\n${c.kit.bioLong}\n`) });
  }
  if (want("mkt")) {
    const f = selOf("mkt", c) as Fam;
    const ps = posts(c, f);
    for (let k = 0; k < ps.length; k++) await add(`4-marketing/${nm}-post-${k + 1}.png`, ps[k], 1080);
    out.push({ name: `${nm}-brand-kit/4-marketing/${nm}-launch-copy.docx`, data: await blobBytes(docx(`${c.name} · launch copy`, copyBlocks(c))) });
  }
  if (want("cards")) {
    const f = selOf("cards", c) as Fam, cd = { ...c.fd, person: c.me?.name || c.fd.person, email: c.me?.email || c.fd.email };
    out.push({ name: `${nm}-brand-kit/5-business-cards/${nm}-business-cards-print.pdf`, data: await blobBytes(await svgPdf([cardFront(f, "A", cd, { bleed: true, marks: true }), cardBack(f, cd, true, { bleed: true, marks: true })], 97, 67, `${c.name} business cards`)) });
  }
  if (want("deck")) {
    const sc = scenesOf(c, selOf("deck", c) as Theme);
    out.push({ name: `${nm}-brand-kit/6-pitch-deck/${c.name} - Pitch deck.pdf`, data: await blobBytes(await svgPdf(sc.map((s) => sceneSvg(s, 1600)), 297, 167.0625, `${c.name} pitch deck`)) });
    out.push({ name: `${nm}-brand-kit/6-pitch-deck/${c.name} - Pitch deck.pptx`, data: await blobBytes(await deckPptx2(sc, `${c.name} pitch deck`)) });
  }
  out.push({ name: `${nm}-brand-kit/README.txt`, data: enc.encode(`${c.name} · your brand kit\n\n1-logo: the full logo pack (open the zip)\n2-brand-book: the brand book as a document (opens in a browser, Word or Google Docs)\n3-socials: profile picture, banners, bios\n4-marketing: launch posts and all the copy (Word)\n5-business-cards: print-ready PDF\n6-pitch-deck: PDF and PowerPoint (opens in Keynote and Google Slides)\n\nThe designed brand book PDF downloads from its own page.\n`) });
  download(makeZip(out), `${nm}-brand-kit.zip`);
}
