import React, { useMemo, useState } from "react";
import { Activity, ExerciseView, FeedbackView, Phase, PHASES } from "../shared/types";
import { ApiClient } from "../shared/apiClient";

interface Props {
  api: ApiClient;
  exercise: ExerciseView;
}

/**
 * Student sorting board (U0B). Supports placing the same activity into multiple phases (US-3.2),
 * blocks submit until complete (US-3.3), shows feedback with incorrect highlighting, and supports
 * the one-time correct-and-resubmit flow with a verify step (US-3.4).
 */
export const ExerciseBoard: React.FC<Props> = ({ api, exercise }) => {
  const [placements, setPlacements] = useState<Record<string, Phase[]>>(
    exercise.placements ?? {}
  );
  const [feedback, setFeedback] = useState<FeedbackView | null>(null);
  const [attemptCount, setAttemptCount] = useState<number>(exercise.attemptCount);
  const [locked, setLocked] = useState<boolean>(exercise.locked);

  const placedIds = useMemo(
    () => new Set(Object.entries(placements).filter(([, ph]) => ph.length).map(([id]) => id)),
    [placements]
  );
  const isComplete = exercise.activities.every((a) => placedIds.has(a.activityId));

  function placeInPhase(activityId: string, phase: Phase) {
    if (locked) return;
    setPlacements((prev) => {
      const current = new Set(prev[activityId] ?? []);
      current.add(phase); // same activity may exist in multiple phases
      return { ...prev, [activityId]: Array.from(current) };
    });
  }

  function removeFromPhase(activityId: string, phase: Phase) {
    if (locked) return;
    setPlacements((prev) => ({
      ...prev,
      [activityId]: (prev[activityId] ?? []).filter((p) => p !== phase),
    }));
  }

  async function onSubmit() {
    const fb = (await api.submit(exercise.exerciseId, placements)) as FeedbackView;
    setFeedback(fb);
    setAttemptCount(1);
  }

  async function onResubmit() {
    const fb = (await api.resubmit(exercise.exerciseId, placements)) as FeedbackView;
    setFeedback(fb);
    setAttemptCount(2);
    setLocked(true);
  }

  const statusFor = (activityId: string): string | undefined =>
    feedback?.cardFeedback.find((c) => c.activityId === activityId)?.perPhase
      .map((p) => p.status)
      .join(",");

  return (
    <div data-testid="exercise-board">
      <section data-testid="unsorted-pool">
        <h3>Unsorted Activities</h3>
        {exercise.activities
          .filter((a) => !(placements[a.activityId]?.length))
          .map((a) => (
            <ActivityCard key={a.activityId} activity={a} onPlace={placeInPhase} />
          ))}
      </section>

      <div className="phase-columns">
        {PHASES.map((phase) => (
          <section key={phase} data-testid={`phase-bucket-${phase}`}>
            <h4>{phase}</h4>
            {exercise.activities
              .filter((a) => placements[a.activityId]?.includes(phase))
              .map((a) => (
                <div key={a.activityId} data-testid={`placed-${a.activityId}-${phase}`}>
                  {a.title}
                  {feedback && (
                    <span data-testid={`feedback-${a.activityId}`}>{statusFor(a.activityId)}</span>
                  )}
                  {!locked && (
                    <button
                      data-testid={`remove-${a.activityId}-${phase}`}
                      onClick={() => removeFromPhase(a.activityId, phase)}
                    >
                      remove
                    </button>
                  )}
                </div>
              ))}
          </section>
        ))}
      </div>

      <div data-testid="submit-bar">
        {attemptCount === 0 && (
          <button data-testid="submit-button" disabled={!isComplete} onClick={onSubmit}>
            Submit
          </button>
        )}
        {attemptCount === 1 && !locked && (
          <button data-testid="resubmit-button" disabled={!isComplete} onClick={onResubmit}>
            Resubmit (final)
          </button>
        )}
        {!isComplete && attemptCount === 0 && (
          <span data-testid="incomplete-hint">Place all activities to submit.</span>
        )}
      </div>

      {feedback && (
        <section data-testid="feedback-panel">
          <p data-testid="score">Score: {feedback.scorePercent}%</p>
          {feedback.weakestMatch?.reflectionPrompt && (
            <ReflectionForm
              api={api}
              prompt={feedback.weakestMatch.reflectionPrompt}
            />
          )}
        </section>
      )}
    </div>
  );
};

const ActivityCard: React.FC<{ activity: Activity; onPlace: (id: string, p: Phase) => void }> = ({
  activity,
  onPlace,
}) => (
  <div data-testid={`activity-${activity.activityId}`} className="activity-card">
    <strong>{activity.title}</strong>
    <p>{activity.description}</p>
    <div>
      {PHASES.map((p) => (
        <button
          key={p}
          data-testid={`place-${activity.activityId}-${p}`}
          onClick={() => onPlace(activity.activityId, p)}
        >
          {p}
        </button>
      ))}
    </div>
  </div>
);

const ReflectionForm: React.FC<{ api: ApiClient; prompt: string }> = ({ prompt }) => {
  const [text, setText] = useState("");
  return (
    <div data-testid="reflection-form">
      <p>{prompt}</p>
      <textarea
        data-testid="reflection-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button data-testid="reflection-submit">Save Reflection</button>
    </div>
  );
};
