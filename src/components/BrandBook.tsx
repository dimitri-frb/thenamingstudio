import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { naming, type Brief, type BrandBook as BrandBookData } from "../lib/namingApi";

// The starter brand book — generated from the brief + the chosen name. v1:
// story & voice, colour & type, a messaging kit (copyable), a typographic
// wordmark, and "Save as PDF". AI logos come later.

const PAIRINGS: Record<string, { label: string; heading: string; body: string; hName: string; bName: string }> = {
  editorial: { label: "Editorial", heading: "'Fraunces', Georgia, serif", body: "'Inter', system-ui, sans-serif", hName: "Fraunces", bName: "Inter" },
  modern: { label: "Modern", heading: "'Space Grotesk', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif", hName: "Space Grotesk", bName: "Inter" },
  classic: { label: "Classic", heading: "'Playfair Display', Georgia, serif", body: "'Source Sans 3', system-ui, sans-serif", hName: "Playfair Display", bName: "Source Sans 3" },
  friendly: { label: "Friendly", heading: "'Poppins', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif", hName: "Poppins", bName: "Inter" },
  warm: { label: "Warm", heading: "'Instrument Serif', Georgia, serif", body: "'Geist', system-ui, sans-serif", hName: "Instrument Serif", bName: "Geist" },
};
const FONT_HREF = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Space+Grotesk:wght@500;700&family=Playfair+Display:wght@500;700&family=Source+Sans+3:wght@400;600&family=Poppins:wght@500;600&family=Inter:wght@400;500;600&display=swap";

export function BrandBook({ brief, name, onClose }: { brief: Brief; name: string; onClose: () => void }) {
  const [bb, setBb] = useState<BrandBookData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!document.getElementById("bb-fonts")) {
      const l = document.createElement("link");
      l.id = "bb-fonts"; l.rel = "stylesheet"; l.href = FONT_HREF;
      document.head.appendChild(l);
    }
    let alive = true;
    naming.brandbook(brief, name).then((d) => alive && setBb(d)).catch(() => alive && setError(true));
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div className="brandbook fixed inset-0 z-[60] overflow-y-auto bg-[var(--page)]">
      {/* top bar */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-ink/10 bg-[var(--page)]/90 px-5 py-4 backdrop-blur">
        <button onClick={onClose} className="text-sm text-ink/55 transition hover:text-ink">← Back to your name</button>
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink/45">Brand book · {name}</span>
        <button onClick={() => window.print()} disabled={!bb}
          className="rounded-lg bg-ink px-4 py-2 font-serif text-sm italic text-[var(--page)] transition hover:opacity-90 disabled:opacity-30">Save as PDF</button>
      </div>

      {!bb ? (
        error ? (
          <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
            <p className="font-serif text-2xl italic">We couldn't compose the brand book.</p>
            <button onClick={onClose} className="rounded-xl bg-accent px-5 py-2.5 font-serif italic text-white">← Back</button>
          </div>
        ) : (
          <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-ink/15 border-t-accent" />
            <p className="font-serif text-2xl italic">Composing your brand book…</p>
            <p className="text-sm text-ink/40">Drawing on everything you told us.</p>
          </div>
        )
      ) : (
        <Book bb={bb} name={name} />
      )}
    </div>,
    document.body,
  );
}

function Book({ bb, name }: { bb: BrandBookData; name: string }) {
  const pair = PAIRINGS[bb.fontKey] || PAIRINGS.editorial;
  const roleHex = (re: RegExp, fallback: string) => bb.palette.find((p) => re.test(p.role))?.hex || fallback;
  const primary = roleHex(/primary/i, bb.palette[1]?.hex || "#C9774E");
  const ink = roleHex(/ink/i, "#1F1B18");

  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-12 sm:px-10">
      {/* cover */}
      <section>
        <span className="grid h-12 w-12 place-items-center rounded-xl text-white" style={{ background: primary }}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 4.5v15M5.5 8.25l13 7.5M18.5 8.25l-13 7.5" /></svg>
        </span>
        <h1 className="mt-6 text-6xl leading-[0.95] sm:text-7xl" style={{ fontFamily: pair.heading, color: ink }}>{name}</h1>
        <p className="mt-5 max-w-xl text-xl text-ink/65" style={{ fontFamily: pair.body }}>{bb.tagline}</p>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-accent">{bb.essence}</p>
      </section>

      <Rule />

      {/* story */}
      <Section label="The story">
        <p className="text-lg leading-relaxed text-ink/75" style={{ fontFamily: pair.body }}>{bb.story}</p>
        <p className="mt-4 border-l-2 border-accent/40 pl-4 font-serif text-base italic text-ink/55">{bb.whyName}</p>
      </Section>

      {/* voice */}
      <Section label="Personality & voice">
        <div className="flex flex-wrap gap-2">
          {bb.voice.adjectives.map((w) => (
            <span key={w} className="rounded-full border border-ink/15 bg-[var(--surface-solid)] px-3 py-1 font-serif text-base italic">{w}</span>
          ))}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <DoList title="Do" tone="do" items={bb.voice.dos} />
          <DoList title="Don't" tone="dont" items={bb.voice.donts} />
        </div>
        <p className="mt-6 rounded-2xl bg-[var(--surface-solid)] p-5 font-serif text-xl italic leading-snug text-ink/75">“{bb.voice.sample}”</p>
      </Section>

      {/* colour */}
      <Section label="Colour">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {bb.palette.map((s) => (
            <button key={s.hex} onClick={() => copy(s.hex)} className="group text-left">
              <span className="block h-20 w-full rounded-xl ring-1 ring-black/5" style={{ background: s.hex }} />
              <p className="mt-2 text-sm font-medium text-ink/80">{s.name}</p>
              <p className="font-mono text-[10px] uppercase tracking-wide text-ink/40">{s.role}</p>
              <p className="font-mono text-[10px] uppercase tracking-wide text-ink/55 transition group-hover:text-accent">{s.hex} · copy</p>
            </button>
          ))}
        </div>
      </Section>

      {/* type */}
      <Section label="Typography">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink/45">{pair.label} · {pair.hName} + {pair.bName}</p>
        <p className="mt-3 text-4xl leading-tight" style={{ fontFamily: pair.heading, color: ink }}>The quick brown fox</p>
        <p className="mt-3 max-w-xl leading-relaxed text-ink/70" style={{ fontFamily: pair.body }}>
          Body copy sets the everyday tone — readable, even, and quietly confident. {bb.fontNote}
        </p>
      </Section>

      {/* messaging */}
      <Section label="Messaging kit">
        <Field label="Elevator pitch" value={bb.messaging.pitch} body={pair.body} />
        <Field label="Boilerplate" value={bb.messaging.boilerplate} body={pair.body} />
        <div className="mt-5">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ink/40">Taglines</p>
          <div className="space-y-2">
            {bb.messaging.taglines.map((t) => <CopyRow key={t} text={t} body={pair.body} />)}
          </div>
        </div>
        <div className="mt-5">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-ink/40">Value props</p>
          <ul className="space-y-1.5">
            {bb.messaging.valueProps.map((v) => (
              <li key={v} className="flex gap-2 text-ink/75" style={{ fontFamily: pair.body }}><span className="text-accent">✓</span>{v}</li>
            ))}
          </ul>
        </div>
      </Section>

      <Rule />
      <p className="no-print mt-8 text-center text-sm text-ink/45">
        That's your starter brand book. <button onClick={() => window.print()} className="text-accent underline-offset-2 hover:underline">Save it as a PDF</button> and start shipping.
      </p>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-accent">{label}</p>
      {children}
    </section>
  );
}
function Rule() { return <div className="mt-12 border-t border-ink/10" />; }

function DoList({ title, items, tone }: { title: string; items: string[]; tone: "do" | "dont" }) {
  return (
    <div className="rounded-2xl border border-ink/12 bg-[var(--surface-solid)] p-4">
      <p className={`font-mono text-[10px] uppercase tracking-widest ${tone === "do" ? "text-emerald-600" : "text-ink/45"}`}>{title}</p>
      <ul className="mt-2 space-y-1.5 text-sm text-ink/70">
        {items.map((it) => <li key={it} className="flex gap-2"><span className={tone === "do" ? "text-emerald-600" : "text-ink/35"}>{tone === "do" ? "✓" : "✕"}</span>{it}</li>)}
      </ul>
    </div>
  );
}

function Field({ label, value, body }: { label: string; value: string; body: string }) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink/40">{label}</span>
        <CopyBtn text={value} />
      </div>
      <p className="rounded-xl border border-ink/12 bg-[var(--surface-solid)] p-4 leading-relaxed text-ink/75" style={{ fontFamily: body }}>{value}</p>
    </div>
  );
}

function CopyRow({ text, body }: { text: string; body: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-ink/12 bg-[var(--surface-solid)] px-4 py-2.5">
      <span className="text-ink/75" style={{ fontFamily: body }}>{text}</span>
      <CopyBtn text={text} />
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button onClick={() => { copy(text); setDone(true); window.setTimeout(() => setDone(false), 1500); }}
      className="no-print shrink-0 font-mono text-[10px] uppercase tracking-widest text-accent transition hover:opacity-70">
      {done ? "Copied ✓" : "Copy"}
    </button>
  );
}

function copy(text: string) {
  try { navigator.clipboard.writeText(text); } catch { window.prompt("Copy:", text); }
}
