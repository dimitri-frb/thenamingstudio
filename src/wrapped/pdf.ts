// Real PDF files (vector) from our SVG pages: lettering outlined first, then
// drawn by svg2pdf into jsPDF. Replaces the browser print dialog, which on
// iPhone meant a share sheet, a print preview and a pinch to save.
import { outlineSvg } from "./outline";

export async function svgPdf(pages: string[], wMm: number, hMm: number, title: string): Promise<Blob> {
  const [{ jsPDF }] = await Promise.all([import("jspdf"), import("svg2pdf.js")]);
  const orientation = wMm > hMm ? "landscape" : "portrait";
  const doc = new jsPDF({ unit: "mm", format: [wMm, hMm], orientation, compress: true });
  doc.setProperties({ title, creator: "Name Name" });
  // svg2pdf reads computed styles, so each page is mounted off-screen while drawn.
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-99999px;top:0;width:10px;height:10px;overflow:hidden";
  document.body.appendChild(host);
  try {
    for (let i = 0; i < pages.length; i++) {
      if (i > 0) doc.addPage([wMm, hMm], orientation);
      host.innerHTML = await outlineSvg(pages[i]);
      const el = host.firstElementChild as SVGElement | null;
      if (!el) continue;
      await (doc as any).svg(el, { x: 0, y: 0, width: wMm, height: hMm });
    }
  } finally { host.remove(); }
  return doc.output("blob");
}
