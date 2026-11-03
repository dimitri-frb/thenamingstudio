// Handoff 28 · the brand flow after the paywall: one hub, six pieces done in
// order (Logo · Brand book · Socials kit · Marketing kit · Business cards ·
// Pitch deck), each "pick a version → see what you get → pick a format",
// a download sheet (bottom sheet on phones, dialog on desktop), then All set.
// Visuals come from the families engine (handoff 27).
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { buildLogoPack, logoSvg, svgToPng, type Palette } from "./logos";
import { outlineSvg } from "./outline";
import { svgPdf } from "./pdf";
import { download, makeZip } from "./zip";
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
  st: FlowState; setSel: (p: PieceId, v: number) => void; setDl: (p: PieceId, f: string) => void;
  bookReady: boolean; bookPdf: () => void; bookWord: () => Promise<void>; bookPreview: () => void;
  persBtn: () => void; track: (ev: string, p?: Record<string, unknown>) => void;
}
const LOGO_V = ["Primary", "Reversed", "Mono", "On colour"];
const BOOK_V = ["Standard"]; // Night / Editorial / Colour arrive with the book redesign
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
  return logoSvg(c.logo.key, c.name, c.pal, { ...c.logo.opts, variant, height: h });
}
function posts(c: FlowCtx, f: Fam, story = false): string[] {
  const ps = c.kit?.posts?.length ? c.kit.posts : [{ title: `Something new is coming: ${c.name}.`, label: "Day 1" }, { title: `${c.name} is here.`, label: "Day 3" }, { title: c.fd.tagline || `Why we started ${c.name}.`, label: "Day 7" }];
  return ps.slice(0, 3).map((p, i) => post(f, c.fd, p.title, dayOf(p.label || "", i), 1080, story ? 1920 : 1080));
}
const bannerData = (c: FlowCtx) => ({ ...c.fd, tagline: c.fd.tagline || c.kit?.bioShort?.replace(/\s*\S+\.\S+\s*$/, "") || c.name });
export function thumbOf(p: PieceId, c: FlowCtx): string {
  const v = selOf(p, c) as Fam;
  if (p === "logo") return logoVariant(c, v, 80);
  if (p === "book") return logoSvg(c.logo.key, c.name, c.pal, { ...c.logo.opts, variant: "night", height: 80 });
  if (p === "socials") return avatar(v, c.fd, 200);
  if (p === "mkt") return posts(c, v)[1] || avatar(v, c.fd, 200);
  if (p === "cards") return cardFront(v, "A", { ...c.fd, person: c.me?.name || "Your name" });
  return sceneSvg(scenesOf(c, v as Theme)[0], 480);
}

/* ── formats: what each piece downloads as ── */
export interface Format { id: string; label: string; editable?: boolean; best: string; size: string; help?: string; run: () => Promise<void> }
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
    ...k.weeks.map((w, i) => ({ h: `Week ${i + 1} · ${w.title}`, p: `${w.line}\nChannels: ${w.channels.join(", ")}` })),
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
      { id: "svg", label: "SVG", editable: true, best: "Edit in Figma, Illustrator, Canva", size: "1 file", run: async () => { download(new Blob([await outlineSvg(svg())], { type: "image/svg+xml" }), `${nm}-logo-${slug(LOGO_V[v])}.svg`); } },
      { id: "png", label: "PNG", best: "Website, social, documents", size: "2000 px", run: async () => { download(new Blob([(await svgToPng(svg(), 2000)) as Uint8Array<ArrayBuffer>], { type: "image/png" }), `${nm}-logo-${slug(LOGO_V[v])}.png`); } },
      { id: "pdf", label: "PDF", best: "Send to a printer", size: "vector", run: async () => {
        const s = svg(); const m = s.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/); const ar = m ? Number(m[1]) / Number(m[2]) : 2;
        download(await svgPdf([s], 120, 120 / ar, `${c.name} logo`), `${nm}-logo-${slug(LOGO_V[v])}.pdf`);
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
    { id: "pdf", label: "PDF", best: "Share, print, present", size: "14 pages", run: async () => c.bookPdf() },
    { id: "word", label: "Word", editable: true, best: "Edit the text in Word, Pages or Google Docs", size: ".doc", help: "Google Docs: upload the file to Google Drive, then Open with Google Docs.", run: () => c.bookWord() },
  ];
  if (p === "socials") {
    const bd = bannerData(c);
    const files = (png: boolean) => [
      { name: `${nm}-profile-1080.${png ? "png" : "svg"}`, svg: avatar(v, c.fd, 1080), h: 1080, png },
      { name: `${nm}-linkedin-banner-1584x396.${png ? "png" : "svg"}`, svg: banner(v, bd, 1584, 396), h: 396, png },
      { name: `${nm}-x-banner-1500x500.${png ? "png" : "svg"}`, svg: banner(v, bd, 1500, 500), h: 500, png },
    ];
    const bios = c.kit ? [{ name: "bios.txt", data: enc.encode(`SHORT (Instagram · TikTok · X)\n${c.kit.bioShort}\n\nLONG (LinkedIn)\n${c.kit.bioLong}\n`) }] : [];
    const z = async (png: boolean, zn: string) => {
      const out: { name: string; data: Uint8Array }[] = [...bios];
      for (const f of files(png)) { const o = await outlineSvg(f.svg); out.push({ name: f.name, data: png ? await svgToPng(o, f.h) : enc.encode(o) }); }
      download(makeZip(out), zn);
    };
    return [
      { id: "png", label: "PNG", best: "Upload straight to each network", size: "3 images + bios", run: () => z(true, `${nm}-socials-kit.zip`) },
      { id: "svg", label: "SVG", editable: true, best: "Edit in Figma or Illustrator", size: "3 files + bios", run: () => z(false, `${nm}-socials-kit-svg.zip`) },
      { id: "canva", label: "Canva", editable: true, best: "Edit online in Canva", size: "upload-ready", help: "In Canva: Create a design → Uploads → upload these files, then drag them onto your design.", run: () => z(false, `${nm}-socials-kit-for-canva.zip`) },
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
      { id: "png", label: "PNG", best: "Posts and stories, ready to post", size: "6 images", run: () => zipSvgs(imgs(true), `${nm}-launch-posts.zip`) },
      { id: "svg", label: "SVG", editable: true, best: "Edit the posts in Figma or Illustrator", size: "6 files", run: () => zipSvgs(imgs(false), `${nm}-launch-posts-svg.zip`) },
      { id: "canva", label: "Canva", editable: true, best: "Edit the posts online in Canva", size: "upload-ready", help: "In Canva: Create a design → Uploads → upload these files.", run: () => zipSvgs(imgs(false), `${nm}-launch-posts-for-canva.zip`) },
      { id: "word", label: "Word · captions, ads, plan", editable: true, best: "Edit every caption, ad and the 3-week plan", size: ".docx", run: async () => download(docx(`${c.name} · launch copy`, blocks), `${nm}-launch-copy.docx`) },
      { id: "gdocs", label: "Google Docs · captions, ads, plan", editable: true, best: "The same copy, in Google Docs", size: ".docx", help: "Upload the file to Google Drive, then Open with Google Docs.", run: async () => download(docx(`${c.name} · launch copy`, blocks), `${nm}-launch-copy.docx`) },
      { id: "pdf", label: "PDF · captions, ads, plan", best: "Read and share", size: "A4", run: async () => download(await textPdf(`${c.name} · launch copy`, blocks), `${nm}-launch-copy.pdf`) },
    ];
  }
  if (p === "cards") {
    const cd = { ...c.fd, person: c.me?.name || c.fd.person, email: c.me?.email || c.fd.email };
    return [
      { id: "pdf", label: "PDF print", best: "3 mm bleed + crop marks, any print shop", size: "front + back", run: async () => download(await svgPdf([cardFront(v, "A", cd, { bleed: true, marks: true }), cardBack(v, cd, true, { bleed: true, marks: true })], 97, 67, `${c.name} business cards`), `${nm}-business-cards-print.pdf`) },
      { id: "svg", label: "SVG", editable: true, best: "Edit in Figma or Illustrator", size: "2 files", run: () => zipSvgs([{ name: `${nm}-card-front.svg`, svg: cardFront(v, "A", cd) }, { name: `${nm}-card-back.svg`, svg: cardBack(v, cd, true) }], `${nm}-business-cards-svg.zip`) },
      { id: "canva", label: "Canva", editable: true, best: "Edit online in Canva", size: "upload-ready", help: "In Canva: create a Business card design → Uploads → upload both files.", run: () => zipSvgs([{ name: `${nm}-card-front.svg`, svg: cardFront(v, "A", cd) }, { name: `${nm}-card-back.svg`, svg: cardBack(v, cd, true) }], `${nm}-business-cards-for-canva.zip`) },
      { id: "png", label: "PNG", best: "Ready to upload to an online printer", size: "2 files", run: () => zipSvgs([{ name: `${nm}-card-front.png`, svg: cardFront(v, "A", cd), h: 1100, png: true }, { name: `${nm}-card-back.png`, svg: cardBack(v, cd, true), h: 1100, png: true }], `${nm}-business-cards-png.zip`) },
    ];
  }
  const sc = scenesOf(c, v as Theme);
  const pptx = async () => download(await deckPptx2(sc, `${c.name} pitch deck`), `${c.name} - Pitch deck.pptx`);
  return [
    { id: "pdf", label: "PDF", best: "Share, print, present", size: "10 slides", run: async () => download(await svgPdf(sc.map((s) => sceneSvg(s, 1600)), 297, 167.0625, `${c.name} pitch deck`), `${c.name} - Pitch deck.pdf`) },
    { id: "pptx", label: "PowerPoint", editable: true, best: "Edit in PowerPoint", size: ".pptx", run: pptx },
    { id: "key", label: "Keynote", editable: true, best: "Opens in Keynote on Mac", size: ".pptx", help: "Double-click the file: Keynote opens it and keeps every text box editable.", run: pptx },
    { id: "gslides", label: "Google Slides", editable: true, best: "Edit in your Google Drive", size: ".pptx", help: "In Google Slides: File → Import slides → Upload, or drop the file into Google Drive and open it.", run: pptx },
  ];
}

/* ═════ K · the hub ═════ */
export function KitHub({ c, onOpen, onZip, zipBusy }: { c: FlowCtx; onOpen: (p: PieceId) => void; onZip: () => void; zipBusy: boolean }) {
  const done = PIECES.filter((p) => c.st.dl[p.id]).length;
  const next = PIECES.find((p) => !c.st.dl[p.id]) || PIECES[PIECES.length - 1];
  useEffect(() => { c.track("kit_hub_seen", { done_count: done }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  return (
    <>
      <div className="wr-stage bf-hub">
        <div className="hl">
          <p className="wr-kicker">Your brand kit</p>
          <h1 className="wr-h ttl">{c.name}'s brand, piece by piece.</h1>
          <p className="wr-lead sub">Pick a version of each, then download it in the format you need.</p>
          <div className="prog"><span><i style={{ width: `${(done / 6) * 100}%` }} /></span><em className="mono">{done} of 6</em></div>
        </div>
        <div className="rows">
          {PIECES.map((p, i) => {
            const isDone = !!c.st.dl[p.id], isNext = p.id === next.id && !isDone;
            const sel = c.st.sel[p.id];
            return (
              <button key={p.id} className={"row" + (isNext ? " next" : "") + (isDone ? " done" : "")} onClick={() => onOpen(p.id)}>
                <span className="n mono">{i + 1}</span>
                <span className={"th" + (p.id === "logo" && (selOf("logo", c) === 0 || selOf("logo", c) === 2) ? " wh" : "")} dangerouslySetInnerHTML={{ __html: thumbOf(p.id, c) }} />
                <span className="tx"><b>{p.label}</b><em>{sel != null || isDone ? `Version ${"ABCD"[selOf(p.id, c)]} · ${versionsOf(p.id)[selOf(p.id, c)]}` : "Choose a version"}</em></span>
                {isDone ? <span className="ok">✓</span> : isNext ? <span className="go">Next →</span> : <span className="ch">›</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
        <button className="wr-btn" style={{ maxWidth: 340 }} onClick={() => onOpen(next.id)}>{done >= 6 ? "See it all →" : `Continue: ${next.label} →`}</button>
        <button className="wr-link" onClick={onZip} disabled={zipBusy}>{zipBusy ? "Preparing…" : "↓ Everything so far (.zip)"}</button>
      </div>
    </>
  );
}

/* ═════ the download sheet ═════ */
function DownloadSheet({ c, p, formats, onClose }: { c: FlowCtx; p: PieceId; formats: Format[]; onClose: () => void }) {
  const [f, setF] = useState(formats.find((x) => x.id === c.st.dl[p])?.id || formats[0].id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const cur = formats.find((x) => x.id === f) || formats[0];
  const v = selOf(p, c);
  const go = async () => {
    if (busy) return;
    setBusy(true); setErr("");
    try {
      await cur.run();
      c.setDl(p, cur.id);
      c.track("piece_downloaded", { piece: p, version: versionsOf(p)[v], format: cur.id });
      if (!cur.help) onClose();
    } catch { setErr("That didn't work. Try again, or pick another format."); }
    setBusy(false);
  };
  return createPortal(
    <div className="bf-sheet" onClick={onClose}>
      <div className="in" onClick={(e) => e.stopPropagation()}>
        <span className="grab" />
        <h3>Download {PIECES.find((x) => x.id === p)!.label.toLowerCase()}</h3>
        <p className="sub">Version {"ABCD"[v]} · {versionsOf(p)[v]}</p>
        <div className="fmts">
          {formats.map((x) => (
            <button key={x.id} className={x.id === f ? "on" : ""} onClick={() => { setF(x.id); c.track("format_selected", { piece: p, format: x.id }); }}>
              <span className="ic mono">{x.label.split(" ")[0].slice(0, 4).toUpperCase()}</span>
              <span className="tx"><b>{x.label}{x.editable && <i className="mono">EDITABLE</i>}</b><em>{x.best}</em></span>
              <span className="sz mono">{x.size}</span>
            </button>
          ))}
        </div>
        {cur.help && <p className="help">{cur.help}</p>}
        {err && <p className="help err">{err}</p>}
        <button className="wr-btn" onClick={go} disabled={busy}>{busy ? "Preparing…" : `↓ Download ${cur.label.split(" · ")[0]}`}</button>
        <button className="wr-link" onClick={onClose}>{c.st.dl[p] ? "Done" : "Cancel"}</button>
      </div>
    </div>, document.body);
}

/* ═════ 1–6 · a piece ═════ */
const KICK: Record<PieceId, string> = { logo: "Pick your main logo.", book: "Choose a style for your book.", socials: "Pick a look for your profiles.", mkt: "Pick a style for your launch.", cards: "Pick a card, add your details.", deck: "Pick a look for your deck." };
export function PiecePage({ c, p, onNext, onHub, extra }: { c: FlowCtx; p: PieceId; onNext: () => void; onHub: () => void; extra?: ReactNode }) {
  const i = PIECES.findIndex((x) => x.id === p);
  const vs = versionsOf(p);
  const v = selOf(p, c);
  const [sheet, setSheet] = useState(false);
  const formats = useMemo(() => formatsOf(p, c), [p, c]);
  useEffect(() => { c.track("piece_seen", { piece: p }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [p]);
  const vthumb = (k: number): string => {
    if (p === "logo") return logoVariant(c, k, 120);
    if (p === "socials") return banner(k as Fam, bannerData(c), 1584, 396);
    if (p === "mkt") return posts(c, k as Fam)[0];
    if (p === "cards") return cardFront(k as Fam, "A", { ...c.fd, person: c.me?.name || "Your name" });
    if (p === "book") return logoSvg(c.logo.key, c.name, c.pal, { ...c.logo.opts, variant: "night", height: 120 });
    return sceneSvg(scenesOf(c, k as Theme)[0], 480);
  };
  const grid = p === "logo" || p === "cards";
  const preview: ReactNode = (() => {
    const f = v as Fam;
    if (p === "logo") return <div className={"pv logo" + (v === 0 || v === 2 ? " wh" : "")}>{sv(logoVariant(c, v, 260))}<p className="fine">Every version comes in the pack, plus the symbol on its own, app icons and a favicon.</p></div>;
    if (p === "socials") return <div className="pv soc">{sv(banner(f, bannerData(c), 1584, 396))}<div className="avrow"><span className="av">{sv(avatar(f, c.fd, 200))}</span><span><b>Profile picture · LinkedIn and X banners · bios</b><em className="mono">1080 × 1080 · 1584 × 396 · 1500 × 500</em></span></div></div>;
    if (p === "mkt") return <div className="pv mk">{posts(c, f).map((s, k) => <span key={k}>{sv(s)}<em className="mono">Day {[1, 3, 7][k]}</em></span>)}</div>;
    if (p === "cards") { const cd = { ...c.fd, person: c.me?.name || "Your name", email: c.me?.email || c.fd.email }; return <div className="pv cards">{sv(cardFront(f, "A", cd))}{sv(cardBack(f, cd, true))}</div>; }
    if (p === "book") return <div className="pv book">{extra}</div>;
    return <div className="pv deck">{scenesOf(c, v as Theme).map((s, k) => <span key={k}>{sv(sceneSvg(s, k ? 480 : 960))}</span>)}</div>;
  })();
  const secondary = p === "logo" ? { l: "✎ Personalise", f: c.persBtn }
    : p === "book" ? { l: "Preview", f: c.bookPreview }
    : p === "socials" ? { l: "Copy bios", f: () => { if (c.kit) void navigator.clipboard?.writeText(`${c.kit.bioShort}\n\n${c.kit.bioLong}`); c.track("kit_copy", { block: "bios" }); } }
    : p === "mkt" ? { l: "Copy captions", f: () => { if (c.kit) void navigator.clipboard?.writeText(c.kit.posts.map((x) => `${x.label}\n${x.caption}`).join("\n\n")); c.track("kit_copy", { block: "captions" }); } }
    : p === "cards" ? null
    : { l: "Present now", f: () => { c.track("deck_present"); void formats[0].run(); } };
  const nextLabel = i < 5 ? `Next: ${PIECES[i + 1].label.toLowerCase()} →` : "Next: all set →";
  return (
    <>
      <div className="wr-stage bf-piece">
        <div className="pl">
          <p className="wr-kicker">{i + 1} of 6 · {PIECES[i].label}</p>
          <h1 className="wr-h ttl">{KICK[p]}</h1>
          <p className="lbl mono">Versions</p>
          <div className={"vers" + (grid ? " grid" : "") + (p === "socials" ? " wide" : "") + (p === "deck" ? " deckv" : "")}>
            {vs.map((label, k) => (
              <button key={label} className={k === v ? "on" : ""} onClick={() => { if (k !== v) { c.setSel(p, k); c.track("version_selected", { piece: p, version: label, was_default: false }); } }}>
                <span className={"vt" + (p === "logo" && (k === 0 || k === 2) ? " wh" : "")} dangerouslySetInnerHTML={{ __html: vthumb(k) }} />
                {k === v && <span className="ck">✓</span>}
                <em>{"ABCD"[k]} · {label}</em>
              </button>
            ))}
          </div>
          {vs.length === 1 && <p className="fine soon">More styles for this piece are on the way.</p>}
        </div>
        <div className="pm">
          <p className="lbl mono">Version {"ABCD"[v]} · what you get</p>
          {preview}
        </div>
        <div className="pr">
          <p className="lbl mono">Formats</p>
          <div className="chips">
            {formats.map((x) => <button key={x.id} className={c.st.dl[p] === x.id ? "on" : ""} onClick={() => setSheet(true)}>{x.label.split(" · ")[0]}{x.editable && <i className="mono">EDIT</i>}</button>)}
          </div>
          {p === "cards" && <div className="cardfields">{extra}</div>}
        </div>
      </div>
      <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
        <button className="wr-btn" style={{ maxWidth: 340 }} onClick={() => setSheet(true)}>↓ Download {PIECES[i].label.toLowerCase()}</button>
        <span className="urow">
          <button className="wr-link" onClick={onHub}>← Your kit</button>
          {secondary && <button className="wr-link" onClick={secondary.f}>{secondary.l}</button>}
          <button className="wr-link" onClick={onNext}>{nextLabel}</button>
        </span>
      </div>
      {sheet && <DownloadSheet c={c} p={p} formats={formats} onClose={() => setSheet(false)} />}
    </>
  );
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
        <p className="wr-lead sub">Change a version or download another format whenever you like. It's all in your account.</p>
        <div className="list">
          {PIECES.map((p) => {
            const v = selOf(p.id, c), f = c.st.dl[p.id];
            return (
              <div key={p.id} className="li">
                <i className={f ? "ok" : "todo"}>{f ? "✓" : "·"}</i>
                <span><b>{p.label}</b><em className="mono">{"ABCD"[v]} · {versionsOf(p.id)[v]}{f ? ` · ${formatsOf(p.id, c).find((x) => x.id === f)?.label.split(" · ")[0] || f}` : " · not downloaded yet"}</em></span>
                <button className="wr-link" onClick={() => onAgain(p.id)}>{f ? "↓ Again" : "Open"}</button>
              </div>
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
          <button className="wr-link" onClick={onAccount}>Go to my account</button>
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
  if (want("socials")) {
    const f = selOf("socials", c) as Fam, bd = bannerData(c);
    await add(`3-socials/${nm}-profile-1080.png`, avatar(f, c.fd, 1080), 1080);
    await add(`3-socials/${nm}-linkedin-banner.png`, banner(f, bd, 1584, 396), 396);
    await add(`3-socials/${nm}-x-banner.png`, banner(f, bd, 1500, 500), 500);
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
  out.push({ name: `${nm}-brand-kit/README.txt`, data: enc.encode(`${c.name} · your brand kit\n\n1-logo: the full logo pack (open the zip)\n3-socials: profile picture, banners, bios\n4-marketing: launch posts and all the copy (Word)\n5-business-cards: print-ready PDF\n6-pitch-deck: PDF and PowerPoint (opens in Keynote and Google Slides)\n\nThe brand book downloads from its own page (PDF or Word).\n`) });
  download(makeZip(out), `${nm}-brand-kit.zip`);
}
