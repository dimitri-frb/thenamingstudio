// Data model for the v2 "studio" funnel (the strategy-led 7-phase flow).
// Mirrors §4 of the build brief. Fully isolated from v1's types so a change to
// one funnel can never break the other.

export type Stance = "blend" | "break";
export type TestResult = "pass" | "warn" | "fail";
export type AvailabilityState =
  | "available"
  | "taken"
  | "premium"
  | "clear"
  | "conflict"
  | "unknown";

export interface NameBrief {
  namingTarget: "company" | "product" | "rename";
  whatItDoes: string;
  audience: string;
  oneThingToOwn: string;
  category: string;
  competitors: string[];
  personality: string[]; // 3-5 attribute tags
  nameJob: number; // 0 = fully descriptive ... 100 = empty vessel
  targetMarkets: string[]; // e.g. ['FR','EU','US'] - drives linguistic checks
}

export interface SoundscapeAnalysis {
  patterns: string[]; // observed naming conventions in the category
  axes: { x: string; y: string };
  competitorPoints: { name: string; x: number; y: number }[]; // x,y in 0..100
  read: string; // one-line strategist read
  recommendedStance: Stance;
  target: { x: number; y: number }; // founder's recommended zone on the map
}

export interface Territory {
  id: string;
  name: string; // e.g. "the ironic inversion"
  description: string;
  examplePattern: string;
  buys: string; // what it gives you
  costs: string; // the tradeoff
  selected: boolean;
}

export interface SmileScore {
  // each 0-100
  suggestive: number;
  memorable: number;
  imagery: number;
  legs: number;
  emotional: number;
  overall: number;
}

export interface ScratchFlags {
  // true = problem present
  spellingChallenged: boolean;
  copycat: boolean;
  restrictive: boolean;
  annoying: boolean;
  tame: boolean;
  hardToPronounce: boolean;
  badMeaningInMarkets?: string[];
}

export interface Availability {
  domainCom: AvailabilityState;
  otherTlds?: Record<string, AvailabilityState>;
  instagram: AvailabilityState; // best-effort only
  trademarkINPI: AvailabilityState;
  checkedAt: string;
}

export interface NameCandidate {
  id: string;
  name: string;
  territoryId: string;
  rationale: string;
  smile: SmileScore;
  scratch: ScratchFlags;
  availability: Availability;
  ownable: boolean; // derived gate for the shortlist
}

export interface PressureTest {
  candidateId: string;
  barTest: TestResult;
  spellTest: TestResult;
  linguisticSafety: { market: string; result: TestResult; note?: string }[];
  stretchTest: TestResult;
}

export interface SessionState {
  phase: 1 | 2 | 3 | 4 | 5 | 6;
  brief?: NameBrief;
  soundscape?: SoundscapeAnalysis;
  stance?: Stance;
  territories: Territory[];
  keptWords: string[];
  candidates: NameCandidate[];
  finalists: string[]; // candidate ids
  pressureTests: PressureTest[];
  decision?: { candidateId: string; rationale: string };
}

export function emptySession(): SessionState {
  return {
    phase: 1,
    territories: [],
    keptWords: [],
    candidates: [],
    finalists: [],
    pressureTests: [],
  };
}
