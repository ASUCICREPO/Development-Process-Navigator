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
