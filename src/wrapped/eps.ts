// SVG → EPS (vector, for print shops and old design tools). Works on our own
// logo SVGs after text outlining: paths, rects (rounded), circles, ellipses,
// lines, nested <svg>, transforms, solid fills and strokes. Gradients use their
// first stop; opacity is blended toward white (EPS has no transparency).
type M6 = [number, number, number, number, number, number];
const mul = (a: M6, b: M6): M6 => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
const ap = (m: M6, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const f = (v: number) => (Math.round(v * 100) / 100).toString();

function parseTransform(t: string | null): M6 {
  let m: M6 = [1, 0, 0, 1, 0, 0];
  if (!t) return m;
  const re = /(matrix|translate|scale|rotate)\s*\(([^)]*)\)/g;
  let r: RegExpExecArray | null;
  while ((r = re.exec(t))) {
    const a = r[2].split(/[\s,]+/).filter(Boolean).map(Number);
    let n: M6 = [1, 0, 0, 1, 0, 0];
    if (r[1] === "matrix") n = a.slice(0, 6) as M6;
    else if (r[1] === "translate") n = [1, 0, 0, 1, a[0] || 0, a[1] || 0];
    else if (r[1] === "scale") n = [a[0], 0, 0, a[1] ?? a[0], 0, 0];
    else if (r[1] === "rotate") {
      const k = ((a[0] || 0) * Math.PI) / 180, c = Math.cos(k), s = Math.sin(k);
      const rot: M6 = [c, s, -s, c, 0, 0];
      n = a.length >= 3 ? mul(mul([1, 0, 0, 1, a[1], a[2]], rot), [1, 0, 0, 1, -a[1], -a[2]]) : rot;
    }
    m = mul(m, n);
  }
  return m;
}
// Path data → absolute segments: M, L, C, Z (Q/T/S/H/V/A converted).
function pathSegs(d: string): (["M" | "L", number, number] | ["C", number, number, number, number, number, number] | ["Z"])[] {
  const toks = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || [];
  const out: any[] = [];
  let i = 0, cmd = "", x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0, qx = 0, qy = 0, prev = "";
  const n = () => Number(toks[i++]);
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    if (C === "Z") { out.push(["Z"]); x = sx; y = sy; prev = "Z"; continue; }
    if (C === "M") { const nx = n() + (rel ? x : 0), ny = n() + (rel ? y : 0); out.push(["M", nx, ny]); x = sx = nx; y = sy = ny; cmd = rel ? "l" : "L"; prev = "M"; continue; }
    if (C === "L") { x = n() + (rel ? x : 0); y = n() + (rel ? y : 0); out.push(["L", x, y]); }
    else if (C === "H") { x = n() + (rel ? x : 0); out.push(["L", x, y]); }
    else if (C === "V") { y = n() + (rel ? y : 0); out.push(["L", x, y]); }
    else if (C === "C" || C === "S") {
      let x1: number, y1: number;
      if (C === "C") { x1 = n() + (rel ? x : 0); y1 = n() + (rel ? y : 0); } else { x1 = prev === "C" || prev === "S" ? 2 * x - cx : x; y1 = prev === "C" || prev === "S" ? 2 * y - cy : y; }
      const x2 = n() + (rel ? x : 0), y2 = n() + (rel ? y : 0), ex = n() + (rel ? x : 0), ey = n() + (rel ? y : 0);
      out.push(["C", x1, y1, x2, y2, ex, ey]); cx = x2; cy = y2; x = ex; y = ey;
    } else if (C === "Q" || C === "T") {
      let x1: number, y1: number;
      if (C === "Q") { x1 = n() + (rel ? x : 0); y1 = n() + (rel ? y : 0); } else { x1 = prev === "Q" || prev === "T" ? 2 * x - qx : x; y1 = prev === "Q" || prev === "T" ? 2 * y - qy : y; }
      const ex = n() + (rel ? x : 0), ey = n() + (rel ? y : 0);
      out.push(["C", x + (2 / 3) * (x1 - x), y + (2 / 3) * (y1 - y), ex + (2 / 3) * (x1 - ex), ey + (2 / 3) * (y1 - ey), ex, ey]); qx = x1; qy = y1; x = ex; y = ey;
    } else if (C === "A") {
      const rx0 = n(), ry0 = n(), rot = n(), la = n(), sw = n(), ex = n() + (rel ? x : 0), ey = n() + (rel ? y : 0);
      for (const c of arcToCubics(x, y, rx0, ry0, rot, la, sw, ex, ey)) out.push(["C", ...c]);
      x = ex; y = ey;
    } else { i++; continue; }
    prev = C;
  }
  return out;
}
function arcToCubics(x1: number, y1: number, rx: number, ry: number, phiDeg: number, fa: number, fs: number, x2: number, y2: number): [number, number, number, number, number, number][] {
  if (!rx || !ry || (x1 === x2 && y1 === y2)) return [[x1, y1, x2, y2, x2, y2]];
  rx = Math.abs(rx); ry = Math.abs(ry);
  const phi = (phiDeg * Math.PI) / 180, cp = Math.cos(phi), sp = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2, x1p = cp * dx + sp * dy, y1p = -sp * dx + cp * dy;
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const sign = fa === fs ? -1 : 1;
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p, den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const co = sign * Math.sqrt(Math.max(0, num / den));
  const cxp = (co * rx * y1p) / ry, cyp = (-co * ry * x1p) / rx;
  const cx = cp * cxp - sp * cyp + (x1 + x2) / 2, cy = sp * cxp + cp * cyp + (y1 + y2) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
  let t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
  const segs = Math.ceil(Math.abs(dt) / (Math.PI / 2)), step = dt / segs, k = (4 / 3) * Math.tan(step / 4);
  const out: [number, number, number, number, number, number][] = [];
  const pt = (t: number) => [cx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp, cy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp];
  const dv = (t: number) => [-rx * Math.sin(t) * cp - ry * Math.cos(t) * sp, -rx * Math.sin(t) * sp + ry * Math.cos(t) * cp];
  for (let s = 0; s < segs; s++, t1 += step) {
    const t2 = t1 + step, p1 = pt(t1), p2 = pt(t2), d1 = dv(t1), d2 = dv(t2);
    out.push([p1[0] + k * d1[0], p1[1] + k * d1[1], p2[0] - k * d2[0], p2[1] - k * d2[1], p2[0], p2[1]]);
  }
  return out;
}
const ellipsePath = (cx: number, cy: number, rx: number, ry: number) => `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
const rectPath = (x: number, y: number, w: number, h: number, r: number) => {
  r = Math.min(r, w / 2, h / 2);
  return r > 0 ? `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z` : `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
};

export function svgToEps(svg: string, title = "Logo"): string {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  const vb = (root.getAttribute("viewBox") || `0 0 ${root.getAttribute("width") || 100} ${root.getAttribute("height") || 100}`).split(/[\s,]+/).map(Number);
  const [vx, vy, vw, vh] = vb;
  const grads = new Map<string, string>();
  doc.querySelectorAll("linearGradient,radialGradient").forEach((g) => { const s = g.querySelector("stop"); if (g.id && s) grads.set(g.id, s.getAttribute("stop-color") || "#000"); });
  const colour = (v: string | null, op: number): number[] | null => {
    if (!v || v === "none") return null;
    if (v.startsWith("url(")) v = grads.get(v.replace(/url\(#|\)/g, "")) || "#000000";
    let h = v.trim();
    if (h === "white") h = "#ffffff"; if (h === "black") h = "#000000";
    if (h.startsWith("rgb")) { const p = h.match(/[\d.]+/g)!.map(Number); return [p[0], p[1], p[2]].map((c) => 1 - (1 - c / 255) * op); }
    if (!h.startsWith("#")) return null;
    const x = h.length === 4 ? h.slice(1).split("").map((c) => c + c).join("") : h.slice(1, 7);
    return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16) / 255).map((c) => 1 - (1 - c) * op);
  };
  const attr = (el: Element, a: string): string | null => {
    const st = el.getAttribute("style") || "";
    const m = st.match(new RegExp(`(?:^|;)\\s*${a}\\s*:\\s*([^;]+)`));
    return m ? m[1].trim() : el.getAttribute(a);
  };
  let ps = "";
  const emit = (d: string, m: M6, fill: number[] | null, stroke: number[] | null, sw: number, cap: string, join: string, evenodd: boolean) => {
    const segs = pathSegs(d);
    if (!segs.length) return;
    let p = "newpath\n";
    for (const s of segs) {
      if (s[0] === "Z") p += "closepath\n";
      else if (s[0] === "C") { const a = ap(m, s[1], s[2]), b = ap(m, s[3], s[4]), c = ap(m, s[5], s[6]); p += `${f(a[0])} ${f(a[1])} ${f(b[0])} ${f(b[1])} ${f(c[0])} ${f(c[1])} curveto\n`; }
      else { const a = ap(m, s[1], s[2]); p += `${f(a[0])} ${f(a[1])} ${s[0] === "M" ? "moveto" : "lineto"}\n`; }
    }
    const scale = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
    if (fill) ps += p + `${fill.map(f).join(" ")} setrgbcolor ${evenodd ? "eofill" : "fill"}\n`;
    if (stroke) ps += p + `${stroke.map(f).join(" ")} setrgbcolor ${f(sw * scale)} setlinewidth ${cap === "round" ? 1 : cap === "square" ? 2 : 0} setlinecap ${join === "round" ? 1 : join === "bevel" ? 2 : 0} setlinejoin stroke\n`;
  };
  const walk = (el: Element, m: M6, inh: { fill: string; stroke: string | null; sw: number; op: number; cap: string; join: string }) => {
    const tag = el.tagName.toLowerCase();
    if (["defs", "lineargradient", "radialgradient", "clippath", "pattern", "filter", "style", "title", "text"].includes(tag)) return;
    let mm = mul(m, parseTransform(el.getAttribute("transform")));
    if (tag === "svg" && el !== root) {
      const x = Number(el.getAttribute("x") || 0), y = Number(el.getAttribute("y") || 0), w = Number(el.getAttribute("width") || 0), h = Number(el.getAttribute("height") || 0);
      const v = (el.getAttribute("viewBox") || `0 0 ${w} ${h}`).split(/[\s,]+/).map(Number);
      const sc = Math.min(w / v[2], h / v[3]) || 1;
      const ox = x + (w - v[2] * sc) / 2, oy = y + (h - v[3] * sc) / 2;
      mm = mul(mm, [sc, 0, 0, sc, ox - v[0] * sc, oy - v[1] * sc]);
    }
    const op = inh.op * Number(attr(el, "opacity") ?? 1) * Number(attr(el, "fill-opacity") ?? 1);
    const st = { fill: attr(el, "fill") ?? inh.fill, stroke: attr(el, "stroke") ?? inh.stroke, sw: Number(attr(el, "stroke-width") ?? inh.sw), op, cap: attr(el, "stroke-linecap") ?? inh.cap, join: attr(el, "stroke-linejoin") ?? inh.join };
    const fill = colour(st.fill, op), stroke = colour(st.stroke, op);
    const eo = attr(el, "fill-rule") === "evenodd";
    const N = (a: string) => Number(el.getAttribute(a) || 0);
    if (tag === "path") emit(el.getAttribute("d") || "", mm, fill, stroke, st.sw, st.cap, st.join, eo);
    else if (tag === "rect") { if (N("width") < 5000) emit(rectPath(N("x"), N("y"), N("width"), N("height"), N("rx") || N("ry")), mm, fill, stroke, st.sw, st.cap, st.join, eo); }
    else if (tag === "circle") emit(ellipsePath(N("cx"), N("cy"), N("r"), N("r")), mm, fill, stroke, st.sw, st.cap, st.join, eo);
    else if (tag === "ellipse") emit(ellipsePath(N("cx"), N("cy"), N("rx"), N("ry")), mm, fill, stroke, st.sw, st.cap, st.join, eo);
    else if (tag === "line") emit(`M${N("x1")} ${N("y1")}L${N("x2")} ${N("y2")}`, mm, null, stroke, st.sw, st.cap, st.join, false);
    else if (tag === "polygon" || tag === "polyline") { const p = (el.getAttribute("points") || "").trim().split(/[\s,]+/).map(Number); let d = ""; for (let i = 0; i < p.length; i += 2) d += `${i ? "L" : "M"}${p[i]} ${p[i + 1]}`; emit(d + (tag === "polygon" ? "Z" : ""), mm, tag === "polygon" ? fill : null, stroke, st.sw, st.cap, st.join, eo); }
    for (const c of Array.from(el.children)) walk(c, mm, st);
  };
  // SVG y-down → PostScript y-up, origin at the viewBox's corner
  const base: M6 = [1, 0, 0, -1, -vx, vh + vy];
  walk(root, base, { fill: "#000000", stroke: null, sw: 1, op: 1, cap: "butt", join: "miter" });
  const W = Math.ceil(vw), H = Math.ceil(vh);
  return `%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 ${W} ${H}\n%%HiResBoundingBox: 0 0 ${f(vw)} ${f(vh)}\n%%Title: ${title.replace(/[()\\]/g, "")}\n%%Creator: Name Name\n%%LanguageLevel: 2\n%%EndComments\ngsave\n${ps}grestore\nshowpage\n%%EOF\n`;
}
