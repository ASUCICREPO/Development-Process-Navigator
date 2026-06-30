"use client";
import React, { useEffect, useState } from "react";
import { api, getUserId } from "../../src/shared/session";
import { Sidebar } from "../../src/shared/Sidebar";
import { InfoIcon } from "../../src/shared/InfoIcon";
import { useRoleGuard } from "../../src/shared/useRoleGuard";

interface ExerciseItem {
  exerciseId: string;
  title: string;
  instructor: string;
  dueDate: string | null;
  status: "in-progress" | "not-started" | "completed";
  scorePercent: number | null;
  progress: number; // 0-100
}

interface ScoreItem {
  exerciseId: string;
  title: string;
  date: string;
  scorePercent: number;
}

export default function StudentDashboard() {
  const allowed = useRoleGuard("STUDENT");
  const [displayName, setDisplayName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pc_displayName") || "";
    }
    return "";
  });
  const [personalBest, setPersonalBest] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [recentScores, setRecentScores] = useState<ScoreItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const studentId = getUserId();
      if (!studentId) return;

      // Try to load history for stats
      const client = api();
      let attempts: any[] = [];
      try {
        const historyRes: any = await client.getHistory(studentId);
        attempts = historyRes.attempts ?? [];
      } catch { }

      // Calculate stats
      const scores = attempts.filter((a: any) => a.scorePercent != null).map((a: any) => a.scorePercent);
      const best = scores.length > 0 ? Math.max(...scores) : 0;
      const completed = new Set(attempts.filter((a: any) => a.isFinal).map((a: any) => a.exerciseId)).size;

      setPersonalBest(best);
      setCompletedCount(completed);

      // Build recent scores from attempts
      const recent: ScoreItem[] = attempts
        .filter((a: any) => a.scorePercent != null)
        .sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""))
        .slice(0, 3)
        .map((a: any) => ({
          exerciseId: a.exerciseId,
          title: a.exerciseTitle || `Exercise ${a.exerciseId.slice(0, 8)}`,
          date: a.createdAt ? new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
          scorePercent: a.scorePercent,
        }));
      setRecentScores(recent);

      // Try to load exercise list
      try {
        const exRes: any = await client.listExercises();
        const exList = (exRes.exercises ?? exRes ?? []).map((ex: any) => {
          const myAttempts = attempts.filter((a: any) => a.exerciseId === ex.exerciseId);
          const hasFinal = myAttempts.some((a: any) => a.isFinal);
          const hasAttempt = myAttempts.length > 0;
          const latestScore = myAttempts.length > 0
            ? myAttempts.sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0]?.scorePercent
            : null;

          return {
            exerciseId: ex.exerciseId,
            title: ex.title || ex.exerciseId,
            instructor: ex.instructor || "Instructor",
            dueDate: ex.dueDate || null,
            status: hasFinal ? "completed" : hasAttempt ? "in-progress" : "not-started",
            scorePercent: latestScore,
            progress: hasFinal ? 100 : hasAttempt ? 50 : 0,
          } as ExerciseItem;
        });
        setExercises(exList);
      } catch { }

      // Get display name from localStorage or token
      const storedName = typeof window !== "undefined" ? localStorage.getItem("pc_displayName") : null;
      if (storedName) setDisplayName(storedName);
      else setDisplayName("Student");
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  }

  function getScoreColorClass(score: number): string {
    if (score >= 80) return "high";
    if (score >= 50) return "medium";
    return "low";
  }

  function formatDueDate(date: string | null): string {
    if (!date) return "";
    return `Due ${new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }

  if (!allowed) return null;

  return (
    <div style={{ display: "flex" }}>
      <Sidebar activeItem="dashboard" />
      <main className="main-content">
        {/* Welcome Banner */}
        <div className="welcome-banner">
          <div>
            <h2>Development Process Navigator</h2>
            <h1>Welcome back, {displayName}.</h1>
          </div>
          <button
            className="btn-primary"
            onClick={() => window.location.href = "/student/exercise"}
          >
            Continue Exercise →
          </button>
        </div>

        {/* Main Dashboard Grid */}
        <div className="dashboard-grid">
          {/* Left column: Stats + Exercises */}
          <div>
            {/* Stats Row */}
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-value">{personalBest}%</div>
                <div className="stat-label">Personal Best</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{completedCount}</div>
                <div className="stat-label">Completed</div>
              </div>
            </div>

            {/* Exercises List */}
            <div className="exercises-card">
              <h3>My Exercises <InfoIcon tooltip="These are exercises assigned by your instructor. Drag activity cards into the correct phase order to complete them." /></h3>
              {loading ? (
                <p style={{ color: "var(--gray-500)", fontSize: 14 }}>Loading exercises...</p>
              ) : exercises.length === 0 ? (
                <p style={{ color: "var(--gray-500)", fontSize: 14 }}>
                  No exercises assigned yet. Ask your instructor for a join code or exercise ID.
                </p>
              ) : (
                exercises.map((ex) => (
                  <div key={ex.exerciseId} className="exercise-item">
                    <div className={`exercise-dot ${ex.status}`} />
                    <div className="exercise-info">
                      <div className="exercise-title">{ex.title}</div>
                      <div className="exercise-meta">
                        {ex.instructor}{ex.dueDate ? ` · ${formatDueDate(ex.dueDate)}` : ""}
                      </div>
                      {ex.status === "in-progress" && (
                        <div className="exercise-progress-bar">
                          <div className="fill" style={{ width: `${ex.progress}%` }} />
                        </div>
                      )}
                    </div>
                    <div className="exercise-actions">
                      {ex.scorePercent != null && (
                        <span className="exercise-score">{ex.scorePercent}%</span>
                      )}
                      {ex.status === "in-progress" && (
                        <button
                          className="btn-continue"
                          onClick={() => window.location.href = `/student/exercise?id=${ex.exerciseId}`}
                        >
                          Continue
                        </button>
                      )}
                      {ex.status === "not-started" && (
                        <button
                          className="btn-start"
                          onClick={() => window.location.href = `/student/exercise?id=${ex.exerciseId}`}
                        >
                          Start
                        </button>
                      )}
                      {ex.status === "completed" && (
                        <button
                          className="btn-review"
                          onClick={() => window.location.href = `/student/history?id=${ex.exerciseId}`}
                        >
                          Review
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Scores */}
          <div className="recent-scores-card">
            <h3>Recent Scores <InfoIcon tooltip="Your latest exercise scores. Higher scores mean better placement of activities in the correct phases." /></h3>
            {recentScores.length === 0 ? (
              <p style={{ color: "var(--gray-500)", fontSize: 13 }}>
                No scores yet.
              </p>
            ) : (
              <>
                {recentScores.map((score, i) => (
                  <div key={i} className="score-item">
                    <div className="score-item-info">
                      <div className="score-exercise-name">{score.title}</div>
                      <div className="score-date">{score.date}</div>
                    </div>
                    <div className={`score-item-value ${getScoreColorClass(score.scorePercent)}`}>
                      {score.scorePercent}%
                    </div>
                  </div>
                ))}
                <a className="view-all-link" href="/student/history">
                  View all history →
                </a>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
