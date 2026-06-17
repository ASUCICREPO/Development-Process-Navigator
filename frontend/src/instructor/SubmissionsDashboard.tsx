"use client";
import React, { useEffect, useRef, useState } from "react";
import { api } from "../shared/session";
import type { ApiClient } from "../shared/apiClient";

interface ExerciseSummary {
  exerciseId: string;
  configId: string;
  status: string;
}

interface SubmissionRow {
  attemptId: string;
  studentId: string;
  attemptNumber: number;
  scorePercent: number;
  isFinal: boolean;
  reflectionResponse: string | null;
  createdAt: string | null;
}

type SortField = "studentId" | "scorePercent" | "attemptNumber" | "createdAt";
type SortDir = "asc" | "desc";

export const SubmissionsDashboard: React.FC = () => {
  // Stable client ref — api() reads localStorage so must stay client-side only
  const clientRef = useRef<ApiClient | null>(null);
  function getClient(): ApiClient {
    if (!clientRef.current) clientRef.current = api();
    return clientRef.current;
  }

  const [exercises, setExercises] = useState<ExerciseSummary[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedAttempt, setExpandedAttempt] = useState<string | null>(null);

  useEffect(() => {
    getClient()
      .listExercises()
      .then((r: any) => {
        setExercises(r.exercises ?? []);
        if (r.exercises?.[0]) setSelectedExerciseId(r.exercises[0].exerciseId);
      })
      .catch((e: any) => setErr(e.message))
      .finally(() => setLoadingExercises(false));
  }, []);

  useEffect(() => {
    if (!selectedExerciseId) return;
    setLoadingResults(true);
    setErr(null);
    getClient()
      .getClassResults(selectedExerciseId)
      .then((r: any) => setSubmissions(r.results ?? []))
      .catch((e: any) => setErr(e.message))
      .finally(() => setLoadingResults(false));
  }, [selectedExerciseId]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const sorted = [...submissions].sort((a, b) => {
    let av: any = a[sortField] ?? "";
    let bv: any = b[sortField] ?? "";
    if (sortField === "scorePercent" || sortField === "attemptNumber") {
      av = Number(av);
      bv = Number(bv);
    } else {
      av = String(av).toLowerCase();
      bv = String(bv).toLowerCase();
    }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const avg =
    submissions.length > 0
      ? Math.round(submissions.reduce((s, r) => s + r.scorePercent, 0) / submissions.length)
      : null;

  const scoreColor = (pct: number) =>
    pct >= 80 ? "#2e7d32" : pct >= 50 ? "#e65100" : "#c62828";

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  if (loadingExercises) return <p>Loading exercises…</p>;

  return (
    <div data-testid="submissions-dashboard">
      <h2>Submissions Dashboard</h2>

      {err && <p className="error" data-testid="dashboard-error">{err}</p>}

      <div style={{ marginBottom: 16 }}>
        <label>Exercise</label>
        <select
          data-testid="exercise-select"
          value={selectedExerciseId}
          onChange={(e) => setSelectedExerciseId(e.target.value)}
          style={{ marginLeft: 8, minWidth: 280 }}
        >
          {exercises.length === 0 && <option value="">No exercises found</option>}
          {exercises.map((ex) => (
            <option key={ex.exerciseId} value={ex.exerciseId}>
              {ex.exerciseId} ({ex.status})
            </option>
          ))}
        </select>
      </div>

      {loadingResults ? (
        <p>Loading submissions…</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div className="card" style={{ flex: "0 0 auto", minWidth: 140, textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{submissions.length}</div>
              <div style={{ color: "#555" }}>Submissions</div>
            </div>
            <div className="card" style={{ flex: "0 0 auto", minWidth: 140, textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: avg !== null ? scoreColor(avg) : "#555" }}>
                {avg !== null ? `${avg}%` : "—"}
              </div>
              <div style={{ color: "#555" }}>Class Average</div>
            </div>
            <div className="card" style={{ flex: "0 0 auto", minWidth: 140, textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                {submissions.filter((r) => r.reflectionResponse).length}
              </div>
              <div style={{ color: "#555" }}>Reflections</div>
            </div>
          </div>

          {submissions.length === 0 ? (
            <p style={{ color: "#555" }}>No submissions yet for this exercise.</p>
          ) : (
            <table data-testid="submissions-table">
              <thead>
                <tr>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleSort("studentId")}
                  >
                    Student ID <SortIcon field="studentId" />
                  </th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleSort("attemptNumber")}
                  >
                    Attempt <SortIcon field="attemptNumber" />
                  </th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleSort("scorePercent")}
                  >
                    Score <SortIcon field="scorePercent" />
                  </th>
                  <th>Reflection</th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleSort("createdAt")}
                  >
                    Submitted <SortIcon field="createdAt" />
                  </th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <React.Fragment key={row.attemptId}>
                    <tr data-testid={`submission-row-${row.attemptId}`}>
                      <td style={{ fontFamily: "monospace", fontSize: 13 }}>
                        {row.studentId.slice(0, 8)}…
                      </td>
                      <td style={{ textAlign: "center" }}>{row.attemptNumber}</td>
                      <td style={{ fontWeight: 700, color: scoreColor(row.scorePercent) }}>
                        {row.scorePercent}%
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {row.reflectionResponse ? (
                          <span title={row.reflectionResponse} style={{ cursor: "help" }}>✓</span>
                        ) : (
                          <span style={{ color: "#bbb" }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: 13, color: "#555" }}>
                        {row.createdAt
                          ? new Date(row.createdAt).toLocaleString()
                          : "—"}
                      </td>
                      <td>
                        <button
                          style={{ padding: "2px 8px", fontSize: 12 }}
                          onClick={() =>
                            setExpandedAttempt(
                              expandedAttempt === row.attemptId ? null : row.attemptId
                            )
                          }
                          data-testid={`expand-${row.attemptId}`}
                        >
                          {expandedAttempt === row.attemptId ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                    {expandedAttempt === row.attemptId && (
                      <tr>
                        <td colSpan={6} style={{ background: "#f9f9f9", padding: 12 }}>
                          <AttemptDetail attemptId={row.attemptId} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
};

// Inline detail panel — fetches full attempt with card feedback on demand
function AttemptDetail({ attemptId }: { attemptId: string }) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api()
      .getAttempt(attemptId)
      .then((d: any) => setDetail(d))
      .catch((e: any) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) return <p style={{ margin: 0 }}>Loading…</p>;
  if (err) return <p className="error" style={{ margin: 0 }}>{err}</p>;
  if (!detail) return null;

  const feedback: any[] = detail.cardFeedback ?? [];
  const weakest = detail.weakestMatch;

  return (
    <div data-testid={`detail-${attemptId}`}>
      {weakest && (
        <p style={{ margin: "0 0 8px" }}>
          Weakest match: <strong>{weakest.activityId}</strong> / {weakest.phase}
          {weakest.reflectionPrompt && (
            <> — <em>{weakest.reflectionPrompt}</em></>
          )}
        </p>
      )}
      {detail.reflectionResponse && (
        <p style={{ margin: "0 0 8px", background: "#e8f5e9", padding: 8, borderRadius: 4 }}>
          Reflection: {detail.reflectionResponse}
        </p>
      )}
      {feedback.length > 0 && (
        <table style={{ fontSize: 12, width: "auto" }}>
          <thead>
            <tr>
              <th>Activity</th>
              <th>Placed</th>
              <th>Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {feedback.map((cf: any) => (
              <tr key={cf.activityId}>
                <td>{cf.activityId}</td>
                <td>{(cf.placedPhases ?? []).join(", ") || "—"}</td>
                <td>{cf.earned}/{cf.max}</td>
                <td style={{ color: cf.perPhase?.some((p: any) => p.status === "CORRECT") ? "#2e7d32" : "#c62828" }}>
                  {cf.perPhase?.find((p: any) => p.status !== "INCORRECT")?.status ?? "INCORRECT"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
