import { useRef } from "react";
import { useVoice } from "../lib/useVoice";
import { TYPE_META, type NameType } from "../lib/generate";
import { type PlanId } from "../lib/plans";

// Maximalist, playful, neo-brutalist poster. Tilted sticker cards, a marquee,
// chunky blocks with hard offset shadows. The opposite of calm.

const MARQUEE = ["BOLD", "PLAYFUL", "ICONIC", "UNFORGETTABLE", "OWNABLE", "LOUD", "MEMORABLE"];
const CARNIVAL_TYPES: NameType[] = ["Playful", "Invented", "Compound", "Suggestive", "Evocative", "AbstractRealWord"];
const STICKER_COLORS = ["var(--color-accent)", "var(--color-accent2)", "var(--color-accent3)", "#06b6d4", "#84cc16", "#f43f5e"];

export function LandingCarnival({ description, setDescription, onNext, onCheckout }: {
  description: string; setDescription: (s: string) => void; onNext: () => void; onCheckout: (p: PlanId) => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const { supported, listening, toggle } = useVoice((t) => setDescription(t));

  return (
    <div className="animate-in pt-4">
      {/* marquee ticker */}
      <div className="nb relative mb-8 overflow-hidden rounded-full bg-accent2 py-2.5">
        <div className="marquee flex gap-6 text-sm font-black uppercase tracking-wider text-white">
          {[...MARQUEE, ...MARQUEE].map((w, i) => (
            <span key={i} className="flex items-center gap-6">{w} <span>✦</span></span>
          ))}
        </div>
      </div>

      {/* hero */}
      <h1 className="text-center text-6xl font-black uppercase leading-[0.92] tracking-tight sm:text-8xl">
        <span className="text-ink">Make a name</span>
        <br />
        <span className="text-accent">that</span>{" "}
        <span className="inline-block -rotate-2 text-accent2">people</span>
        <br />
        <span className="text-accent3">can't shut up</span>{" "}
        <span className="inline-block rotate-2 text-ink">about.</span>
      </h1>
      <p className="mx-auto mt-7 max-w-lg text-center text-lg font-medium text-ink/70">
        Drop your idea in the machine. Out come names with attitude — checked for
        domains & trademarks, ready to wear.
      </p>

      {/* the "machine" — big input block + sticker collage */}
      <div className="mt-10 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="nb-lg rounded-3xl bg-[var(--surface-solid)] p-6">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-ink/50">
            <span className="h-3 w-3 rounded-full bg-accent2" />
            <span className="h-3 w-3 rounded-full bg-accent3" />
            <span className="h-3 w-3 rounded-full bg-accent" />
            <span className="ml-1">the name machine</span>
          </div>
          <textarea
            ref={taRef}
            autoFocus
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && description.trim()) onNext(); }}
            rows={3}
            placeholder={listening ? "LISTENING… talk to me!" : "an app that turns voice notes into blog posts…"}
            className="mt-4 w-full resize-none bg-transparent text-2xl font-bold leading-snug outline-none placeholder:text-ink/25"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            {supported ? (
              <button
                onClick={() => { toggle(description); taRef.current?.focus(); }}
                className={`nb nb-press flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black uppercase ${listening ? "bg-accent2 text-white" : "bg-[var(--surface-solid)] text-ink"}`}
              >
                {listening ? "● rec" : "🎙 talk"}
              </button>
            ) : <span />}
            <button
              onClick={onNext}
              disabled={!description.trim()}
              className="nb nb-press rounded-full bg-accent px-7 py-3 text-base font-black uppercase tracking-wide text-white disabled:opacity-40"
            >
              Generate →
            </button>
          </div>
        </div>

        {/* sticker collage */}
        <div className="grid grid-cols-2 gap-4">
          <Sticker bg="var(--color-accent3)">🎯<br />zero<br />blank pages</Sticker>
          <Sticker bg="var(--color-accent2)">50+<br />names<br />in seconds</Sticker>
          <Sticker bg="#06b6d4">🌐<br />domains<br />checked</Sticker>
          <Sticker bg="var(--color-accent)">🛡<br />INPI<br />ready</Sticker>
        </div>
      </div>

      {/* name types as loud tilted chips */}
      <section id="types" className="mt-24 text-center">
        <h2 className="text-4xl font-black uppercase">9 flavors of name</h2>
        <p className="mt-2 font-medium text-ink/60">Pick your vibe. We generate across all of them.</p>
        <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-3">
          {CARNIVAL_TYPES.map((t, i) => (
            <span
              key={t}
              className="nb rounded-full px-4 py-2 text-sm font-black uppercase text-white"
              style={{ background: STICKER_COLORS[i % STICKER_COLORS.length] }}
            >
              {TYPE_META[t].label}
            </span>
          ))}
        </div>
      </section>

      {/* pricing — chunky blocks */}
      <section id="pricing" className="mt-24">
        <h2 className="text-center text-4xl font-black uppercase">Grab the goods</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          <PriceBlock name="Preview" price="Free" bg="var(--surface-solid)" fg="ink" items={["8 names", "Scores", "Domain hints"]} onClick={() => {}} cta="You're here" />
          <PriceBlock name="Founder" price="€19" bg="var(--color-accent2)" fg="white" items={["60+ names", "Domain search", "INPI check", "Logo directions"]} onClick={() => onCheckout("founder")} cta="Unlock →" big />
          <PriceBlock name="Launch" price="€89" bg="var(--surface-solid)" fg="ink" items={["Everything", "Domain registered", "Trademark filed", "Brand book"]} onClick={() => onCheckout("launch")} cta="Go big →" />
        </div>
      </section>

      <footer className="mt-24 border-t-2 border-ink py-8 text-center text-sm font-black uppercase tracking-wider text-ink/50">
        © 2026 the naming atelier — Carnival · a V1 preview 🎉
      </footer>
    </div>
  );
}

function Sticker({ children, bg }: { children: React.ReactNode; bg: string }) {
  return (
    <div className="nb grid place-items-center rounded-2xl p-4 text-center text-sm font-black uppercase leading-tight text-white" style={{ background: bg }}>
      <span>{children}</span>
    </div>
  );
}

function PriceBlock({ name, price, items, bg, fg, cta, onClick, big }: {
  name: string; price: string; items: string[]; bg: string; fg: "ink" | "white"; cta: string; onClick: () => void; big?: boolean;
}) {
  const text = fg === "white" ? "text-white" : "text-ink";
  return (
    <div className={`nb-lg rounded-3xl p-6 ${text} ${big ? "sm:-translate-y-2" : ""}`} style={{ background: bg }}>
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-black uppercase">{name}</h3>
        <span className="text-3xl font-black">{price}</span>
      </div>
      <ul className="mt-4 space-y-1.5 text-sm font-medium">
        {items.map((it) => <li key={it}>✦ {it}</li>)}
      </ul>
      <button onClick={onClick} className={`nb nb-press mt-5 w-full rounded-full py-2.5 text-sm font-black uppercase ${fg === "white" ? "bg-white text-ink" : "bg-ink text-[var(--surface-solid)]"}`}>
        {cta}
      </button>
    </div>
  );
}
