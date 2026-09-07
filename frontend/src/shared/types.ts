// Shared frontend types mirroring backend contracts.

export type Role = "INSTRUCTOR" | "STUDENT";
export type Phase = "PLANNING" | "CONSTRUCTION" | "OPERATIONS";
export type CardStatus = "CORRECT" | "PARTIAL" | "INCORRECT";

export const PHASES: Phase[] = ["PLANNING", "CONSTRUCTION", "OPERATIONS"];

export interface Activity {
  activityId: string;
  title: string;
  description: string;
}

export interface ExerciseView {
  exerciseId: string;
  version?: 1;
  activities: Activity[];
  phases: Phase[];
  placements?: Record<string, Phase[]>; // activityId -> phases
  attemptCount: number;
  locked: boolean;
}

export interface PhaseEvaluation {
  phase: Phase;
  status: CardStatus;
  weight: number;
}

export interface CardFeedback {
  activityId: string;
  placedPhases: Phase[];
  perPhase: PhaseEvaluation[];
  earned: number;
  max: number;
}

export interface FeedbackView {
  scorePercent: number;
  cardFeedback: CardFeedback[];
  weakestMatch?: { activityId: string; phase: Phase; reflectionPrompt?: string };
}

// ---- v2 multi-round card-sorting exercise ---------------------------------

export type CardType =
  | "PROCESS"
  | "MAJOR_ACTIVITY"
  | "PROFESSIONAL"
  | "TASK_DELIVERABLE"
  | "DECISION";

export type RoundKind = "SEQUENCE_PHASES" | "MATCH_TO_ACTIVITY";
export type TargetKind = "STAGE" | "ACTIVITY";

export interface Stage {
  stageId: string;
  title: string;
  description: string;
  order: number;
}

export interface RoundCard {
  cardId: string;
  cardType: CardType;
  title: string;
  description: string;
}

export interface RoundTarget {
  id: string;
  label: string;
}

export interface RoundView {
  roundId: string;
  order: number;
  kind: RoundKind;
  cardType: CardType;
  title: string;
  instructions: string;
  optional: boolean;
  targetKind: TargetKind;
  targets: RoundTarget[];
  cards: RoundCard[];
}

// roundId -> cardId -> [targetId]
export type RoundPlacements = Record<string, Record<string, string[]>>;

// activityId -> plan row
export interface BudgetScheduleRow {
  costCategory: string;
  durationDays: number | string;
  predecessors: string[];
}
export type BudgetSchedule = Record<string, BudgetScheduleRow>;

export interface ExerciseViewV2 {
  exerciseId: string;
  version: 2;
  scenarioId?: string;
  name?: string;
  teachingFocus?: string;
  stages: Stage[];
  activities: Activity[];
  rounds: RoundView[];
  costCategories: string[];
  roundPlacements: RoundPlacements;
  budgetSchedule: BudgetSchedule;
  attemptCount: number;
  locked: boolean;
}

export interface RoundCardResult {
  cardId: string;
  placedTargets: string[];
  perTarget: { target: string; status: CardStatus; weight: number }[];
  earned: number;
  max: number;
}

export interface RoundResult {
  roundId: string;
  title: string;
  cardType: CardType;
  kind: RoundKind;
  scorePercent: number;
  totalEarned: number;
  denominator: number;
  cardResults: RoundCardResult[];
  weakest: { cardId: string; target: string; gap: number } | null;
}

export interface FeedbackViewV2 {
  attemptId: string;
  attemptNumber: number;
  isFinal: boolean;
  scorePercent: number;
  roundResults: RoundResult[];
  weakestMatch: { roundId: string; cardId: string; target: string; gap: number } | null;
}

export function isV2(ex: { version?: number }): ex is ExerciseViewV2 {
  return ex?.version === 2;
}

// ---- Authoring snapshot (instructor customizer) ---------------------------

export interface SnapshotRoundMapping {
  cardId: string;
  targetId: string;
  weight: number;
}

export interface SnapshotRound {
  roundId: string;
  order: number;
  kind: RoundKind;
  cardType: CardType;
  title: string;
  instructions: string;
  optional?: boolean;
  targetKind: TargetKind;
  targets: RoundTarget[];
  cards: RoundCard[];
  mappings: SnapshotRoundMapping[];
}

// The full configuration snapshot (v2). Only the fields the customizer touches
// are typed explicitly; the rest are preserved as-is on round-trip.
export interface ConfigSnapshot {
  name?: string;
  scenarioId?: string;
  teachingFocus?: string;
  version?: number;
  phases?: string[];
  stages?: Stage[];
  activities?: Activity[];
  rounds?: SnapshotRound[];
  costCategories?: string[];
  mappings?: { activityId: string; phase: string; weight: number }[];
  prompts?: unknown[];
  [key: string]: unknown;
}

export interface ConfigurationView {
  configId: string;
  name: string;
  status: string;
  snapshot: ConfigSnapshot;
}
