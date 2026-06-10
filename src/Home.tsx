// The home screen is now a chooser: two parallel funnels a tester can compare
// side by side. "Original" launches the live 9-step flow (v1, untouched);
// "Studio" launches the new strategy-led 7-phase flow (v2).

import { BrandMark, Wordmark } from "./components/Logo";

export function Home({ onPick }: { onPick: (path: "classic" | "studio") => void }) {
  return (
    <div className="min-h-screen mesh">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-5 py-6">
        <span className="flex items-center gap-2.5">
          <BrandMark />
          <Wordmark />
        </span>
        <span className="hidden rounded-full border border-ink/15 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-ink/45 sm:inline">
          🇫🇷 INPI-ready
        </span>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 pb-24">
        <section className="animate-in pt-10 text-center sm:pt-16">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink/40">A studio for the unnamed</p>
          <h1 className="mt-6 text-5xl leading-[1.02] sm:text-6xl">
            Name your company, <span className="italic text-accent">properly.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl font-serif text-xl leading-relaxed text-ink/65">
            Two ways through. Try them side by side and see which gets you to a name you'd defend.
          </p>
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          <PathCard
            tag="Original"
            title="The quick flow"
            sub="Nine guided steps: brief, feelings, a constellation to explore, names, checks, verdict. The live experience."
            meta="≈ 20 min · 9 steps"
            onClick={() => onPick("classic")}
          />
          <PathCard
            tag="Studio · new"
            featured
            title="The strategy-led flow"
            sub="Seven phases with a point of view: position, read the category, pick directions, generate, an ownable shortlist, pressure-test, decide."
            meta="≈ 10 min · 7 phases"
            onClick={() => onPick("studio")}
          />
        </section>

        <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-widest text-ink/35">
          Both run on demo data, no account needed
        </p>
      </main>
    </div>
  );
}

function PathCard({ tag, title, sub, meta, onClick, featured }: {
  tag: string; title: string; sub: string; meta: string; onClick: () => void; featured?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col rounded-[26px] border p-6 text-left transition ${
        featured ? "border-accent/40 bg-gradient-to-br from-accent/[0.06] to-accent2/[0.04] shadow-md hover:shadow-lg" : "border-ink/15 bg-[var(--surface-solid)] hover:border-ink/30"
      }`}
    >
      <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${featured ? "bg-accent text-white" : "bg-ink/8 text-ink/55"}`}>
        {tag}
      </span>
      <h2 className="mt-3 font-serif text-2xl">{title}</h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink/55">{sub}</p>
      <div className="mt-5 flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-widest text-ink/40">{meta}</span>
        <span className={`font-serif text-lg italic transition group-hover:translate-x-0.5 ${featured ? "text-accent" : "text-ink/70"}`}>Enter →</span>
      </div>
    </button>
  );
}
