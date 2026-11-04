// Handoff concept-D · the two new paid kits, after the marketing kit:
// 08·b Business cards (front/back, your details, print-ready PDF) and
// 08·p Pitch deck (10 slides in the brand: Google Slides / Keynote / PDF).
// PDFs use the browser's print-to-PDF (like the brand book); the deck also
// exports as a .pptx that Google Slides and Keynote open.
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { logoSvg, svgToPng, type Palette } from "./logos";
import type { KitLogo } from "./kitArt";
import { download, makeZip } from "./zip";
import { svgPdf } from "./pdf";
import { FAM_SHORT, cardBack, cardFront, type Fam, type FamData } from "./families";

// A real PDF file; the print dialog only if the PDF can't be made.
async function savePdf(pages: string[], wMm: number, hMm: number, title: string, pageCss: string) {
  try { download(await svgPdf(pages, wMm, hMm, title), `${title}.pdf`); }
  catch { printPages(title, pageCss, pages); }
}

const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ── print: one portal of pages, its own @page size, then the browser's PDF ── */
function printPages(title: string, pageCss: string, pages: string[], done?: () => void) {
  const host = document.createElement("div");
  host.id = "kitprint";
  host.innerHTML = pages.map((p) => `<div class="kp">${p}</div>`).join("");
  document.body.appendChild(host);
  const st = document.createElement("style");
  st.textContent = `@page { ${pageCss}; margin: 0 }
@media print {
  body * { visibility: hidden !important; }
  #kitprint, #kitprint * { visibility: visible !important; }
  #kitprint { position: absolute !important; left: 0 !important; top: 0 !important; }
  #kitprint .kp { page-break-after: always; break-after: page; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  #kitprint .kp > svg { display: block; width: 100%; height: 100%; }
}
#kitprint { position: fixed; left: -99999px; top: 0; }`;
  document.head.appendChild(st);
  const prev = document.title;
  document.title = title;
  const clean = () => { document.title = prev; host.remove(); st.remove(); window.removeEventListener("afterprint", clean); done?.(); };
  window.addEventListener("afterprint", clean);
  requestAnimationFrame(() => setTimeout(() => window.print(), 80));
}

/* ═════════ 08·b · Business cards ═════════ */
export interface CardDetails { name: string; role: string; email: string; phone: string; web?: string }
type CardStyle = "light" | "dark" | "gradient";

// One card face as SVG in millimetres (85 × 55). bleed adds 3 mm of
// background on every side; marks adds crop marks in a 3 mm margin beyond it.
export function cardSvg(side: "front" | "back", style: CardStyle, d: CardDetails, l: KitLogo, domain0: string, opts: { bleed?: boolean; marks?: boolean } = {}): string {
  const domain = d.web != null ? d.web.trim() : domain0;
  const p: Palette = l.pal;
  const B = opts.bleed ? 3 : 0, M = opts.marks ? 3 : 0, off = B + M;
  const W = 85 + off * 2, H = 55 + off * 2;
  const bg = style === "dark" ? p.night : style === "gradient" ? "url(#cg)" : "#F7F5F1";
  const ink = style === "dark" ? "#ffffff" : p.night;
  const sub = style === "dark" ? "rgba(255,255,255,.62)" : "rgba(0,0,0,.55)";
  const variant = style === "dark" ? "night" : "light";
  const strip = (svg: string) => svg.replace(/<rect width="[^"]+" height="[^"]+" fill="[^"]+"\/>/, "").replace(/<rect width="[^"]+" height="[^"]+" rx="18" fill="url\(#dg\)"\/>/, "");
  const nest = (svg: string, x: number, y: number, w: number, h: number) =>
    strip(svg).replace(/^<svg /, `<svg x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMinYMid meet" `).replace(/ width="[\d.]+" height="[\d.]+">/, ">");
  const logoH = logoSvg(l.key, l.name, p, { ...l.opts, variant, height: 120 });
  const defs = `<defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.dawn}"/><stop offset=".55" stop-color="${p.haze}"/><stop offset="1" stop-color="${p.nova}"/></linearGradient></defs>`;
  const font = `'Inter Tight',-apple-system,Helvetica,Arial,sans-serif`;
  let inner = "";
  if (side === "front") {
    inner += nest(logoH, off + 6, off + 5, 42, 15);
    inner += `<text x="${off + 6}" y="${off + 38}" font-family="${font}" font-size="4.2" font-weight="700" fill="${ink}">${esc(d.name || "Your name")}</text>`;
    inner += `<text x="${off + 6}" y="${off + 43}" font-family="${font}" font-size="2.9" fill="${sub}">${esc(d.role || "Founder")}</text>`;
    const line = [d.email, d.phone, domain].filter(Boolean).join("  ·  ");
    inner += `<text x="${off + 6}" y="${off + 49.5}" font-family="'JetBrains Mono',ui-monospace,monospace" font-size="2.3" fill="${sub}">${esc(line)}</text>`;
  } else {
    inner += nest(logoH, off + 85 / 2 - 22, off + 55 / 2 - 7, 44, 14).replace('preserveAspectRatio="xMinYMid meet"', 'preserveAspectRatio="xMidYMid meet"');
    if (domain) inner += `<text x="${off + 85 / 2}" y="${off + 48}" text-anchor="middle" font-family="'JetBrains Mono',ui-monospace,monospace" font-size="2.4" fill="${sub}">${esc(domain)}</text>`;
  }
  let marks = "";
  if (opts.marks) {
    const k = "#000", lw = 0.15;
    const xs = [off, off + 85], ys = [off, off + 55];
    for (const x of xs) { marks += `<line x1="${x}" y1="0" x2="${x}" y2="${M - 0.5}" stroke="${k}" stroke-width="${lw}"/><line x1="${x}" y1="${H - M + 0.5}" x2="${x}" y2="${H}" stroke="${k}" stroke-width="${lw}"/>`; }
    for (const y of ys) { marks += `<line x1="0" y1="${y}" x2="${M - 0.5}" y2="${y}" stroke="${k}" stroke-width="${lw}"/><line x1="${W - M + 0.5}" y1="${y}" x2="${W}" y2="${y}" stroke="${k}" stroke-width="${lw}"/>`; }
  }
  const radius = opts.bleed ? 0 : 3;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm">${defs}` +
    (opts.marks ? `<rect width="${W}" height="${H}" fill="#fff"/>` : "") +
    `<rect x="${M}" y="${M}" width="${W - M * 2}" height="${H - M * 2}" rx="${radius}" fill="${bg}"/>` + inner + marks + `</svg>`;
}

export function BusinessCards({ l, domain, me, fam, setFam, fd, onBack, onNext, track }: {
  l: KitLogo; domain: string; me: { name?: string; email?: string } | null;
  fam: Fam; setFam: (f: Fam) => void; fd: FamData;
  onBack: () => void; onNext: () => void; track: (ev: string, p?: Record<string, unknown>) => void;
}) {
  const [d, setD] = useState<CardDetails>({ name: me?.name || "", role: "Founder", email: me?.email || "", phone: "", web: domain });
  const [lay, setLay] = useState<"A" | "B">("A");
  const [qr, setQr] = useState(true);
  const [side, setSide] = useState<"front" | "back">("front");
  const cd: FamData = useMemo(() => ({ ...fd, person: d.name, role: d.role, email: [d.email, d.phone].filter(Boolean).join("  ·  "), site: (d.web ?? domain).trim() }), [fd, d, domain]);
  const front = useMemo(() => cardFront(fam, lay, cd), [fam, lay, cd]);
  const back = useMemo(() => cardBack(fam, cd, qr), [fam, cd, qr]);
  const [busy, setBusy] = useState(false);
  const pdf = async () => {
    if (busy) return;
    track("kit_asset_downloaded", { asset: "business_cards_pdf", family: FAM_SHORT[fam], layout: lay, qr });
    setBusy(true);
    await savePdf([cardFront(fam, lay, cd, { bleed: true, marks: true }), cardBack(fam, cd, qr, { bleed: true, marks: true })],
      97, 67, `${l.name} - Business cards`, "size: 97mm 67mm");
    setBusy(false);
  };
  const field = (k: keyof CardDetails, label: string, type = "text", ph = label) => (
    <label className="bcf">
      <span>{label}</span>
      <input type={type} value={d[k] || ""} placeholder={ph} onChange={(e) => setD({ ...d, [k]: e.target.value })} />
      <i aria-hidden>✎</i>
    </label>
  );
  return (
    <>
      <div className="wr-stage wr-bc">
        <div className="bcl">
          <p className="wr-kicker">Business cards</p>
          <h1 className="wr-h ttl">Hand out {l.name}.</h1>
          <div className="bcprev">
            <span className="card" dangerouslySetInnerHTML={{ __html: side === "front" ? front : back }} />
            <button className="bthumb" onClick={() => setSide(side === "front" ? "back" : "front")} aria-label="Flip">
              <span dangerouslySetInnerHTML={{ __html: side === "front" ? back : front }} />
              <em className="mono">{side === "front" ? "Back" : "Front"} · 85 × 55 mm</em>
            </button>
          </div>
          <div className="bcside">
            <button className={side === "front" ? "on" : ""} onClick={() => setSide("front")}>Front</button>
            <button className={side === "back" ? "on" : ""} onClick={() => setSide("back")}>Back</button>
          </div>
        </div>
        <div className="bcr">
          <p className="k mono">Style</p>
          <div className="bcfam">
            {FAM_SHORT.map((t, i) => (
              <button key={t} className={fam === i ? "on" : ""} onClick={() => { if (fam !== i) { setFam(i as Fam); track("family_changed", { family: t, from: "cards" }); } }}
                dangerouslySetInnerHTML={{ __html: cardFront(i as Fam, lay, cd) + `<em>${t}</em>` }} />
            ))}
          </div>
          <div className="bcopts">
            <span className="seg2">{(["A", "B"] as const).map((x) => <button key={x} className={lay === x ? "on" : ""} onClick={() => setLay(x)}>Layout {x}</button>)}</span>
            <label className="qrt"><input type="checkbox" checked={qr} onChange={(e) => setQr(e.target.checked)} /> QR code on the back</label>
          </div>
          <p className="k mono">Your details · tap any line to edit</p>
          {field("name", "Name")}
          {field("role", "Role", "text", "Founder, Owner, Director…")}
          {field("email", "Email", "email")}
          {field("phone", "Phone", "tel", "Optional")}
          {field("web", "Website", "text", "yourname.com")}
          <p className="bchint">{domain ? "Domain not bought yet? Change it here any time, or leave it empty." : "No domain yet? Add one later, or leave it empty."}</p>
          <p className="spec mono">85 × 55 mm · 3 mm bleed · crop marks</p>
        </div>
      </div>
      <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
        <button className="wr-btn" style={{ maxWidth: 340 }} onClick={pdf} disabled={busy}>{busy ? "Preparing your PDF…" : "↓ Download print-ready PDF"}</button>
        <span className="urow">
          <button className="wr-link" onClick={onBack}>← Marketing kit</button>
          <button className="wr-link" onClick={onNext}>Next: pitch deck →</button>
        </span>
      </div>
    </>
  );
}

/* ═════════ 08·p · Pitch deck ═════════ */
export interface DeckInput { name: string; brief: string; concept: string; tagline: string; voice: string[]; domain: string; founder: string }
export interface Slide { n: number; title: string; head: string; points: string[]; hint: string }
export interface AiSlide { title: string; head: string; points: string[]; hint: string }

// The 10 slides: the AI first draft when we have it, the template otherwise
// (and for any slide the draft left empty).
export function deckSlides(x: DeckInput, ai?: AiSlide[] | null): Slide[] {
  const base = templateSlides(x);
  if (!ai || ai.length < 10) return base;
  return base.map((t, i) => {
    const a = ai[i] || ({} as AiSlide);
    return {
      n: t.n, title: a.title || t.title, head: a.head || t.head,
      points: Array.isArray(a.points) && a.points.filter(Boolean).length ? a.points.filter(Boolean).slice(0, 3) : t.points,
      hint: i === 0 ? `Presentation · ${new Date().getFullYear()}` : i === 9 ? "" : a.hint || t.hint,
    };
  });
}
function templateSlides(x: DeckInput): Slide[] {
  const b = x.brief.replace(/\.$/, "");
  const nm = x.name;
  return [
    { n: 1, title: "Cover", head: b ? b[0].toUpperCase() + b.slice(1) + "." : `${nm}.`, points: [x.tagline || ""], hint: `Presentation · ${new Date().getFullYear()}` },
    { n: 2, title: "Problem", head: "What's broken today", points: ["Who has the problem, in one line", "What it costs them (time, money, risk)", "Why today's options fall short"], hint: "One painful, specific story beats three statistics." },
    { n: 3, title: "Solution", head: `${nm}: ${x.concept || "the better way"}`, points: [b ? `${nm} is ${b.replace(/^(a|an|the) /i, (m) => m.toLowerCase())}.` : `What ${nm} does, in one sentence`, "The one thing it does better than anyone", "How it feels to use it"], hint: "Say it the way you'd say it to a customer." },
    { n: 4, title: "Market", head: "Who it's for, and how many", points: ["Your first customers: who, where", "TAM · SAM · SOM (add your numbers)", "Why now: what changed"], hint: "Start narrow: the first 1,000 customers." },
    { n: 5, title: "Product", head: `How ${nm} works`, points: ["Step 1 · …", "Step 2 · …", "Step 3 · …"], hint: "Add 1–2 screenshots or photos." },
    { n: 6, title: "Business model", head: "How we make money", points: ["Price and who pays", "Margin per customer", "How we reach them (channels)"], hint: "One clear revenue line." },
    { n: 7, title: "Traction", head: "Proof it's working", points: ["Users / revenue / waitlist (your numbers)", "Growth per week or month", "A quote from a customer"], hint: "A chart going up and to the right." },
    { n: 8, title: "Team", head: "Why us", points: [x.founder ? `${x.founder} · Founder` : "Founder · role", "Co-founder · role", "Advisors / key hires"], hint: "What makes you the right people for this." },
    { n: 9, title: "The ask", head: "What we're raising", points: ["Amount and instrument", "What it buys: milestones for 18 months", "Use of funds: product · growth · team"], hint: "Be precise." },
    { n: 10, title: "Thank you", head: `${nm}.`, points: [x.tagline || "", [x.domain, x.founder].filter(Boolean).join("  ·  ")], hint: "" },
  ];
}

// A slide as SVG (1600 × 900), in the brand's palette and logo.
export function slideSvg(s: Slide, l: KitLogo, w = 1600): string {
  const p = l.pal, H = Math.round((w * 9) / 16), k = w / 1600;
  const font = `'Inter Tight',-apple-system,Helvetica,Arial,sans-serif`;
  const dark = s.n === 1 || s.n === 10;
  const bg = dark ? p.night : "#F7F5F1", ink = dark ? "#ffffff" : p.night, sub = dark ? "rgba(255,255,255,.65)" : "rgba(0,0,0,.55)";
  const logo = logoSvg(l.key, l.name, p, { ...l.opts, variant: dark ? "night" : "light", height: 120 })
    .replace(/<rect width="[^"]+" height="[^"]+" fill="[^"]+"\/>/, "")
    .replace(/^<svg /, `<svg x="${80 * k}" y="${56 * k}" width="${260 * k}" height="${70 * k}" preserveAspectRatio="xMinYMid meet" `).replace(/ width="[\d.]+" height="[\d.]+">/, ">");
  const wrapText = (t: string, max: number) => { const out: string[] = []; let line = ""; for (const wd of t.split(/\s+/)) { if ((line + " " + wd).trim().length > max) { if (line) out.push(line); line = wd; } else line = (line + " " + wd).trim(); } if (line) out.push(line); return out; };
  let inner = "";
  if (dark) {
    inner += `<circle cx="${1250 * k}" cy="${220 * k}" r="${420 * k}" fill="${p.dawn}" opacity=".18"/><circle cx="${1450 * k}" cy="${700 * k}" r="${360 * k}" fill="${p.nova}" opacity=".16"/>`;
    const L = s.head.length, fs = L <= 60 ? 84 : L <= 110 ? 66 : 54, per = L <= 60 ? 26 : L <= 110 ? 33 : 40;
    let lines = wrapText(s.head, per);
    if (lines.length > 4) { lines = lines.slice(0, 4); lines[3] = lines[3].replace(/[,.;:]?\s*\S*$/, "") + "…"; }
    const lh = fs * 1.1;
    lines.forEach((ln, i) => { inner += `<text x="${80 * k}" y="${(600 - (lines.length - 1) * lh + i * lh) * k}" font-family="${font}" font-size="${fs * k}" font-weight="700" letter-spacing="${-1.6 * k}" fill="${ink}">${esc(ln)}</text>`; });
    s.points.filter(Boolean).forEach((pt, i) => { inner += `<text x="${80 * k}" y="${(720 + i * 46) * k}" font-family="${font}" font-size="${30 * k}" fill="${sub}">${esc(pt)}</text>`; });
    if (s.hint) inner += `<text x="${80 * k}" y="${(820) * k}" font-family="'JetBrains Mono',monospace" font-size="${22 * k}" fill="${sub}">${esc(s.hint)}</text>`;
  } else {
    inner += `<text x="${80 * k}" y="${190 * k}" font-family="'JetBrains Mono',monospace" font-size="${22 * k}" fill="${p.nova}">${String(s.n).padStart(2, "0")} · ${esc(s.title.toUpperCase())}</text>`;
    const long = s.head.length > 40, hfs = long ? 56 : 66, hper = long ? 42 : 34;
    let hl = wrapText(s.head, hper);
    if (hl.length > 2) { hl = hl.slice(0, 2); hl[1] = hl[1].replace(/[,.;:]?\s*\S*$/, "") + "…"; }
    hl.forEach((ln, i) => { inner += `<text x="${80 * k}" y="${(290 + i * hfs * 1.15) * k}" font-family="${font}" font-size="${hfs * k}" font-weight="700" letter-spacing="${-1.4 * k}" fill="${ink}">${esc(ln)}</text>`; });
    const pfs = s.points.some((pt) => pt.length > 58) ? 30 : 36;
    s.points.forEach((pt, i) => {
      const y = (500 + i * 100) * k;
      // a point too long for one line wraps once under itself
      const pl = wrapText(pt, pfs === 30 ? 76 : 62).slice(0, 2);
      inner += `<rect x="${80 * k}" y="${y - pfs * 0.75 * k}" width="${10 * k}" height="${pfs * k}" rx="${3 * k}" fill="${p.dawn}"/>`;
      pl.forEach((ln, j) => { inner += `<text x="${112 * k}" y="${y + j * pfs * 1.2 * k}" font-family="${font}" font-size="${pfs * k}" fill="${/\[[^\]]+\]/.test(ln) ? p.nova : ink}">${esc(ln)}</text>`; });
    });
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${H}" width="${w}" height="${H}"><rect width="${w}" height="${H}" fill="${bg}"/>${inner}${logo}</svg>`;
}

/* ── .pptx: plain OOXML (text + backgrounds), opened by Google Slides and Keynote ── */
export interface DeckLogo { light: Uint8Array; night: Uint8Array; ar: number }
export function deckPptx(slides: Slide[], x: DeckInput, pal: Palette, logo?: DeckLogo | null): Blob {
  const enc = new TextEncoder();
  const hex = (c: string) => c.replace("#", "").slice(0, 6).toUpperCase();
  const EMU = 914400, SW = 12192000, SH = 6858000; // 16:9, 13.333 × 7.5 in
  const files: { name: string; data: Uint8Array }[] = [];
  const add = (name: string, xml: string) => files.push({ name, data: enc.encode(xml) });
  if (logo) { files.push({ name: "ppt/media/logo-light.png", data: logo.light }); files.push({ name: "ppt/media/logo-night.png", data: logo.night }); }
  const lh = EMU * 0.5, lw = Math.min(EMU * 3.2, lh * (logo?.ar || 3));
  const pic = `<p:pic><p:nvPicPr><p:cNvPr id="5" name="Logo"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${Math.round(EMU * 0.6)}" y="${Math.round(EMU * 0.4)}"/><a:ext cx="${Math.round(lw)}" cy="${Math.round(lh)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
  const X = (s: string) => esc(s);
  const sp = (id: number, name: string, x0: number, y0: number, cx: number, cy: number, paras: { t: string; sz: number; b?: boolean; c: string }[]) =>
    `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x0}" y="${y0}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>` +
    `<p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0"><a:normAutofit/></a:bodyPr><a:lstStyle/>` +
    paras.map((p) => `<a:p><a:r><a:rPr lang="en-GB" sz="${p.sz}" b="${p.b ? 1 : 0}" dirty="0"><a:solidFill><a:srgbClr val="${p.c}"/></a:solidFill><a:latin typeface="Inter Tight"/></a:rPr><a:t>${X(p.t)}</a:t></a:r></a:p>`).join("") +
    `</p:txBody></p:sp>`;
  slides.forEach((s, i) => {
    const dark = s.n === 1 || s.n === 10;
    const bg = dark ? hex(pal.night) : "F7F5F1", ink = dark ? "FFFFFF" : hex(pal.night), sub = dark ? "BFBFC8" : "6A6A6A";
    const shapes = [
      logo ? pic : sp(2, "Brand", EMU * 0.6, EMU * 0.45, EMU * 4, EMU * 0.5, [{ t: x.name, sz: 2000, b: true, c: ink }]),
      dark
        ? sp(3, "Title", EMU * 0.6, EMU * 3.4, EMU * 11, EMU * 2, [{ t: s.head, sz: 4800, b: true, c: ink }])
        : sp(3, "Title", EMU * 0.6, EMU * 1.2, EMU * 11.5, EMU * 1.4, [{ t: `${String(s.n).padStart(2, "0")} · ${s.title.toUpperCase()}`, sz: 1400, c: hex(pal.nova) }, { t: s.head, sz: 3600, b: true, c: ink }]),
      sp(4, "Body", EMU * 0.6, dark ? EMU * 5.5 : EMU * 3.0, EMU * 11.5, EMU * 2.8,
        [...s.points.filter(Boolean).map((t) => ({ t: dark ? t : `•  ${t}`, sz: dark ? 1800 : 2200, c: dark ? sub : /\[[^\]]+\]/.test(t) ? hex(pal.nova) : ink })), ...(s.n === 1 && s.hint ? [{ t: s.hint, sz: 1400, c: sub }] : [])]),
    ].join("");
    add(`ppt/slides/slide${i + 1}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="${bg}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${shapes}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`);
    add(`ppt/slides/_rels/slide${i + 1}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>${logo ? `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/logo-${dark ? "night" : "light"}.png"/>` : ""}</Relationships>`);
  });
  const n = slides.length;
  add("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${Array.from({ length: n }, (_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("")}</Types>`);
  add("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`);
  add("ppt/presentation.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${Array.from({ length: n }, (_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 3}"/>`).join("")}</p:sldIdLst><p:sldSz cx="${SW}" cy="${SH}"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`);
  add("ppt/_rels/presentation.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>${Array.from({ length: n }, (_, i) => `<Relationship Id="rId${i + 3}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join("")}</Relationships>`);
  const emptyTree = `<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree>`;
  add("ppt/slideMasters/slideMaster1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg>${emptyTree}</p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`);
  add("ppt/slideMasters/_rels/slideMaster1.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`);
  add("ppt/slideLayouts/slideLayout1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank">${emptyTree}</p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`);
  add("ppt/slideLayouts/_rels/slideLayout1.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`);
  const sc = (n0: string, c: string) => `<a:${n0}><a:srgbClr val="${c}"/></a:${n0}>`;
  add("ppt/theme/theme1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="${X(x.name)}"><a:themeElements><a:clrScheme name="${X(x.name)}"><a:dk1><a:srgbClr val="${hex(pal.night)}"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>${sc("dk2", hex(pal.night))}${sc("lt2", "F7F5F1")}${sc("accent1", hex(pal.dawn))}${sc("accent2", hex(pal.haze))}${sc("accent3", hex(pal.nova))}${sc("accent4", hex(pal.dawn))}${sc("accent5", hex(pal.haze))}${sc("accent6", hex(pal.nova))}${sc("hlink", hex(pal.nova))}${sc("folHlink", hex(pal.haze))}</a:clrScheme><a:fontScheme name="Brand"><a:majorFont><a:latin typeface="Inter Tight"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Inter Tight"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Brand"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`);
  return makeZip(files);
}

export function PitchDeck({ l, input, ai, aiBusy, onBack, onNext, track }: {
  l: KitLogo; input: DeckInput; ai?: AiSlide[] | null; aiBusy?: boolean; onBack: () => void; onNext: () => void; track: (ev: string, p?: Record<string, unknown>) => void;
}) {
  const slides = useMemo(() => deckSlides(input, ai), [input, ai]);
  const [target, setTarget] = useState<"slides" | "keynote" | "pdf">("slides");
  const [view, setView] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const cover = useMemo(() => slideSvg(slides[0], l, 1600), [slides, l]);
  const thumbs = useMemo(() => slides.slice(1).map((s) => slideSvg(s, l, 800)), [slides, l]);
  const [busy, setBusy] = useState(false);
  const pdf = async () => {
    if (busy) return;
    track("kit_asset_downloaded", { asset: "deck_pdf" });
    setBusy(true);
    await savePdf(slides.map((s) => slideSvg(s, l, 1600)), 297, 167.0625, `${l.name} - Pitch deck`, "size: 297mm 167.0625mm");
    setBusy(false);
  };
  const file = async (asset: "deck_slides" | "deck_keynote") => {
    if (busy) return;
    track("kit_asset_downloaded", { asset, drafted: !!ai });
    setBusy(true);
    let logo: DeckLogo | null = null;
    try {
      const lt = logoSvg(l.key, l.name, l.pal, { ...l.opts, variant: "light", height: 120 }).replace(/<rect width="[^"]+" height="[^"]+" fill="[^"]+"\/>/, "");
      const nt = logoSvg(l.key, l.name, l.pal, { ...l.opts, variant: "night", height: 120 }).replace(/<rect width="[^"]+" height="[^"]+" fill="[^"]+"\/>/, "");
      const [light, night] = await Promise.all([svgToPng(lt, 160), svgToPng(nt, 160)]);
      const dv = new DataView(light.buffer, light.byteOffset);
      logo = { light, night, ar: dv.getUint32(16) / Math.max(1, dv.getUint32(20)) };
    } catch { logo = null; }
    download(deckPptx(slides, input, l.pal, logo), `${l.name} - Pitch deck.pptx`);
    setBusy(false);
    setNote(asset === "deck_slides"
      ? "Downloaded. In Google Slides: File → Import slides → Upload, or drop the .pptx into Google Drive and open it."
      : "Downloaded. Double-click the .pptx to open it in Keynote.");
  };
  const open = () => (target === "pdf" ? pdf() : void file(target === "slides" ? "deck_slides" : "deck_keynote"));
  return (
    <>
      <div className="wr-stage wr-deck">
        <div className="dkl">
          <p className="wr-kicker">Pitch deck</p>
          <h1 className="wr-h ttl">Pitch {l.name}.</h1>
          <p className="wr-lead sm">{ai ? <>Drafted for you from your brief, in your brand. Edit anything in Slides or Keynote, and fill in the <span className="dkph">[numbers]</span>.</> : aiBusy ? "Writing your slides from your brief… about 30 seconds." : "10 slides in your brand, with the story from your brief. Fill in your numbers."}</p>
          <button className="dkcover" onClick={() => setView(0)} dangerouslySetInnerHTML={{ __html: cover }} />
        </div>
        <div className="dkr">
          <p className="k mono">The 10 slides</p>
          <div className="dkgrid">
            {slides.slice(1).map((s, i) => (
              <button key={s.n} className="dkth" onClick={() => setView(i + 1)}>
                <span dangerouslySetInnerHTML={{ __html: thumbs[i] }} />
                <em className="mono">{String(s.n).padStart(2, "0")} · {s.title}</em>
              </button>
            ))}
          </div>
          <p className="k mono">Open in</p>
          <div className="dkopen">
            {([["slides", "Google Slides"], ["keynote", "Keynote"], ["pdf", "PDF"]] as const).map(([k, lab]) => (
              <button key={k} className={target === k ? "on" : ""} onClick={() => setTarget(k)}>{lab}</button>
            ))}
          </div>
          {note && <p className="dknote">{note}</p>}
        </div>
      </div>
      <div className="wr-foot col" style={{ gap: 8, alignItems: "center" }}>
        <button className="wr-btn" style={{ maxWidth: 340 }} onClick={open} disabled={busy}>{busy ? "Preparing your deck…" : "Open my deck →"}</button>
        <span className="urow">
          <button className="wr-link" onClick={onBack}>← Business cards</button>
          <button className="wr-link" onClick={pdf}>↓ Download PDF</button>
          <button className="wr-link" onClick={onNext}>Next: domain →</button>
        </span>
      </div>
      {view !== null && createPortal(
        <div className="wr-dkview" onClick={() => setView(null)}>
          <div className="in" onClick={(e) => e.stopPropagation()}>
            <span dangerouslySetInnerHTML={{ __html: slideSvg(slides[view], l, 1600) }} />
            {view > 0 && slides[view].hint && <p className="tip">Tip · {slides[view].hint}</p>}
            <div className="nav">
              <button disabled={view === 0} onClick={() => setView(Math.max(0, view - 1))}>‹</button>
              <span className="mono">{view + 1} / {slides.length}</span>
              <button disabled={view === slides.length - 1} onClick={() => setView(Math.min(slides.length - 1, view + 1))}>›</button>
              <button className="x" onClick={() => setView(null)}>Close</button>
            </div>
          </div>
        </div>, document.body)}
    </>
  );
}
