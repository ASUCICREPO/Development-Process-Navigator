"use client";
import React, { useEffect, useRef, useState } from "react";
import { api, getUserId } from "../shared/session";
import type { ApiClient } from "../shared/apiClient";

interface AttemptRow {
  attemptId: string;
  exerciseId: string;
  attemptNumber: number;
  isFinal: boolean;
  scorePercent: number;
  reflectionResponse: string | null;
  createdAt: string | null;
}

interface CardFeedback {
  activityId: string;
  placedPhases: string[];
  earned: number;
  max: number;
  perPhase: { phase: string; status: string; weight: number }[];
}

interface AttemptDetail extends AttemptRow {
  cardFeedback: CardFeedback[];
  weakestMatch: { activityId: string; phase: string; reflectionPrompt?: string } | null;
}

const statusColor = (s: string) =>
  s === "CORRECT" ? "#2e7d32" : s === "PARTIAL" ? "#e65100" : "#c62828";

const scoreColor = (pct: number) =>
  pct >= 80 ? "#2e7d32" : pct >= 50 ? "#e65100" : "#c62828";

export const MyResults: React.FC = () => {
  const clientRef = useRef<ApiClient | null>(null);
  const getClient = () => {
    if (!clientRef.current) clientRef.current = api();
    return clientRef.current;
  };

  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const studentId = getUserId();
    if (!studentId) { setErr("Not logged in."); setLoading(false); return; }
    getClient()
      .getHistory(studentId)
      .then((r: any) => setAttempts(r.attempts ?? []))
      .catch((e: any) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading results…</p>;
  if (err) return <p className="error">{err}</p>;
  if (attempts.length === 0)
    return <p style={{ color: "#555" }}>No submissions yet. Complete an exercise to see your results here.</p>;

  // Group by exercise
  const byExercise: Record<string, AttemptRow[]> = {};
  for (const a of attempts) {
    if (!byExercise[a.exerciseId]) byExercise[a.exerciseId] = [];
    byExercise[a.exerciseId].push(a);
  }

  return (
    <div data-testid="my-results">
      {Object.entries(byExercise).map(([exId, rows]) => {
        const finalAttempt = rows.find((r) => r.isFinal) ?? rows[rows.length - 1];
        return (
          <div key={exId} className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: "monospace", fontSize: 12, color: "#777" }}>
                  Exercise: {exId.slice(0, 8)}…
                </div>
                <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>
                  {rows.length} attempt{rows.length !== 1 ? "s" : ""}
                  {finalAttempt?.isFinal ? " · Final submitted" : ""}
                </div>
              </div>
              <div style={{
                fontSize: 28, fontWeight: 700,
                color: scoreColor(finalAttempt?.scorePercent ?? 0),
              }}>
                {finalAttempt?.scorePercent ?? "—"}%
              </div>
            </div>

            <table style={{ marginTop: 12, fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Attempt</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Feedback</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <React.Fragment key={row.attemptId}>
                    <tr>
                      <td style={{ textAlign: "center" }}>#{row.attemptNumber}</td>
                      <td style={{ fontWeight: 700, color: scoreColor(row.scorePercent) }}>
                        {row.scorePercent}%
                      </td>
                      <td>
                        {row.isFinal
                          ? <span style={{ color: "#1565c0", fontWeight: 600 }}>Final</span>
                          : <span style={{ color: "#555" }}>Draft</span>}
                      </td>
                      <td style={{ color: "#555" }}>
                        {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                      </td>
                      <td>
                        <button
                          style={{ padding: "2px 10px", fontSize: 12 }}
                          onClick={() => setExpanded(expanded === row.attemptId ? null : row.attemptId)}
                          data-testid={`view-feedback-${row.attemptId}`}
                        >
                          {expanded === row.attemptId ? "Hide" : "View feedback"}
                        </button>
                      </td>
                    </tr>
                    {expanded === row.attemptId && (
                      <tr>
                        <td colSpan={5} style={{ padding: 0 }}>
                          <FeedbackDetail attemptId={row.attemptId} getClient={getClient} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
};

function FeedbackDetail({
  attemptId,
  getClient,
}: {
  attemptId: string;
  getClient: () => ApiClient;
}) {
  const [detail, setDetail] = useState<AttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getClient()
      .getAttempt(attemptId)
      .then((d: any) => setDetail(d))
      .catch((e: any) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) return <p style={{ padding: 12, margin: 0 }}>Loading…</p>;
  if (err) return <p className="error" style={{ padding: 12, margin: 0 }}>{err}</p>;
  if (!detail) return null;

  const feedback = detail.cardFeedback ?? [];

  return (
    <div style={{ background: "#f9f9f9", padding: 12, borderTop: "1px solid #eee" }}
      data-testid={`feedback-detail-${attemptId}`}>

      {detail.weakestMatch && (
        <div style={{
          background: "#fff8e1", border: "1px solid #ffe082",
          borderRadius: 6, padding: "8px 12px", marginBottom: 12,
        }}>
          <strong>Instructor feedback:</strong> The activity{" "}
          <em>{detail.weakestMatch.activityId}</em> in phase{" "}
          <em>{detail.weakestMatch.phase}</em> was your weakest match.
          {detail.weakestMatch.reflectionPrompt && (
            <div style={{ marginTop: 4, color: "#555" }}>
              Reflect: <em>{detail.weakestMatch.reflectionPrompt}</em>
            </div>
          )}
        </div>
      )}

      {detail.reflectionResponse && (
        <div style={{
          background: "#e8f5e9", border: "1px solid #a5d6a7",
          borderRadius: 6, padding: "8px 12px", marginBottom: 12,
        }}>
          <strong>Your reflection:</strong> {detail.reflectionResponse}
        </div>
      )}

      {feedback.length > 0 ? (
        <table style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th>Activity</th>
              <th>Your placement</th>
              <th>Score</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {feedback.map((cf) => {
              const best = cf.perPhase?.find((p) => p.status !== "INCORRECT") ?? cf.perPhase?.[0];
              return (
                <tr key={cf.activityId}>
                  <td>{cf.activityId}</td>
                  <td>{(cf.placedPhases ?? []).join(", ") || "—"}</td>
                  <td>{cf.earned}/{cf.max}</td>
                  <td style={{ fontWeight: 600, color: best ? statusColor(best.status) : "#c62828" }}>
                    {best?.status ?? "INCORRECT"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p style={{ margin: 0, color: "#555", fontSize: 13 }}>No card-level feedback available.</p>
      )}
    </div>
  );
}
