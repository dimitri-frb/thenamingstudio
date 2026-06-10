// Phase 6 — Pressure-test (NEW). Each finalist runs the gauntlet a naming
// agency uses: the bar test, the spell test, linguistic safety per market, and
// the stretch test. Results land as little pass / warn / fail beats the founder
// watches, then drops anything that fails.

import { useEffect, useState } from "react";
import type { NameBrief, NameCandidate, PressureTest as PTest, TestResult } from "../types";
import { studio } from "../studioApi";
import { FooterNav, PhaseHeader, PrimaryButton, StatePill, StudioNote, Thinking } from "../ui";

const TESTS: { key: "barTest" | "spellTest" | "stretchTest"; label: string; blurb: string }[] = [
  { key: "barTest", label: "The bar test", blurb: "Can you say it over noise and be understood?" },
  { key: "spellTest", label: "The spell test", blurb: "Heard once, can people spell it back?" },
  { key: "stretchTest", label: "The stretch test", blurb: "Legs for sub-brands, products, a .verb?" },
];

export function PressureTest({
  brief,
  finalists,
  onBack,
  onDone,
}: {
  brief: NameBrief;
  finalists: NameCandidate[];
  onBack: () => void;
  onDone: (tests: PTest[], survivors: NameCandidate[]) => void;
}) {
  const [tests, setTests] = useState<Record<string, PTest>>({});
  const [dropped, setDropped] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [reveal, setReveal] = useState(0);

  useEffect(() => {
    let live = true;
    Promise.all(finalists.map((c) => studio.pressureTest(brief, c).then((t) => [c.id, t] as const))).then((pairs) => {
      if (!live) return;
      setTests(Object.fromEntries(pairs));
      setLoading(false);
    });
    return () => { live = false; };
  }, [brief, finalists]);

  // Reveal the four test rows one at a time for a little drama.
  useEffect(() => {
    if (loading) return;
    if (reveal >= 4) return;
    const t = setTimeout(() => setReveal((r) => r + 1), 520);
    return () => clearTimeout(t);
  }, [loading, reveal]);

  if (loading) {
    return (
      <div className="animate-in mx-auto max-w-3xl">
        <PhaseHeader phase={6} title="Pressure-" accent="testing." />
        <Thinking lines={["Running your finalists through the gauntlet…", "Bar · spell · language · stretch"]} />
      </div>
    );
  }

  const survivors = finalists.filter((c) => !dropped.has(c.id));

  return (
    <div className="animate-in mx-auto max-w-3xl">
      <PhaseHeader phase={6} title="The" accent="gauntlet." />
      <StudioNote>
        Every name sounds good in your head. These are the tests a naming agency runs before they let a name out the door. Watch how your finalists hold up, and drop anything that stumbles.
      </StudioNote>

      <div className="mt-7 space-y-4">
        {finalists.map((c) => {
          const t = tests[c.id];
          const isDropped = dropped.has(c.id);
          const failed = t && (t.barTest === "fail" || t.spellTest === "fail" || t.linguisticSafety.some((l) => l.result === "fail"));
          return (
            <div key={c.id} className={`rounded-2xl border p-5 transition ${isDropped ? "border-ink/10 bg-ink/[0.02] opacity-50" : "border-ink/15 bg-[var(--surface-solid)]"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="font-serif text-2xl">{c.name}</span>
                  {failed && !isDropped && <span className="rounded-full bg-rose-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-rose-700">stumbled</span>}
                </div>
                <button onClick={() => setDropped((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })}
                  className="text-xs font-medium text-ink/45 transition hover:text-rose-600">
                  {isDropped ? "↩ keep" : "drop"}
                </button>
              </div>

              {t && (
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {TESTS.map((test, i) => (
                    <TestRow key={test.key} label={test.label} blurb={test.blurb} result={t[test.key] as TestResult} shown={reveal > i} />
                  ))}
                  <TestRow
                    label="Linguistic safety"
                    blurb={`Across ${t.linguisticSafety.map((l) => l.market).join(", ")}`}
                    result={worstOf(t.linguisticSafety.map((l) => l.result))}
                    shown={reveal > 3}
                    note={t.linguisticSafety.find((l) => l.note)?.note}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <FooterNav onBack={onBack} middle={<span className="font-mono text-xs text-accent">{survivors.length} still standing</span>}>
        <PrimaryButton onClick={() => onDone(Object.values(tests), survivors)} disabled={survivors.length < 1}>
          Make the call →
        </PrimaryButton>
      </FooterNav>
    </div>
  );
}

function worstOf(rs: TestResult[]): TestResult {
  if (rs.includes("fail")) return "fail";
  if (rs.includes("warn")) return "warn";
  return "pass";
}

function TestRow({ label, blurb, result, shown, note }: {
  label: string; blurb: string; result: TestResult; shown: boolean; note?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 rounded-xl border border-ink/10 bg-[var(--page)] px-3 py-2.5 transition-all duration-300 ${shown ? "opacity-100" : "opacity-0"}`}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink/75">{label}</p>
        <p className="text-xs text-ink/45">{note || blurb}</p>
      </div>
      <span className="mt-0.5 shrink-0">{shown ? <StatePill state={result} /> : <span className="font-mono text-[10px] text-ink/30">…</span>}</span>
    </div>
  );
}
