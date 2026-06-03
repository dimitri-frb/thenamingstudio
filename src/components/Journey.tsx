import { type PlanId } from "../lib/plans";

interface Milestone {
  key: string;
  icon: string;
  label: string;
  tease: string; // the inspiring one-liner
  plan?: PlanId; // set => paid step; clicking opens checkout
}

// The full arc the customer is on — from a blank idea to a brand they own.
// Showing the locked steps ahead is the whole point: it keeps them in the tunnel.
export const MILESTONES: Milestone[] = [
  { key: "brief", icon: "✏️", label: "Your brief", tease: "Define what makes you, you" },
  { key: "names", icon: "✨", label: "Find the name", tease: "Discover a name you'll love for years" },
  { key: "domain", icon: "🌐", label: "Secure domain", tease: "Claim your corner of the internet", plan: "founder" },
  { key: "trademark", icon: "🛡️", label: "File trademark", tease: "Make it legally yours — INPI 🇫🇷", plan: "launch" },
  { key: "brandbook", icon: "📖", label: "Brand book", tease: "Launch like you've been here before", plan: "launch" },
];

export function JourneyRail({ activeIndex, onCheckout }: { activeIndex: number; onCheckout: (p: PlanId) => void }) {
  const last = MILESTONES.length - 1;
  const nextIndex = Math.min(activeIndex + 1, last);
  const pct = (activeIndex / last) * 100;
  const next = MILESTONES[nextIndex];
  const inspiring =
    activeIndex >= last
      ? "You're ready to launch 🚀"
      : `Up next: ${next.tease}${next.plan ? "" : " →"}`;

  return (
    <div className="sticky top-0 z-40 border-b border-ink/10 bar-bg backdrop-blur-xl">
      <div className="mx-auto max-w-5xl px-5 py-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MILESTONES.map((m, i) => (
            <div key={m.key} className="flex shrink-0 items-center gap-1.5">
              <Node milestone={m} state={stateFor(i, activeIndex, nextIndex)} onClick={() => m.plan && onCheckout(m.plan)} />
              {i < last && <Connector done={i < activeIndex} />}
            </div>
          ))}
        </div>

        {/* overall progress + inspiring line */}
        <div className="mt-2.5 flex items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full bg-gradient-to-r from-accent via-accent2 to-accent3 transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <span className="shrink-0 text-[11px] font-medium text-accent2/80">{inspiring}</span>
        </div>
      </div>
    </div>
  );
}

type NodeState = "done" | "current" | "next" | "locked";

function stateFor(i: number, active: number, nextIndex: number): NodeState {
  if (i < active) return "done";
  if (i === active) return "current";
  if (i === nextIndex) return "next";
  return "locked";
}

function Node({ milestone, state, onClick }: { milestone: Milestone; state: NodeState; onClick: () => void }) {
  const clickable = !!milestone.plan && (state === "next" || state === "locked");
  const showTease = state === "current" || state === "next";

  const circle: Record<NodeState, string> = {
    done: "bg-gradient-to-br from-accent/70 to-accent2/70 text-white",
    current: "bg-gradient-to-br from-accent to-accent2 text-white ring-2 ring-accent2/40 ring-offset-2 ring-offset-[color:var(--page)]",
    next: "bg-ink/[0.06] text-ink/80 ring-1 ring-accent2/40",
    locked: "bg-ink/[0.04] text-ink/35",
  };
  const labelCls: Record<NodeState, string> = {
    done: "text-ink/55",
    current: "text-ink",
    next: "text-ink/80",
    locked: "text-ink/35",
  };

  return (
    <button
      onClick={onClick}
      disabled={!clickable}
      title={clickable ? `${milestone.tease} — unlock now` : milestone.tease}
      className={`group flex items-center gap-2 rounded-xl px-2 py-1 transition ${clickable ? "cursor-pointer hover:bg-ink/5" : "cursor-default"}`}
    >
      <span className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm transition ${circle[state]}`}>
        {state === "done" ? "✓" : state === "locked" ? <Lock /> : milestone.icon}
        {state === "current" && <span className="absolute inset-0 animate-ping rounded-full bg-accent2/30" />}
      </span>
      <span className="flex flex-col text-left leading-tight">
        <span className={`text-xs font-semibold ${labelCls[state]}`}>
          {milestone.label}
          {state === "next" && <span className="ml-1.5 rounded-full bg-accent2/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent2">Next</span>}
        </span>
        {showTease && <span className="hidden text-[10px] text-ink/40 sm:block">{milestone.tease}</span>}
      </span>
    </button>
  );
}

function Connector({ done }: { done: boolean }) {
  return (
    <span className="relative h-px w-5 overflow-hidden rounded-full bg-ink/12 sm:w-8">
      {done && <span className="absolute inset-0 bg-gradient-to-r from-accent to-accent2" />}
    </span>
  );
}

function Lock() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
