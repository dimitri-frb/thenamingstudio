import { useEffect, useMemo, useState } from "react";
import { eur, PLANS, type PlanId } from "../lib/plans";

type Stage = "signup" | "payment" | "processing" | "success";

export function Checkout({ planId, onClose }: { planId: PlanId; onClose: () => void }) {
  const plan = PLANS[planId];
  const [stage, setStage] = useState<Stage>("signup");
  const [email, setEmail] = useState("");
  const [paid, setPaid] = useState(plan.price);

  // Close on Escape; lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="animate-in relative grid w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-[#0d0b16] shadow-2xl shadow-black/50 md:grid-cols-[1fr_1.1fr]">
        {/* Left — order summary */}
        <OrderSummary planId={planId} stage={stage} />

        {/* Right — the form */}
        <div className="relative p-7 sm:p-9">
          <button
            onClick={onClose}
            className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-lg text-white/40 transition hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>

          {stage === "signup" && (
            <Signup
              email={email}
              setEmail={setEmail}
              onContinue={() => setStage("payment")}
            />
          )}
          {stage === "payment" && (
            <Payment
              plan={plan}
              email={email}
              onBack={() => setStage("signup")}
              onPay={(total) => {
                setPaid(total);
                setStage("processing");
                window.setTimeout(() => setStage("success"), 1700);
              }}
            />
          )}
          {stage === "processing" && <Processing total={paid} />}
          {stage === "success" && <Success plan={plan} email={email} paid={paid} onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Order summary (left rail) ---------------- */
function OrderSummary({ planId, stage }: { planId: PlanId; stage: Stage }) {
  const plan = PLANS[planId];
  return (
    <div className="hidden flex-col justify-between bg-gradient-to-b from-fuchsia-500/10 via-indigo-500/5 to-transparent p-7 sm:p-9 md:flex">
      <div>
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 font-black text-white">B</span>
          <span className="font-bold tracking-tight">Brandr</span>
        </div>

        <p className="mt-8 text-sm text-white/45">You're unlocking</p>
        <div className="mt-1 flex items-end gap-2">
          <h3 className="text-2xl font-bold">{plan.name}</h3>
          <span className="mb-1 rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/50">{plan.tagline}</span>
        </div>
        <div className="mt-4 flex items-end gap-1">
          <span className="text-4xl font-extrabold">{eur(plan.price)}</span>
          <span className="mb-1 text-white/40">one-time</span>
        </div>

        <ul className="mt-6 space-y-2.5 text-sm">
          {plan.features.map((f) => (
            <li key={f} className="flex gap-2 text-white/70">
              <span className="text-emerald-400">✓</span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      <Steps stage={stage} />
    </div>
  );
}

function Steps({ stage }: { stage: Stage }) {
  const items = [
    { key: "signup", label: "Account" },
    { key: "payment", label: "Payment" },
    { key: "success", label: "Done" },
  ];
  const order = ["signup", "payment", "success"];
  const current = stage === "processing" ? "payment" : stage;
  const idx = order.indexOf(current);
  return (
    <div className="mt-10 flex items-center gap-2">
      {items.map((it, i) => (
        <div key={it.key} className="flex items-center gap-2">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${i <= idx ? "bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white" : "bg-white/10 text-white/40"}`}>
            {i < idx ? "✓" : i + 1}
          </span>
          <span className={`text-xs ${i <= idx ? "text-white/70" : "text-white/35"}`}>{it.label}</span>
          {i < items.length - 1 && <span className="mx-1 h-px w-6 bg-white/15" />}
        </div>
      ))}
    </div>
  );
}

/* ---------------- Step 1 — Signup ---------------- */
function Signup({ email, setEmail, onContinue }: { email: string; setEmail: (s: string) => void; onContinue: () => void }) {
  const [pw, setPw] = useState("");
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const valid = /\S+@\S+\.\S+/.test(email) && pw.length >= 6;

  return (
    <div className="animate-in">
      <h2 className="text-2xl font-bold tracking-tight">{mode === "signup" ? "Create your account" : "Welcome back"}</h2>
      <p className="mt-1.5 text-sm text-white/50">{mode === "signup" ? "One account to save names and manage your brand." : "Sign in to continue your purchase."}</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <OAuthButton provider="Google" icon={<GoogleIcon />} />
        <OAuthButton provider="GitHub" icon={<GitHubIcon />} />
      </div>

      <div className="my-5 flex items-center gap-3 text-xs text-white/30">
        <span className="h-px flex-1 bg-white/10" /> or with email <span className="h-px flex-1 bg-white/10" />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (valid) onContinue(); }}
        className="space-y-3"
      >
        <Input type="email" placeholder="you@startup.com" value={email} onChange={setEmail} autoFocus />
        <Input type="password" placeholder={mode === "signup" ? "Create a password" : "Your password"} value={pw} onChange={setPw} />
        <button
          type="submit"
          disabled={!valid}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-6 py-3.5 font-semibold shadow-lg shadow-fuchsia-500/20 transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue to payment →
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-white/40">
        {mode === "signup" ? "Already have an account? " : "New to Brandr? "}
        <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="font-medium text-fuchsia-400 hover:underline">
          {mode === "signup" ? "Sign in" : "Create one"}
        </button>
      </p>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-white/30">
        By continuing you agree to Brandr's Terms & Privacy Policy.
      </p>
    </div>
  );
}

/* ---------------- Step 2 — Payment ---------------- */
function Payment({ plan, email, onBack, onPay }: { plan: (typeof PLANS)[PlanId]; email: string; onBack: () => void; onPay: (total: number) => void }) {
  const [card, setCard] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("France");
  const [promo, setPromo] = useState("");

  const discount = useMemo(() => (promo.trim().toUpperCase() === "VIBECODE" ? Math.round(plan.price * 0.2) : 0), [promo, plan.price]);
  const total = plan.price - discount;

  const valid =
    card.replace(/\s/g, "").length >= 15 &&
    /^\d{2}\/\d{2}$/.test(exp) &&
    cvc.length >= 3 &&
    name.trim().length > 1;

  return (
    <div className="animate-in">
      <button onClick={onBack} className="text-sm text-white/40 transition hover:text-white">← Back</button>
      <h2 className="mt-2 text-2xl font-bold tracking-tight">Payment</h2>
      <p className="mt-1.5 text-sm text-white/50">Signed in as <span className="text-white/70">{email || "you@startup.com"}</span></p>

      <form onSubmit={(e) => { e.preventDefault(); if (valid) onPay(total); }} className="mt-5 space-y-3">
        <div>
          <Label>Card number</Label>
          <div className="relative">
            <Input placeholder="4242 4242 4242 4242" value={card} onChange={(v) => setCard(formatCard(v))} inputMode="numeric" />
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30">VISA</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Expiry</Label>
            <Input placeholder="MM/YY" value={exp} onChange={(v) => setExp(formatExp(v))} inputMode="numeric" />
          </div>
          <div>
            <Label>CVC</Label>
            <Input placeholder="123" value={cvc} onChange={(v) => setCvc(v.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" />
          </div>
        </div>
        <div>
          <Label>Name on card</Label>
          <Input placeholder="Jordan Founder" value={name} onChange={setName} />
        </div>
        <div>
          <Label>Country</Label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="glass w-full rounded-xl px-4 py-3 outline-none transition focus:border-fuchsia-400/40"
          >
            {["France", "Belgium", "Switzerland", "Germany", "United Kingdom", "United States", "Other"].map((c) => (
              <option key={c} value={c} className="bg-[#0d0b16]">{c}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <Input placeholder="Promo code" value={promo} onChange={setPromo} />
          {discount > 0 && <span className="grid place-items-center rounded-xl bg-emerald-500/10 px-3 text-xs font-medium text-emerald-300">−20%</span>}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm">
          <div className="flex justify-between text-white/60"><span>{plan.name} (one-time)</span><span>{eur(plan.price)}</span></div>
          {discount > 0 && <div className="mt-1 flex justify-between text-emerald-400"><span>Promo VIBECODE</span><span>−{eur(discount)}</span></div>}
          <div className="mt-2 flex justify-between border-t border-white/10 pt-2 font-semibold"><span>Total due today</span><span>{eur(total)}</span></div>
        </div>

        <button
          type="submit"
          disabled={!valid}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-6 py-3.5 font-semibold shadow-lg shadow-fuchsia-500/20 transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          🔒 Pay {eur(total)}
        </button>
      </form>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-white/30">
        <LockIcon /> Secured by Stripe · 7-day money-back guarantee
      </div>
    </div>
  );
}

/* ---------------- Processing & success ---------------- */
function Processing({ total }: { total: number }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/15 border-t-fuchsia-400" />
      <p className="mt-6 font-semibold">Confirming your payment…</p>
      <p className="mt-1 text-sm text-white/40">Charging {eur(total)} · do not close this window</p>
    </div>
  );
}

function Success({ plan, email, paid, onClose }: { plan: (typeof PLANS)[PlanId]; email: string; paid: number; onClose: () => void }) {
  return (
    <div className="animate-in flex min-h-[420px] flex-col items-center justify-center text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-3xl shadow-xl shadow-emerald-500/30">✓</div>
      <h2 className="mt-5 text-2xl font-bold">You're in! 🎉</h2>
      <p className="mt-2 max-w-xs text-sm text-white/55">
        {plan.name} is unlocked. We sent a receipt to <span className="text-white/80">{email || "your inbox"}</span>.
      </p>
      <button
        onClick={onClose}
        className="mt-6 w-full max-w-xs rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-6 py-3.5 font-semibold shadow-lg shadow-fuchsia-500/20 transition hover:brightness-110"
      >
        Start unlocking names →
      </button>
      <p className="mt-3 text-xs text-white/30">Order #BR-{plan.id.toUpperCase().slice(0, 3)}{plan.price} · {eur(paid)} paid</p>
    </div>
  );
}

/* ---------------- Bits ---------------- */
function Input({ value, onChange, placeholder, type = "text", autoFocus, inputMode }: {
  value: string; onChange: (v: string) => void; placeholder: string; type?: string; autoFocus?: boolean; inputMode?: "numeric" | "text";
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      inputMode={inputMode}
      className="glass w-full rounded-xl px-4 py-3 outline-none transition placeholder:text-white/25 focus:border-fuchsia-400/40"
    />
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-xs font-medium text-white/50">{children}</label>;
}

function OAuthButton({ provider, icon }: { provider: string; icon: React.ReactNode }) {
  return (
    <button className="flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-4 py-3 text-sm font-medium transition hover:border-white/25 hover:bg-white/[0.06]">
      {icon}
      {provider}
    </button>
  );
}

function formatCard(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExp(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 1 1 8 0v4" /></svg>
  );
}
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 5.1 29.5 3 24 3 12.9 3 4 11.9 4 23s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-2.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 5.1 29.5 3 24 3 16.3 3 9.7 7.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 43c5.2 0 10-2 13.6-5.3l-6.3-5.3C29.2 34 26.7 35 24 35c-5.3 0-9.7-2.6-11.3-7.2l-6.6 5.1C9.6 38.6 16.2 43 24 43z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.4l6.3 5.3C40.7 35.5 44 30.2 44 23c0-1.3-.1-2.3-.4-2.5z" /></svg>
  );
}
function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.4.5 0 5.9 0 12.6c0 5.3 3.4 9.8 8.2 11.4.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.8-1.6 8.2-6.1 8.2-11.4C24 5.9 18.6.5 12 .5z" /></svg>
  );
}
