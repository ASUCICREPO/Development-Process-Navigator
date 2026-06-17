import React, { useMemo, useRef, useState } from "react";
import { Activity, ExerciseView, FeedbackView, Phase, PHASES } from "../shared/types";
import { ApiClient } from "../shared/apiClient";

interface Props {
  api: ApiClient;
  exercise: ExerciseView;
}

const STATUS_COLOR: Record<string, string> = {
  CORRECT: "#2e7d32",
  PARTIAL: "#e65100",
  INCORRECT: "#c62828",
};

export const ExerciseBoard: React.FC<Props> = ({ api, exercise }) => {
  const [placements, setPlacements] = useState<Record<string, Phase[]>>(
    exercise.placements ?? {}
  );
  const [feedback, setFeedback] = useState<FeedbackView | null>(null);
  const [attemptCount, setAttemptCount] = useState(exercise.attemptCount);
  const [locked, setLocked] = useState(exercise.locked);
  // dragOver tracks which phase bucket the card is hovering over
  const [dragOver, setDragOver] = useState<Phase | "pool" | null>(null);
  const dragging = useRef<{ activityId: string; fromPhase: Phase | null } | null>(null);

  const placedIds = useMemo(
    () => new Set(Object.entries(placements).filter(([, ph]) => ph.length).map(([id]) => id)),
    [placements]
  );
  const isComplete = exercise.activities.every((a) => placedIds.has(a.activityId));

  function placeInPhase(activityId: string, phase: Phase) {
    if (locked) return;
    setPlacements((prev) => {
      const current = new Set(prev[activityId] ?? []);
      current.add(phase);
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

  // --- Drag handlers ---
  function onDragStart(activityId: string, fromPhase: Phase | null) {
    dragging.current = { activityId, fromPhase };
  }

  function onDropPhase(phase: Phase) {
    if (!dragging.current || locked) return;
    const { activityId, fromPhase } = dragging.current;
    dragging.current = null;
    setDragOver(null);
    // If dragged from a phase bucket, remove from that bucket first
    if (fromPhase && fromPhase !== phase) {
      setPlacements((prev) => {
        const without = (prev[activityId] ?? []).filter((p) => p !== fromPhase);
        const current = new Set(without);
        current.add(phase);
        return { ...prev, [activityId]: Array.from(current) };
      });
    } else {
      placeInPhase(activityId, phase);
    }
  }

  function onDropPool() {
    if (!dragging.current || locked) return;
    const { activityId, fromPhase } = dragging.current;
    dragging.current = null;
    setDragOver(null);
    // Dragging back to pool removes from all phases
    if (fromPhase) removeFromPhase(activityId, fromPhase);
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

  const feedbackFor = (activityId: string) =>
    feedback?.cardFeedback.find((c) => c.activityId === activityId);

  return (
    <div data-testid="exercise-board">
      {/* Unsorted pool — drop target to unplace cards */}
      <section
        data-testid="unsorted-pool"
        onDragOver={(e) => { e.preventDefault(); setDragOver("pool"); }}
        onDragLeave={() => setDragOver(null)}
        onDrop={onDropPool}
        style={{
          minHeight: 80,
          padding: 8,
          marginBottom: 16,
          border: dragOver === "pool" ? "2px dashed #1565c0" : "2px dashed #ccc",
          borderRadius: 6,
          background: dragOver === "pool" ? "#e3f2fd" : "#fafafa",
          transition: "background 0.15s",
        }}
      >
        <h3 style={{ margin: "0 0 8px" }}>Unsorted Activities</h3>
        {exercise.activities
          .filter((a) => !(placements[a.activityId]?.length))
          .map((a) => (
            <DraggableCard
              key={a.activityId}
              activity={a}
              fromPhase={null}
              locked={locked}
              onDragStart={onDragStart}
            />
          ))}
        {exercise.activities.filter((a) => !(placements[a.activityId]?.length)).length === 0 && (
          <p style={{ margin: 0, color: "#aaa", fontSize: 13 }}>All activities placed</p>
        )}
      </section>

      {/* Phase columns */}
      <div className="phase-columns">
        {PHASES.map((phase) => {
          const activitiesInPhase = exercise.activities.filter((a) =>
            placements[a.activityId]?.includes(phase)
          );
          return (
            <section
              key={phase}
              data-testid={`phase-bucket-${phase}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(phase); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => onDropPhase(phase)}
              style={{
                flex: 1,
                minHeight: 120,
                border: dragOver === phase ? "2px dashed #1565c0" : "1px dashed #bbb",
                borderRadius: 6,
                padding: 8,
                background: dragOver === phase ? "#e3f2fd" : "#fff",
                transition: "background 0.15s",
              }}
            >
              <h4 style={{ margin: "0 0 8px" }}>{phase}</h4>
              {activitiesInPhase.map((a) => {
                const fb = feedbackFor(a.activityId);
                const bestStatus = fb?.perPhase?.find((p) => p.status !== "INCORRECT")?.status
                  ?? (fb ? "INCORRECT" : undefined);
                return (
                  <DraggableCard
                    key={a.activityId}
                    activity={a}
                    fromPhase={phase}
                    locked={locked}
                    onDragStart={onDragStart}
                    feedbackStatus={bestStatus}
                    onRemove={() => removeFromPhase(a.activityId, phase)}
                  />
                );
              })}
            </section>
          );
        })}
      </div>

      {/* Submit bar */}
      <div data-testid="submit-bar" style={{ marginTop: 16 }}>
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
          <span data-testid="incomplete-hint" style={{ marginLeft: 8, color: "#888", fontSize: 13 }}>
            Drag all activities into a phase to submit.
          </span>
        )}
      </div>

      {/* Feedback panel */}
      {feedback && (
        <section data-testid="feedback-panel" className="card" style={{ marginTop: 16 }}>
          <p data-testid="score" style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>
            Score: {feedback.scorePercent}%
          </p>
          {feedback.weakestMatch?.reflectionPrompt && (
            <ReflectionForm api={api} attemptId={""} prompt={feedback.weakestMatch.reflectionPrompt} />
          )}
        </section>
      )}
    </div>
  );
};

// Draggable activity card
const DraggableCard: React.FC<{
  activity: Activity;
  fromPhase: Phase | null;
  locked: boolean;
  onDragStart: (id: string, from: Phase | null) => void;
  feedbackStatus?: string;
  onRemove?: () => void;
}> = ({ activity, fromPhase, locked, onDragStart, feedbackStatus, onRemove }) => {
  const borderColor = feedbackStatus ? STATUS_COLOR[feedbackStatus] ?? "#ccc" : "#d0d0d0";
  return (
    <div
      data-testid={fromPhase ? `placed-${activity.activityId}-${fromPhase}` : `activity-${activity.activityId}`}
      draggable={!locked}
      onDragStart={() => onDragStart(activity.activityId, fromPhase)}
      className="activity-card"
      style={{
        cursor: locked ? "default" : "grab",
        border: `2px solid ${borderColor}`,
        opacity: locked ? 0.8 : 1,
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <strong>{activity.title}</strong>
        {feedbackStatus && (
          <span
            data-testid={`feedback-${activity.activityId}`}
            style={{
              fontSize: 11, fontWeight: 700, padding: "1px 6px",
              borderRadius: 10, background: borderColor, color: "#fff",
            }}
          >
            {feedbackStatus}
          </span>
        )}
      </div>
      {!fromPhase && <p style={{ margin: "4px 0 0", fontSize: 13, color: "#555" }}>{activity.description}</p>}
      {!locked && onRemove && (
        <button
          data-testid={`remove-${activity.activityId}-${fromPhase}`}
          onClick={onRemove}
          style={{ marginTop: 4, fontSize: 11, padding: "1px 6px", background: "#757575" }}
        >
          remove
        </button>
      )}
    </div>
  );
};

const ReflectionForm: React.FC<{ api: ApiClient; attemptId: string; prompt: string }> = ({
  api, attemptId, prompt,
}) => {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);

  async function save() {
    if (!text.trim() || !attemptId) return;
    await api.saveReflection(attemptId, text);
    setSaved(true);
  }

  return (
    <div data-testid="reflection-form">
      <p style={{ fontWeight: 600 }}>{prompt}</p>
      {saved ? (
        <p className="ok">Reflection saved.</p>
      ) : (
        <>
          <textarea
            data-testid="reflection-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            style={{ width: "100%" }}
          />
          <button data-testid="reflection-submit" onClick={save} disabled={!text.trim()}>
            Save Reflection
          </button>
        </>
      )}
    </div>
  );
};
