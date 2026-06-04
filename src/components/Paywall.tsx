import { useState } from "react";
import { createPortal } from "react-dom";

// The conversion moment. The whole creative flow is free; once the founder has a
// shortlist worth comparing, we offer to "make it real", check INPI + domains,
// and optionally build the brand book. Least-friction checkout (Apple/Google/email).

export type Tier = "check" | "bundle";

export const OFFERS = {
  check: {
    id: "check" as Tier,
    name: "The reality check",
    price: 9,
    was: null as number | null,
    tagline: "Is the name actually free to use?",
    blurb: "We verify INPI trademark availability and check the domain on every register, ready in under a minute.",
    features: [
      "🇫🇷 INPI trademark availability",
      "🌐 Domain check across .com / .io / .fr / .co …",
      "⚖️ Conflict & cross-language flags",
      "Delivered in < 1 minute",
    ],
  },
  bundle: {
    id: "bundle" as Tier,
    name: "Name it + ship it",
    price: 58,
    was: 108,
    tagline: "The check + your full brand book",
    blurb: "Everything in the reality check, plus a complete brand book so you can stop thinking about branding and start building.",
    features: [
      "Everything in the reality check",
      "📕 Full brand book (logo, colors, type, voice)",
      "Ready-to-ship assets & guidelines",
      "Brand book is 99€ alone, 49€ in the bundle",
    ],
  },
};

const eur = (n: number) => `€${n}`;

export function Paywall({
  names,
  onPaid,
  onClose,
  onMaybeLater,
}: {
  names: string[];
  onPaid: (tier: Tier, email: string) => void;
  onClose: () => void;
  onMaybeLater: () => void;
}) {
  const [tier, setTier] = useState<Tier>("bundle");
  const [email, setEmail] = useState("");
  const [processing, setProcessing] = useState<null | string>(null);
  const offer = OFFERS[tier];
  const validEmail = /\S+@\S+\.\S+/.test(email);

  function pay(method: string) {
    // Demo checkout, no real charge. A real build would hand off to Stripe /
    // Apple Pay / Google Pay here; the email is captured for delivery + receipt.
    setProcessing(method);
    window.setTimeout(() => onPaid(tier, email || `${method}@demo`), 1400);
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-ink/40 backdrop-blur-sm sm:items-center">
      <div className="animate-in relative w-full max-w-lg rounded-t-3xl border border-ink/12 bg-[var(--page)] p-6 shadow-2xl sm:rounded-3xl sm:p-8">
        <button onClick={onClose} className="absolute right-5 top-5 text-ink/35 transition hover:text-ink">✕</button>

        {/* congrats */}
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">You've got a shortlist</p>
        <h2 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">These are <span className="italic text-accent2">great</span> names. Congrats.</h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {names.slice(0, 6).map((n) => (
            <span key={n} className="rounded-full border border-ink/15 bg-[var(--surface-solid)] px-2.5 py-1 font-serif text-sm italic text-ink/70">{n}</span>
          ))}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-ink/60">
          Now let's make it real. Before you fall in love, let's check the name is actually <em>yours to take</em>, trademark and domains, all at once.
        </p>

        {/* offers */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {(["check", "bundle"] as Tier[]).map((t) => {
            const o = OFFERS[t];
            const on = tier === t;
            return (
              <button key={t} onClick={() => setTier(t)}
                className={`relative rounded-2xl border p-4 text-left transition ${on ? "border-accent bg-accent/5 shadow-sm" : "border-ink/15 bg-[var(--surface-solid)] hover:border-ink/30"}`}>
                {t === "bundle" && <span className="absolute -top-2.5 left-4 rounded-full bg-accent px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-white">Best value · save €50</span>}
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-2xl">{eur(o.price)}</span>
                  {o.was && <span className="font-mono text-xs text-ink/35 line-through">{eur(o.was)}</span>}
                  <span className="ml-auto text-accent">{on ? "●" : "○"}</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-ink/80">{o.name}</p>
                <p className="mt-0.5 text-xs text-ink/50">{o.tagline}</p>
              </button>
            );
          })}
        </div>

        {/* selected detail */}
        <ul className="mt-4 space-y-1.5 rounded-2xl border border-ink/10 bg-[var(--surface-solid)] p-4 text-sm text-ink/70">
          {offer.features.map((f) => (
            <li key={f} className="flex gap-2"><span className="text-accent">✓</span><span>{f}</span></li>
          ))}
        </ul>

        {/* checkout */}
        {processing ? (
          <div className="mt-6 flex flex-col items-center justify-center gap-3 py-6 text-center">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-ink/15 border-t-accent" />
            <p className="font-serif text-lg italic">Confirming {processing}…</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40">Then we run your checks</p>
          </div>
        ) : (
          <div className="mt-6">
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => pay("Apple Pay")} className="flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 font-medium text-[var(--page)] transition hover:opacity-90">
                <AppleGlyph /> Pay
              </button>
              <button onClick={() => pay("Google Pay")} className="flex items-center justify-center gap-2 rounded-xl border border-ink/20 bg-[var(--surface-solid)] px-4 py-3 font-medium text-ink transition hover:border-ink/40">
                <GoogleGlyph /> Pay
              </button>
            </div>
            <div className="my-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-ink/30">
              <span className="h-px flex-1 bg-ink/10" /> or card <span className="h-px flex-1 bg-ink/10" />
            </div>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com, we send your results here"
              className="w-full rounded-xl border border-ink/20 bg-[var(--surface-solid)] px-4 py-3 text-sm outline-none transition placeholder:text-ink/30 focus:border-accent/50"
            />
            <button onClick={() => pay("card")} disabled={!validEmail}
              className="mt-2.5 w-full rounded-xl bg-accent px-6 py-3.5 font-serif text-lg italic text-white shadow-lg shadow-accent/20 transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-30">
              Pay {eur(offer.price)} & run my checks →
            </button>
            <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest text-ink/35">One-time · secure · no subscription</p>
          </div>
        )}

        <button onClick={onMaybeLater} className="mt-4 block w-full text-center text-sm text-ink/40 transition hover:text-ink/70">
          Maybe later, just show me the scored shortlist
        </button>
      </div>
    </div>,
    document.body,
  );
}

function AppleGlyph() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.8-3.5.8s-1.8-.8-3-.8c-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .7 1.1 1.6 2.3 2.7 2.3 1.1 0 1.5-.7 2.8-.7s1.6.7 2.8.7 1.9-1.1 2.6-2.2c.8-1.2 1.2-2.4 1.2-2.5-.1 0-2.3-.9-2.4-3.5zM14.2 5.9c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.6 1.3-.6.6-1.1 1.6-.9 2.6 1 .1 2-.5 2.6-1.2z"/></svg>;
}
function GoogleGlyph() {
  return <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.6a4.8 4.8 0 0 1-2 3.1v2.6h3.2c1.9-1.7 3-4.3 3-7.6z"/><path fill="#34A853" d="M12 22c2.7 0 5-1 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 13.8a6 6 0 0 1 0-3.6V7.6H3.1a10 10 0 0 0 0 8.8l3.3-2.6z"/><path fill="#EA4335" d="M12 6.2c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.6l3.3 2.6C7.2 8 9.4 6.2 12 6.2z"/></svg>;
}
