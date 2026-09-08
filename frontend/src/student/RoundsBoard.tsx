import React, { useEffect, useMemo, useRef, useState } from "react";
import { ApiClient } from "../shared/apiClient";
import {
  BudgetSchedule,
  CardType,
  ExerciseViewV2,
  FeedbackViewV2,
  RoundPlacements,
  RoundView,
} from "../shared/types";

interface Props {
  api: ApiClient;
  exercise: ExerciseViewV2;
}

const CARD_TYPE_LABEL: Record<CardType, string> = {
  PROCESS: "Process Stage",
  MAJOR_ACTIVITY: "Major Activity",
  PROFESSIONAL: "Professional",
  TASK_DELIVERABLE: "Task / Deliverable",
  DECISION: "Developer Decision",
};

const CARD_TYPE_COLOR: Record<CardType, string> = {
  PROCESS: "#8C1D40",
  MAJOR_ACTIVITY: "#1565c0",
  PROFESSIONAL: "#2e7d32",
  TASK_DELIVERABLE: "#e65100",
  DECISION: "#6d4c00",
};

// A pseudo "step" after the last round for the budget/schedule extension.
const BUDGET_STEP = "__budget__";

export const RoundsBoard: React.FC<Props> = ({ api, exercise }) => {
  const rounds = exercise.rounds;
  const [stepIndex, setStepIndex] = useState(0); // 0..rounds.length (last = budget step)
  const [placements, setPlacements] = useState<RoundPlacements>(exercise.roundPlacements ?? {});
  const [budget, setBudget] = useState<BudgetSchedule>(exercise.budgetSchedule ?? {});
  const [feedback, setFeedback] = useState<FeedbackViewV2 | null>(null);
  const [attemptCount, setAttemptCount] = useState(exercise.attemptCount);
  const [locked, setLocked] = useState(exercise.locked);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragging = useRef<{ cardId: string; fromTarget: string | null } | null>(null);

  const onBudgetStep = stepIndex >= rounds.length;
  const round: RoundView | null = onBudgetStep ? null : rounds[stepIndex];

  // ---- placement helpers --------------------------------------------------
  function targetsFor(roundId: string, cardId: string): string[] {
    return placements[roundId]?.[cardId] ?? [];
  }

  function place(roundId: string, cardId: string, targetId: string) {
    if (locked) return;
    setPlacements((prev) => {
      const round = { ...(prev[roundId] ?? {}) };
      const set = new Set(round[cardId] ?? []);
      set.add(targetId);
      round[cardId] = Array.from(set);
      return { ...prev, [roundId]: round };
    });
  }

  function unplace(roundId: string, cardId: string, targetId: string) {
    if (locked) return;
    setPlacements((prev) => {
      const round = { ...(prev[roundId] ?? {}) };
      round[cardId] = (round[cardId] ?? []).filter((t) => t !== targetId);
      return { ...prev, [roundId]: round };
    });
  }

  function onDropTarget(roundId: string, targetId: string) {
    if (!dragging.current || locked) return;
    const { cardId, fromTarget } = dragging.current;
    dragging.current = null;
    setDragOver(null);
    if (fromTarget && fromTarget !== targetId) unplace(roundId, cardId, fromTarget);
    place(roundId, cardId, targetId);
  }

  function onDropPool(roundId: string) {
    if (!dragging.current || locked) return;
    const { cardId, fromTarget } = dragging.current;
    dragging.current = null;
    setDragOver(null);
    if (fromTarget) unplace(roundId, cardId, fromTarget);
  }

  // ---- sequence-round helpers (kind === SEQUENCE_ORDER) -------------------
  // The student's ordering is stored as { cardId: ["pos-<1-based index>"] }.
  function sequenceOrder(rnd: RoundView): string[] {
    const rp = placements[rnd.roundId] ?? {};
    const positioned = rnd.cards
      .map((c) => {
        const t = (rp[c.cardId] ?? [])[0];
        const pos = t ? parseInt(String(t).replace("pos-", ""), 10) : NaN;
        return { cardId: c.cardId, pos: isNaN(pos) ? Infinity : pos };
      })
      .sort((a, b) => a.pos - b.pos);
    return positioned.map((p) => p.cardId);
  }

  function writeSequence(roundId: string, orderedIds: string[]) {
    if (locked) return;
    const map: Record<string, string[]> = {};
    orderedIds.forEach((cid, i) => (map[cid] = [`pos-${i + 1}`]));
    setPlacements((prev) => ({ ...prev, [roundId]: map }));
  }

  function moveInSequence(rnd: RoundView, fromCardId: string, toCardId: string) {
    if (locked || fromCardId === toCardId) return;
    const order = sequenceOrder(rnd);
    const from = order.indexOf(fromCardId);
    const to = order.indexOf(toCardId);
    if (from < 0 || to < 0) return;
    order.splice(to, 0, order.splice(from, 1)[0]);
    writeSequence(rnd.roundId, order);
  }

  // ---- round completeness -------------------------------------------------
  const roundComplete = useMemo(() => {
    if (!round) return true;
    return round.cards.every((c) => (placements[round.roundId]?.[c.cardId]?.length ?? 0) > 0);
  }, [round, placements]);

  const activityLabel = useMemo(() => {
    const m: Record<string, string> = {};
    exercise.activities.forEach((a) => (m[a.activityId] = a.title));
    return m;
  }, [exercise.activities]);

  // Seed a default order for a SEQUENCE_ORDER round the first time it's shown,
  // so every card has a position (the round is scoreable even if untouched).
  useEffect(() => {
    if (!round || round.kind !== "SEQUENCE_ORDER" || locked) return;
    const existing = placements[round.roundId] ?? {};
    const allPositioned = round.cards.every((c) => (existing[c.cardId] ?? []).length > 0);
    if (!allPositioned) {
      const map: Record<string, string[]> = {};
      round.cards.forEach((c, i) => (map[c.cardId] = [`pos-${i + 1}`]));
      setPlacements((prev) => ({ ...prev, [round.roundId]: map }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round?.roundId]);

  // ---- persistence --------------------------------------------------------
  async function saveDraft() {
    setSaving(true);
    try {
      await api.saveRoundPlacements(exercise.exerciseId, placements, budget);
    } catch (e) {
      /* non-blocking */
    } finally {
      setSaving(false);
    }
  }

  async function nextStep() {
    setError(null);
    await saveDraft();
    setStepIndex((i) => i + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function prevStep() {
    setError(null);
    setStepIndex((i) => Math.max(0, i - 1));
  }

  async function finalSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const fn = attemptCount === 0 ? api.submitRounds : api.resubmitRounds;
      const fb = (await fn.call(api, exercise.exerciseId, placements, budget)) as FeedbackViewV2;
      setFeedback(fb);
      setAttemptCount((c) => c + 1);
      if (attemptCount >= 1) setLocked(true);
    } catch (e: any) {
      setError(e.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  // ---- render -------------------------------------------------------------
  const totalSteps = rounds.length + 1; // rounds + budget step

  // After submit, show a dedicated results screen instead of the board.
  if (feedback) {
    return (
      <ResultsScreen
        feedback={feedback}
        exercise={exercise}
        activityLabel={activityLabel}
        canResubmit={!locked && attemptCount < 2}
        onTryAgain={() => setFeedback(null)}
      />
    );
  }

  return (
    <div style={styles.wrapper}>
      {/* Header + stepper */}
      <div style={styles.header}>
        <a href="/student/" style={styles.backLink}>← Dashboard</a>
        <div style={{ textAlign: "center" }}>
          <div style={styles.scenarioName}>{exercise.name || exercise.exerciseId}</div>
          <div style={styles.stepper}>
            {rounds.map((r, i) => (
              <span
                key={r.roundId}
                style={{
                  ...styles.stepDot,
                  background: i === stepIndex ? "#FFC627" : i < stepIndex ? "#2e7d32" : "#555",
                  color: i === stepIndex ? "#1a1a1a" : "#fff",
                }}
                title={r.title}
              >
                {i + 1}
              </span>
            ))}
            <span
              style={{
                ...styles.stepDot,
                background: onBudgetStep ? "#FFC627" : stepIndex > rounds.length - 1 ? "#2e7d32" : "#555",
                color: onBudgetStep ? "#1a1a1a" : "#fff",
              }}
              title="Budget & Schedule"
            >
              $
            </span>
          </div>
        </div>
        <div style={styles.stepCount}>Step {Math.min(stepIndex + 1, totalSteps)} / {totalSteps}</div>
      </div>

      {error && <div style={styles.errorBar}>⚠️ {error}</div>}

      {/* ROUND view */}
      {round && round.kind === "SEQUENCE_ORDER" && (
        <SequenceStage
          round={round}
          order={sequenceOrder(round)}
          locked={locked}
          onDragStart={(cardId) => (dragging.current = { cardId, fromTarget: null })}
          onDropOn={(toCardId) => {
            if (dragging.current) moveInSequence(round, dragging.current.cardId, toCardId);
            dragging.current = null;
          }}
        />
      )}
      {round && round.kind !== "SEQUENCE_ORDER" && (
        <RoundStage
          round={round}
          placements={placements[round.roundId] ?? {}}
          activityLabel={activityLabel}
          locked={locked}
          dragOver={dragOver}
          setDragOver={setDragOver}
          onDragStart={(cardId, fromTarget) => (dragging.current = { cardId, fromTarget })}
          onDropTarget={(targetId) => onDropTarget(round.roundId, targetId)}
          onDropPool={() => onDropPool(round.roundId)}
          onRemove={(cardId, targetId) => unplace(round.roundId, cardId, targetId)}
        />
      )}

      {/* BUDGET & SCHEDULE step (manual §12) */}
      {onBudgetStep && (
        <BudgetScheduleStep
          exercise={exercise}
          budget={budget}
          setBudget={setBudget}
          locked={locked}
        />
      )}

      {/* Footer nav */}
      {!locked && (
        <div style={styles.footer}>
          <button style={styles.ghostBtn} onClick={prevStep} disabled={stepIndex === 0}>
            ← Back
          </button>
          <button style={styles.ghostBtn} onClick={saveDraft} disabled={saving}>
            {saving ? "Saving…" : "Save Draft"}
          </button>
          {!onBudgetStep ? (
            <button
              style={{ ...styles.primaryBtn, opacity: round?.optional || roundComplete ? 1 : 0.5 }}
              onClick={nextStep}
              disabled={!(round?.optional || roundComplete)}
              data-testid="next-round"
            >
              {round?.optional && !roundComplete ? "Skip →" : "Next →"}
            </button>
          ) : (
            <button
              style={{ ...styles.primaryBtn, background: "#8C1D40", color: "#fff", opacity: submitting ? 0.5 : 1 }}
              onClick={finalSubmit}
              disabled={submitting}
              data-testid="submit-exercise"
            >
              {submitting ? "Submitting…" : attemptCount === 0 ? "Submit Exercise" : "Resubmit (final)"}
            </button>
          )}
        </div>
      )}
      {locked && (
        <div style={styles.footer}>
          <span style={{ color: "#6b7280", fontSize: 14 }}>Exercise submitted and locked.</span>
        </div>
      )}
    </div>
  );
};

// ===========================================================================
// Sequence round: drag the cards into the correct 1..N order
// ===========================================================================
const SequenceStage: React.FC<{
  round: RoundView;
  order: string[];
  locked: boolean;
  onDragStart: (cardId: string) => void;
  onDropOn: (toCardId: string) => void;
}> = ({ round, order, locked, onDragStart, onDropOn }) => {
  const color = CARD_TYPE_COLOR[round.cardType] || "#8C1D40";
  const byId: Record<string, { title: string; description: string }> = {};
  round.cards.forEach((c) => (byId[c.cardId] = { title: c.title, description: c.description }));
  const [overId, setOverId] = useState<string | null>(null);

  return (
    <div>
      <div style={styles.roundHeader}>
        <span style={{ ...styles.roundBadge, background: color }}>{CARD_TYPE_LABEL[round.cardType]}</span>
        <h2 style={styles.roundTitle}>{round.title}</h2>
        <p style={styles.roundInstr}>{round.instructions}</p>
      </div>

      <div style={styles.seqWrap}>
        {order.map((cid, i) => {
          const card = byId[cid];
          if (!card) return null;
          const isOver = overId === cid;
          return (
            <div
              key={cid}
              draggable={!locked}
              onDragStart={() => onDragStart(cid)}
              onDragOver={(e) => { e.preventDefault(); setOverId(cid); }}
              onDragLeave={() => setOverId((v) => (v === cid ? null : v))}
              onDrop={() => { setOverId(null); onDropOn(cid); }}
              style={{
                ...styles.seqRow,
                borderColor: isOver ? color : "#e5e7eb",
                boxShadow: isOver ? `0 0 0 2px ${color}33` : "none",
                cursor: locked ? "default" : "grab",
              }}
              data-testid={`seq-${cid}`}
            >
              <span style={{ ...styles.seqNum, background: color }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={styles.seqTitle}>{card.title}</div>
                {card.description && <div style={styles.seqDesc}>{card.description}</div>}
              </div>
              {!locked && <span style={styles.seqGrip}>⠿</span>}
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 12, color: "#9ca3af", padding: "0 24px 8px" }}>
        Drag a card onto another to change its position. Positions are scored on how close they are to the correct order.
      </p>
    </div>
  );
};

// ===========================================================================
// A single round: a card pool + target buckets (stages or activities)
// ===========================================================================
const RoundStage: React.FC<{
  round: RoundView;
  placements: Record<string, string[]>;
  activityLabel: Record<string, string>;
  locked: boolean;
  dragOver: string | null;
  setDragOver: (v: string | null) => void;
  onDragStart: (cardId: string, fromTarget: string | null) => void;
  onDropTarget: (targetId: string) => void;
  onDropPool: () => void;
  onRemove: (cardId: string, targetId: string) => void;
}> = ({ round, placements, locked, dragOver, setDragOver, onDragStart, onDropTarget, onDropPool, onRemove }) => {
  const color = CARD_TYPE_COLOR[round.cardType];
  const placedCardIds = new Set(
    Object.entries(placements).filter(([, t]) => t.length > 0).map(([cid]) => cid)
  );
  const poolCards = round.cards.filter((c) => !placedCardIds.has(c.cardId));
  const cardTitle: Record<string, string> = {};
  round.cards.forEach((c) => (cardTitle[c.cardId] = c.title));

  return (
    <div>
      <div style={styles.roundHeader}>
        <span style={{ ...styles.roundBadge, background: color }}>{CARD_TYPE_LABEL[round.cardType]}</span>
        <h2 style={styles.roundTitle}>{round.title}</h2>
        <p style={styles.roundInstr}>{round.instructions}</p>
        {round.optional && <span style={styles.optionalTag}>Optional round</span>}
      </div>

      <div style={styles.boardLayout}>
        {/* Card pool */}
        <div
          style={styles.pool}
          onDragOver={(e) => { e.preventDefault(); setDragOver("pool"); }}
          onDrop={onDropPool}
        >
          <div style={styles.poolHeader}>
            <span style={styles.poolTitle}>{CARD_TYPE_LABEL[round.cardType]} Cards</span>
            <span style={{ ...styles.countBadge, background: color }}>{poolCards.length}</span>
          </div>
          <div style={styles.poolList}>
            {poolCards.map((c) => (
              <div
                key={c.cardId}
                draggable={!locked}
                onDragStart={() => onDragStart(c.cardId, null)}
                style={{ ...styles.card, borderLeft: `4px solid ${color}` }}
                data-testid={`card-${c.cardId}`}
              >
                <div style={styles.cardTitle}>{c.title}</div>
                {c.description && <div style={styles.cardDesc}>{c.description}</div>}
              </div>
            ))}
            {poolCards.length === 0 && (
              <p style={styles.allPlaced}>All cards placed. You can move on.</p>
            )}
          </div>
        </div>

        {/* Target buckets */}
        <div style={styles.targetsArea}>
          {round.targets.map((t) => {
            const cardsHere = round.cards.filter((c) => (placements[c.cardId] ?? []).includes(t.id));
            const isOver = dragOver === t.id;
            return (
              <div
                key={t.id}
                style={{ ...styles.targetCol, borderColor: isOver ? color : "#e5e7eb" }}
                data-testid={`target-${t.id}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(t.id); }}
                onDrop={() => onDropTarget(t.id)}
              >
                <div style={{ ...styles.targetHeader, background: color }}>{t.label}</div>
                <div style={styles.targetBody}>
                  {cardsHere.length === 0 && <p style={styles.dropHint}>Drop here</p>}
                  {cardsHere.map((c) => (
                    <div
                      key={c.cardId}
                      draggable={!locked}
                      onDragStart={() => onDragStart(c.cardId, t.id)}
                      style={styles.placedCard}
                      data-testid={`placed-${c.cardId}-${t.id}`}
                    >
                      <span>{c.title}</span>
                      {!locked && (
                        <button style={styles.removeBtn} onClick={() => onRemove(c.cardId, t.id)}>×</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ===========================================================================
// Results screen (shown after submit)
// ===========================================================================
const ResultsScreen: React.FC<{
  feedback: FeedbackViewV2;
  exercise: ExerciseViewV2;
  activityLabel: Record<string, string>;
  canResubmit: boolean;
  onTryAgain: () => void;
}> = ({ feedback, exercise, activityLabel, canResubmit, onTryAgain }) => {
  const score = feedback.scorePercent;
  const scoreColor = score >= 80 ? "#2e7d32" : score >= 50 ? "#e65100" : "#8C1D40";
  const weakLabel = feedback.weakestMatch
    ? (activityLabel[feedback.weakestMatch.target] || feedback.weakestMatch.target)
    : null;

  return (
    <div style={styles.resultsPage}>
      <div style={styles.resultsCard}>
        <span style={styles.resultsBadge}>Results</span>
        <h1 style={styles.resultsTitle}>{exercise.name || "Exercise complete"}</h1>

        {/* Big score ring */}
        <div style={{ ...styles.scoreRing, borderColor: scoreColor, color: scoreColor }}>
          <span style={{ fontSize: 44, fontWeight: 800, lineHeight: 1 }}>{score}%</span>
          <span style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Overall Score</span>
        </div>

        {/* Per-round breakdown */}
        <h3 style={styles.resultsSub}>Round breakdown</h3>
        <div style={styles.resultsRounds}>
          {feedback.roundResults.map((rr) => (
            <div key={rr.roundId} style={styles.resultRow}>
              <span style={{ ...styles.roundDot, background: CARD_TYPE_COLOR[rr.cardType] }} />
              <span style={styles.resultRoundName}>{CARD_TYPE_LABEL[rr.cardType]}</span>
              <div style={styles.resultBarTrack}>
                <div style={{ ...styles.resultBarFill, width: `${rr.scorePercent}%`, background: CARD_TYPE_COLOR[rr.cardType] }} />
              </div>
              <span style={styles.resultPct}>{rr.scorePercent}%</span>
            </div>
          ))}
        </div>

        {/* Reflection */}
        {weakLabel && (
          <div style={styles.reflectionBox}>
            <strong style={{ color: "#8C1D40" }}>Reflection</strong>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: "#374151", lineHeight: 1.5 }}>
              Your weakest match was <strong>{weakLabel}</strong>. Consider why that placement
              matters and whether the sequence changes for this scenario.
            </p>
          </div>
        )}

        <div style={styles.resultsActions}>
          {canResubmit && (
            <button style={styles.ghostBtn} onClick={onTryAgain}>Revise &amp; Resubmit</button>
          )}
          <a href="/student/" style={{ ...styles.primaryBtn, textDecoration: "none", display: "inline-block" }}>
            Back to Dashboard
          </a>
        </div>
        {canResubmit && (
          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 10 }}>
            You have one resubmission. Your most recent submission is final.
          </p>
        )}
      </div>
    </div>
  );
};

// ===========================================================================
// Budget & Schedule extension (manual §12)
// ===========================================================================
const BudgetScheduleStep: React.FC<{
  exercise: ExerciseViewV2;
  budget: BudgetSchedule;
  setBudget: (b: BudgetSchedule) => void;
  locked: boolean;
}> = ({ exercise, budget, setBudget, locked }) => {
  function update(activityId: string, field: "costCategory" | "durationDays", value: string) {
    setBudget({
      ...budget,
      [activityId]: {
        costCategory: budget[activityId]?.costCategory ?? "",
        durationDays: budget[activityId]?.durationDays ?? "",
        predecessors: budget[activityId]?.predecessors ?? [],
        [field]: value,
      },
    });
  }

  return (
    <div style={{ padding: "0 8px" }}>
      <div style={styles.roundHeader}>
        <span style={{ ...styles.roundBadge, background: "#6d4c00" }}>Budget &amp; Schedule</span>
        <h2 style={styles.roundTitle}>Turn your process into a development plan</h2>
        <p style={styles.roundInstr}>
          For each major activity, assign a cost category and a rough duration. This connects the
          process you sequenced to a first-pass development budget and schedule.
        </p>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Major Activity</th>
              <th style={styles.th}>Cost Category</th>
              <th style={styles.th}>Duration (days)</th>
            </tr>
          </thead>
          <tbody>
            {exercise.activities.map((a) => {
              const row = budget[a.activityId] ?? { costCategory: "", durationDays: "", predecessors: [] };
              return (
                <tr key={a.activityId}>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{a.title}</td>
                  <td style={styles.td}>
                    <select
                      disabled={locked}
                      value={row.costCategory}
                      onChange={(e) => update(a.activityId, "costCategory", e.target.value)}
                      style={{ ...styles.cell, minWidth: 180 }}
                    >
                      <option value="">Select…</option>
                      {exercise.costCategories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </td>
                  <td style={styles.td}>
                    <input
                      disabled={locked}
                      type="number"
                      min={0}
                      placeholder="e.g. 30"
                      value={row.durationDays}
                      onChange={(e) => update(a.activityId, "durationDays", e.target.value)}
                      style={{ ...styles.cell, width: 110 }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: "flex", flexDirection: "column", minHeight: "calc(100vh - 56px)", paddingBottom: 72, background: "#f9fafb" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "#1a1a1a", color: "#fff", padding: "10px 24px",
  },
  backLink: { color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 500, minWidth: 90 },
  scenarioName: { fontSize: 15, fontWeight: 700 },
  stepper: { display: "flex", gap: 6, marginTop: 6, justifyContent: "center" },
  stepDot: {
    width: 24, height: 24, borderRadius: "50%", display: "inline-flex",
    alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700,
  },
  stepCount: { fontSize: 13, color: "#d1d5db", minWidth: 90, textAlign: "right" as const },
  errorBar: { background: "#fef2f2", color: "#dc2626", padding: "10px 24px", fontSize: 13, fontWeight: 600 },
  roundHeader: { padding: "20px 24px 8px" },
  roundBadge: {
    display: "inline-block", color: "#fff", fontSize: 11, fontWeight: 700,
    padding: "4px 12px", borderRadius: 12, textTransform: "uppercase" as const, letterSpacing: 0.4,
  },
  roundTitle: { fontSize: 22, fontWeight: 800, color: "#111827", margin: "10px 0 4px" },
  roundInstr: { fontSize: 14, color: "#6b7280", margin: 0, maxWidth: 720 },
  optionalTag: { display: "inline-block", marginTop: 8, fontSize: 12, color: "#6d4c00", fontWeight: 700 },
  boardLayout: { display: "flex", gap: 0, padding: "12px 16px 24px", alignItems: "flex-start" },
  pool: {
    width: 280, flexShrink: 0, background: "#fff", border: "1px solid #e5e7eb",
    borderRadius: 10, marginRight: 12, display: "flex", flexDirection: "column", maxHeight: "70vh",
  },
  poolHeader: { display: "flex", alignItems: "center", gap: 8, padding: "14px 16px 8px" },
  poolTitle: { fontSize: 14, fontWeight: 700, color: "#111827" },
  countBadge: { color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 },
  poolList: { overflowY: "auto" as const, padding: "0 12px 16px" },
  card: {
    background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px",
    marginBottom: 8, cursor: "grab",
  },
  cardTitle: { fontSize: 13, fontWeight: 700, color: "#111827" },
  cardDesc: { fontSize: 11, color: "#6b7280", marginTop: 3, lineHeight: 1.4 },
  allPlaced: { color: "#9ca3af", fontSize: 13, textAlign: "center" as const, padding: 20 },
  targetsArea: { flex: 1, display: "flex", gap: 8, overflowX: "auto" as const, paddingBottom: 8 },
  targetCol: {
    minWidth: 170, flex: 1, background: "#fff", border: "2px solid #e5e7eb",
    borderRadius: 10, display: "flex", flexDirection: "column", overflow: "hidden",
  },
  targetHeader: { color: "#fff", fontSize: 12, fontWeight: 700, padding: "10px 12px", lineHeight: 1.3 },
  targetBody: { flex: 1, padding: 8, minHeight: 120 },
  dropHint: { color: "#d1d5db", fontSize: 13, textAlign: "center" as const, padding: "24px 0", fontStyle: "italic" as const },
  placedCard: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "#f3f4f6", borderRadius: 6, padding: "8px 10px", marginBottom: 6, fontSize: 12,
    fontWeight: 600, color: "#374151", cursor: "grab",
  },
  removeBtn: { background: "none", border: "none", color: "#9ca3af", fontSize: 16, cursor: "pointer", fontWeight: 700 },
  // Sequence (ordering) round
  seqWrap: { display: "flex", flexDirection: "column", gap: 8, padding: "8px 24px 4px", maxWidth: 720 },
  seqRow: {
    display: "flex", alignItems: "center", gap: 14, background: "#fff",
    border: "2px solid #e5e7eb", borderRadius: 10, padding: "12px 14px",
  },
  seqNum: {
    width: 28, height: 28, borderRadius: "50%", color: "#fff", fontSize: 13, fontWeight: 800,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  seqTitle: { fontSize: 14, fontWeight: 700, color: "#111827" },
  seqDesc: { fontSize: 12, color: "#6b7280", marginTop: 2, lineHeight: 1.4 },
  seqGrip: { color: "#c1c5cb", fontSize: 18, cursor: "grab" },
  // Results screen
  resultsPage: {
    minHeight: "calc(100vh - 56px)", background: "#f9fafb", display: "flex",
    justifyContent: "center", alignItems: "flex-start", padding: "40px 24px",
  },
  resultsCard: {
    background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "36px 40px",
    maxWidth: 640, width: "100%", textAlign: "center" as const, boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
  },
  resultsBadge: {
    display: "inline-block", background: "#8C1D40", color: "#fff", fontSize: 11, fontWeight: 700,
    padding: "4px 12px", borderRadius: 12, textTransform: "uppercase" as const, letterSpacing: 0.5,
  },
  resultsTitle: { fontSize: 22, fontWeight: 800, color: "#111827", margin: "12px 0 20px" },
  scoreRing: {
    width: 140, height: 140, borderRadius: "50%", border: "8px solid", margin: "0 auto 8px",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  },
  resultsSub: { fontSize: 14, fontWeight: 700, color: "#111827", textAlign: "left" as const, margin: "24px 0 10px" },
  resultsRounds: { display: "flex", flexDirection: "column", gap: 10 },
  resultRow: { display: "flex", alignItems: "center", gap: 10 },
  roundDot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  resultRoundName: { fontSize: 13, fontWeight: 600, color: "#374151", width: 140, textAlign: "left" as const },
  resultBarTrack: { flex: 1, height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" },
  resultBarFill: { height: "100%", borderRadius: 4 },
  resultPct: { fontSize: 13, fontWeight: 700, color: "#111827", width: 44, textAlign: "right" as const },
  reflectionBox: {
    background: "#fdf6f8", border: "1px solid #f3d6de", borderRadius: 10, padding: 16,
    textAlign: "left" as const, marginTop: 20,
  },
  resultsActions: { display: "flex", gap: 12, justifyContent: "center", marginTop: 24 },
  footer: {
    display: "flex", gap: 12, justifyContent: "flex-end", alignItems: "center",
    padding: "14px 24px", background: "#fff", borderTop: "1px solid #e5e7eb",
    position: "sticky" as const, bottom: 0, zIndex: 20, marginTop: "auto",
    boxShadow: "0 -2px 8px rgba(0,0,0,0.06)",
  },
  ghostBtn: {
    background: "transparent", border: "1px solid #d1d5db", color: "#374151",
    borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  primaryBtn: {
    background: "#FFC627", color: "#1a1a1a", border: "none", borderRadius: 6,
    padding: "10px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer",
  },
  tableWrap: { padding: "0 24px 24px", overflowX: "auto" as const },
  table: { width: "100%", borderCollapse: "collapse" as const, background: "#fff", borderRadius: 8, overflow: "hidden" },
  th: {
    textAlign: "left" as const, fontSize: 12, fontWeight: 700, color: "#374151",
    padding: "10px 12px", background: "#f3f4f6", borderBottom: "1px solid #e5e7eb",
  },
  td: { padding: "8px 12px", borderBottom: "1px solid #f3f4f6", fontSize: 13, verticalAlign: "top" as const },
  cell: { padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 },
};
