import React, { useMemo, useRef, useState } from "react";
import { Activity, ExerciseView, FeedbackView, Phase, PHASES } from "../shared/types";
import { ApiClient } from "../shared/apiClient";

interface Props {
  api: ApiClient;
  exercise: ExerciseView;
}

const PHASE_COLORS: Record<string, string> = {
  PLANNING: "#8C1D40",
  "PRE-DEVELOPMENT": "#8C1D40",
  "DUE DILIGENCE": "#e65100",
  "CONCEPT & ANALYSIS": "#2e7d32",
  CONSTRUCTION: "#1565c0",
  "IMPLEMENTATION / BUILD": "#1565c0",
  OPERATIONS: "#6d4c00",
  "OPERATIONS & MGMT": "#6d4c00",
};

function getPhaseColor(phase: string): string {
  const upper = phase.toUpperCase();
  for (const [key, color] of Object.entries(PHASE_COLORS)) {
    if (upper.includes(key) || key.includes(upper)) return color;
  }
  // Cycle through colors for custom phases
  const colors = ["#8C1D40", "#e65100", "#2e7d32", "#1565c0", "#6d4c00"];
  let hash = 0;
  for (let i = 0; i < phase.length; i++) hash = phase.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// Guess category from activity title/description
function guessCategory(activity: Activity): string {
  const text = `${activity.title} ${activity.description}`.toLowerCase();
  if (text.includes("attorney") || text.includes("consultant") || text.includes("engineer") ||
    text.includes("architect") || text.includes("contractor") || text.includes("manager") ||
    text.includes("analyst") || text.includes("broker") || text.includes("appraiser") ||
    text.includes("inspector") || text.includes("surveyor") || text.includes("officer")) {
    return "People";
  }
  if (text.includes("test") || text.includes("analysis") || text.includes("study") ||
    text.includes("assessment") || text.includes("evaluation") || text.includes("inspection") ||
    text.includes("review") || text.includes("audit") || text.includes("survey")) {
    return "Test";
  }
  return "Task";
}

export const ExerciseBoard: React.FC<Props> = ({ api, exercise }) => {
  const [placements, setPlacements] = useState<Record<string, Phase[]>>(
    exercise.placements ?? {}
  );
  const [feedback, setFeedback] = useState<FeedbackView | null>(null);
  const [attemptCount, setAttemptCount] = useState(exercise.attemptCount);
  const [locked, setLocked] = useState(exercise.locked);
  const [dragOver, setDragOver] = useState<Phase | "pool" | null>(null);
  const [activeFilter, setActiveFilter] = useState<"All" | "People" | "Task" | "Test">("All");
  const [saving, setSaving] = useState(false);
  const dragging = useRef<{ activityId: string; fromPhase: Phase | null } | null>(null);

  const placedCount = useMemo(
    () => Object.entries(placements).filter(([, ph]) => ph.length > 0).length,
    [placements]
  );

  const totalCards = exercise.activities.length;
  const isComplete = exercise.activities.every((a) => (placements[a.activityId]?.length ?? 0) > 0);

  // Activities not yet placed
  const unplacedActivities = exercise.activities.filter(
    (a) => !(placements[a.activityId]?.length)
  );

  // Filter activities by category
  const filteredActivities = activeFilter === "All"
    ? unplacedActivities
    : unplacedActivities.filter((a) => guessCategory(a) === activeFilter);

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

  function onDragStart(activityId: string, fromPhase: Phase | null) {
    dragging.current = { activityId, fromPhase };
  }

  function onDropPhase(phase: Phase) {
    if (!dragging.current || locked) return;
    const { activityId, fromPhase } = dragging.current;
    dragging.current = null;
    setDragOver(null);
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
    if (fromPhase) removeFromPhase(activityId, fromPhase);
  }

  async function onSaveDraft() {
    setSaving(true);
    try {
      await api.savePlacements(exercise.exerciseId, placements);
    } catch (e: any) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit() {
    if (attemptCount === 0) {
      const fb = (await api.submit(exercise.exerciseId, placements)) as FeedbackView;
      setFeedback(fb);
      setAttemptCount(1);
    } else {
      const fb = (await api.resubmit(exercise.exerciseId, placements)) as FeedbackView;
      setFeedback(fb);
      setAttemptCount(2);
      setLocked(true);
    }
  }

  return (
    <div style={styles.wrapper}>
      {/* Sub-header bar */}
      <div style={styles.subHeader}>
        <a href="/student/" style={styles.backLink}>← Dashboard</a>
        <h2 style={styles.subTitle}>{exercise.exerciseId}</h2>
        <div style={styles.subRight}>
          <span style={styles.placedCount}>{placedCount} / {totalCards} placed</span>
          <button style={styles.saveDraftBtn} onClick={onSaveDraft} disabled={saving}>
            {saving ? "Saving..." : "📄 Save Draft"}
          </button>
          <button
            style={{
              ...styles.submitBtn,
              opacity: isComplete ? 1 : 0.5,
              cursor: isComplete ? "pointer" : "not-allowed",
            }}
            onClick={onSubmit}
            disabled={!isComplete || locked}
          >
            {attemptCount === 0 ? "Submit" : locked ? "Submitted" : "Resubmit"}
          </button>
        </div>
      </div>

      {/* Main board area */}
      <div style={styles.boardLayout}>
        {/* Left panel — activity cards */}
        <div
          style={styles.leftPanel}
          onDragOver={(e) => { e.preventDefault(); setDragOver("pool"); }}
          onDragLeave={() => setDragOver(null)}
          onDrop={onDropPool}
        >
          <div style={styles.leftHeader}>
            <span style={styles.leftTitle}>Activity Cards</span>
            <span style={styles.cardsBadge}>{unplacedActivities.length}</span>
          </div>

          {/* Filter tabs */}
          <div style={styles.filterRow}>
            {(["All", "People", "Task", "Test"] as const).map((f) => (
              <button
                key={f}
                style={{
                  ...styles.filterBtn,
                  background: activeFilter === f ? "#1a1a1a" : "#f3f4f6",
                  color: activeFilter === f ? "#fff" : "#374151",
                }}
                onClick={() => setActiveFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Activity list */}
          <div style={styles.activityList}>
            {filteredActivities.map((a) => {
              const category = guessCategory(a);
              const placedIn = placements[a.activityId] ?? [];
              return (
                <div
                  key={a.activityId}
                  draggable={!locked}
                  onDragStart={() => onDragStart(a.activityId, null)}
                  style={styles.activityItem}
                  data-testid={`activity-${a.activityId}`}
                >
                  <div style={styles.activityDot} />
                  <div style={{ flex: 1 }}>
                    <div style={styles.activityName}>{a.title}</div>
                    <div style={styles.activityCategory}>{category.toUpperCase()}</div>
                  </div>
                  {placedIn.length > 0 && (
                    <span style={styles.placedBadge}>×{placedIn.length}</span>
                  )}
                </div>
              );
            })}
            {filteredActivities.length === 0 && (
              <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 20 }}>
                {unplacedActivities.length === 0 ? "All cards placed!" : "No cards match this filter."}
              </p>
            )}
          </div>
        </div>

        {/* Right area — phase columns */}
        <div style={styles.phasesArea}>
          {(exercise.phases || PHASES).map((phase) => {
            const color = getPhaseColor(phase);
            const activitiesInPhase = exercise.activities.filter((a) =>
              placements[a.activityId]?.includes(phase)
            );
            const isOver = dragOver === phase;
            return (
              <div
                key={phase}
                style={{
                  ...styles.phaseColumn,
                  borderColor: isOver ? color : "#e5e7eb",
                }}
                data-testid={`phase-bucket-${phase}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(phase); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => onDropPhase(phase)}
              >
                <div style={{ ...styles.phaseHeader, background: color }}>
                  <span style={styles.phaseTitle}>{phase}</span>
                  <span style={styles.phaseIcon}>⊕</span>
                </div>
                <div style={{ ...styles.phaseBody, background: `${color}08` }}>
                  {activitiesInPhase.length === 0 && (
                    <p style={styles.dropHint}>Drop here</p>
                  )}
                  {activitiesInPhase.map((a) => (
                    <div
                      key={a.activityId}
                      draggable={!locked}
                      onDragStart={() => onDragStart(a.activityId, phase)}
                      style={styles.placedCard}
                      data-testid={`placed-${a.activityId}-${phase}`}
                    >
                      <span style={styles.placedCardText}>{a.title}</span>
                      {!locked && (
                        <button
                          style={styles.removeBtn}
                          onClick={() => removeFromPhase(a.activityId, phase)}
                          data-testid={`remove-${a.activityId}-${phase}`}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feedback panel */}
      {feedback && (
        <div style={styles.feedbackPanel} data-testid="feedback-panel">
          <p style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }} data-testid="score">
            Score: {feedback.scorePercent}%
          </p>
          {feedback.weakestMatch?.reflectionPrompt && (
            <p style={{ color: "#6b7280", fontSize: 14 }}>
              {feedback.weakestMatch.reflectionPrompt}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    height: "calc(100vh - 56px)",
    overflow: "hidden",
  },
  subHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#1a1a1a",
    color: "#fff",
    padding: "10px 24px",
    flexShrink: 0,
  },
  backLink: {
    color: "#fff",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 500,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: 600,
    margin: 0,
  },
  subRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  placedCount: {
    fontSize: 13,
    color: "#d1d5db",
  },
  saveDraftBtn: {
    background: "transparent",
    border: "1px solid #6b7280",
    color: "#fff",
    borderRadius: 6,
    padding: "6px 14px",
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 500,
  },
  submitBtn: {
    background: "#8C1D40",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "8px 20px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  boardLayout: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  leftPanel: {
    width: 240,
    flexShrink: 0,
    background: "#fff",
    borderRight: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  leftHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "16px 16px 8px",
  },
  leftTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#111827",
  },
  cardsBadge: {
    background: "#8C1D40",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 10,
  },
  filterRow: {
    display: "flex",
    gap: 4,
    padding: "8px 16px",
  },
  filterBtn: {
    border: "none",
    borderRadius: 4,
    padding: "4px 10px",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
  },
  activityList: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "0 8px 16px",
  },
  activityItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderBottom: "1px solid #f3f4f6",
    cursor: "grab",
    borderRadius: 6,
    transition: "background 0.1s",
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#d1d5db",
    flexShrink: 0,
  },
  activityName: {
    fontSize: 13,
    fontWeight: 600,
    color: "#111827",
  },
  activityCategory: {
    fontSize: 10,
    color: "#8C1D40",
    fontWeight: 700,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  placedBadge: {
    background: "#FFC627",
    color: "#1a1a1a",
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 6px",
    borderRadius: 8,
  },
  phasesArea: {
    flex: 1,
    display: "flex",
    gap: 0,
    overflowX: "auto" as const,
    background: "#f9fafb",
    padding: "16px 12px",
  },
  phaseColumn: {
    flex: 1,
    minWidth: 160,
    display: "flex",
    flexDirection: "column",
    borderRadius: 8,
    border: "2px solid #e5e7eb",
    margin: "0 4px",
    overflow: "hidden",
    background: "#fff",
    transition: "border-color 0.15s",
  },
  phaseHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    color: "#fff",
  },
  phaseTitle: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  phaseIcon: {
    fontSize: 14,
    opacity: 0.7,
  },
  phaseBody: {
    flex: 1,
    padding: 8,
    minHeight: 100,
  },
  dropHint: {
    color: "#d1d5db",
    fontSize: 13,
    textAlign: "center" as const,
    padding: "20px 0",
    fontStyle: "italic" as const,
  },
  placedCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#f3f4f6",
    borderRadius: 6,
    padding: "8px 10px",
    marginBottom: 6,
    cursor: "grab",
  },
  placedCardText: {
    fontSize: 12,
    fontWeight: 500,
    color: "#374151",
  },
  removeBtn: {
    background: "none",
    border: "none",
    color: "#9ca3af",
    fontSize: 16,
    cursor: "pointer",
    padding: "0 4px",
    lineHeight: 1,
    fontWeight: 700,
  },
  feedbackPanel: {
    background: "#fff",
    borderTop: "1px solid #e5e7eb",
    padding: "16px 24px",
  },
};
