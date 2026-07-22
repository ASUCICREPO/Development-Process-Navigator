"use client";
import React, { useEffect, useState } from "react";
import { API_BASE, getToken } from "../../src/shared/session";
import { InstructorSidebar } from "../../src/shared/InstructorSidebar";
import { InfoIcon } from "../../src/shared/InfoIcon";
import { useRoleGuard } from "../../src/shared/useRoleGuard";

interface ExerciseCard {
  exerciseId: string;
  configId: string;
  title: string;
  status: string;
  type: string;
  version: number;
  enrolledCount: number;
}

interface RecentActivity {
  studentName: string;
  action: string;
  exerciseTitle: string;
  time: string;
  score?: number;
}

async function authed(path: string, method = "GET", body?: unknown) {
  const token = getToken();
  if (!token) throw new Error("Session expired. Please log in again.");
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({ error: `HTTP ${res.status}` }))).error || `Request failed: ${res.status}`);
  return res.json();
}

export default function InstructorDashboard() {
  const allowed = useRoleGuard("INSTRUCTOR");
  const [exercises, setExercises] = useState<ExerciseCard[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      // Load exercises
      const exRes = await authed("/exercises");
      const exList = (exRes.exercises ?? []).map((ex: any, i: number) => ({
        exerciseId: ex.exerciseId,
        configId: ex.configId || "",
        title: ex.title || `Exercise ${ex.exerciseId.slice(0, 8)}`,
        status: ex.status || "Active",
        type: "Standard",
        version: 1,
        enrolledCount: 0,
      }));
      setExercises(exList);

      // Load instructor stats
      try {
        const stats = await authed("/instructor/stats");
        setStudentCount(stats.studentCount || 0);
        if (stats.recentActivity) {
          setRecentActivity(stats.recentActivity.map((a: any) => ({
            studentName: a.studentName || "Student",
            action: a.action || "submitted",
            exerciseTitle: a.exerciseId || "",
            time: a.createdAt ? formatTimeAgo(a.createdAt) : "",
            score: a.score,
          })));
        }
      } catch { }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  // Live session modal state
  const [showModal, setShowModal] = useState(false);
  const [sessionExercise, setSessionExercise] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [assignExercise, setAssignExercise] = useState<ExerciseCard | null>(null);

  function generateCode(): string {
    const words = ["ALPHA", "BRAVO", "CHARLIE", "DELTA", "ECHO", "FOXTROT", "GOLF", "HOTEL"];
    const word = words[Math.floor(Math.random() * words.length)];
    const num = Math.floor(Math.random() * 9) + 1;
    return `${word}-${num}`;
  }

  function openSessionModal() {
    setSessionCode(generateCode());
    if (exercises.length > 0) setSessionExercise(exercises[0].exerciseId);
    setShowModal(true);
  }

  async function startSession() {
    if (!sessionExercise) return;
    try {
      await authed("/sessions", "POST", { exerciseId: sessionExercise });
      setShowModal(false);
      window.location.href = "/instructor/session";
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function deleteExercise(exerciseId: string) {
    setConfirmDelete(exerciseId);
  }

  async function confirmDeleteExercise() {
    if (!confirmDelete) return;
    try {
      await authed(`/exercises/${confirmDelete}`, "DELETE");
      setExercises((prev) => prev.filter((ex) => ex.exerciseId !== confirmDelete));
      setMenuOpen(null);
    } catch (e: any) {
      alert(e.message);
    }
    setConfirmDelete(null);
  }

  if (!allowed) return null;

  return (
    <div>
      <InstructorSidebar activeItem="dashboard" />

      {/* Live Session Modal */}
      {showModal && (
        <div style={styles.overlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Start a Live Session?</h2>
              <button style={styles.closeBtn} onClick={() => setShowModal(false)}>×</button>
            </div>

            <label style={styles.modalLabel}>Select an exercise to run live</label>
            <select
              value={sessionExercise}
              onChange={(e) => setSessionExercise(e.target.value)}
              style={styles.modalSelect}
            >
              {exercises.map((ex) => (
                <option key={ex.exerciseId} value={ex.exerciseId}>{ex.title}</option>
              ))}
            </select>

            <label style={styles.modalLabel}>Session Code</label>
            <div style={styles.codeRow}>
              <span style={styles.sessionCode}>{sessionCode}</span>
              <button
                style={styles.regenerateBtn}
                onClick={() => setSessionCode(generateCode())}
              >
                ↻ Regenerate
              </button>
            </div>

            <button style={styles.copyLinkBtn} onClick={() => {
              navigator.clipboard.writeText(sessionCode);
              alert("Session code copied: " + sessionCode);
            }}>
              📋 Copy Join Link
            </button>

            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={styles.startBtn} onClick={startSession}>Start Session</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div style={styles.overlay} onClick={() => setConfirmDelete(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Delete Exercise?</h2>
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>
              Are you sure you want to delete this exercise? This action cannot be undone. All student submissions for this exercise will remain in history.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button style={styles.cancelBtn} onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button style={{ ...styles.startBtn, background: "#ef4444" }} onClick={confirmDeleteExercise}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Exercise Modal */}
      {assignExercise && (
        <div style={styles.overlay} onClick={() => setAssignExercise(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Assign Exercise</h2>
              <button style={styles.closeBtn} onClick={() => setAssignExercise(null)}>×</button>
            </div>

            <p style={{ fontSize: 14, color: "#374151", marginBottom: 16 }}>
              Share this exercise with your students. All enrolled students can see exercises from their instructor automatically.
            </p>

            <label style={styles.modalLabel}>Exercise</label>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 16 }}>
              {assignExercise.title}
            </div>

            <label style={styles.modalLabel}>Exercise ID (students can use this to access directly)</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <code style={{
                flex: 1, padding: "10px 12px", background: "#f3f4f6", borderRadius: 6,
                fontSize: 13, fontFamily: "monospace", color: "#374151", border: "1px solid #e5e7eb",
                wordBreak: "break-all",
              }}>
                {assignExercise.exerciseId}
              </code>
              <button
                style={{ ...styles.newExerciseBtn, padding: "10px 14px", fontSize: 12 }}
                onClick={() => {
                  navigator.clipboard.writeText(assignExercise.exerciseId);
                  alert("Exercise ID copied!");
                }}
              >
                📋 Copy
              </button>
            </div>

            <label style={styles.modalLabel}>How students access this exercise</label>
            <ol style={{ fontSize: 13, color: "#374151", lineHeight: 1.8, paddingLeft: 20, marginBottom: 20 }}>
              <li>Students enrolled in your roster will see this exercise automatically on their dashboard.</li>
              <li>Or share the Exercise ID above — students can enter it to start the exercise directly.</li>
              <li>Make sure students are enrolled first (via Roster → Add Student).</li>
            </ol>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button style={styles.cancelBtn} onClick={() => setAssignExercise(null)}>Close</button>
              <button
                style={styles.startBtn}
                onClick={() => { window.location.href = "/instructor/roster"; }}
              >
                Go to Roster
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="main-content">
        {/* Breadcrumb & Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={styles.breadcrumb}>Instructor</div>
            <h1 style={styles.pageTitle}>Instructor Dashboard</h1>
          </div>
          <button style={styles.liveSessionBtn} onClick={openSessionModal}>
            Start Live Session
          </button>
          <InfoIcon tooltip="Start a live session to run an exercise in real-time with your class. Share the session code with students." />
        </div>

        {/* Stats Row */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{studentCount || "—"}</div>
            <div style={styles.statLabel}>Active Students</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{exercises.length}</div>
            <div style={styles.statLabel}>Exercises Created</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, fontSize: 22 }}>—</div>
            <div style={styles.statLabel}>Last Live Session</div>
          </div>
        </div>

        {/* Main Grid */}
        <div style={styles.mainGrid}>
          {/* Left: Exercises */}
          <div>
            <div style={styles.exercisesHeader}>
              <h2 style={styles.sectionTitle}>
                My Exercises
                <InfoIcon tooltip="Exercises are the activities you assign to students. Each exercise uses a configuration that defines the correct phase ordering." />
              </h2>
              <button
                style={styles.newExerciseBtn}
                onClick={() => window.location.href = "/instructor/exercises/new"}
              >
                + New Exercise
              </button>
            </div>

            {loading ? (
              <p style={{ color: "#6b7280" }}>Loading...</p>
            ) : exercises.length === 0 ? (
              <div style={styles.emptyCard}>
                <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>
                  No exercises yet. Create your first exercise to get started.
                </p>
                <button
                  style={{ ...styles.newExerciseBtn, marginTop: 12 }}
                  onClick={() => window.location.href = "/instructor/exercises"}
                >
                  + Create Exercise
                </button>
              </div>
            ) : (
              <div style={styles.exerciseGrid}>
                {exercises.map((ex) => (
                  <div key={ex.exerciseId} style={styles.exerciseCard}>
                    <div style={styles.cardHeader}>
                      <div style={styles.cardDot} />
                      <h4 style={styles.cardTitle}>{ex.title}</h4>
                      <div style={{ position: "relative" as any }}>
                        <button style={styles.menuBtn} onClick={() => setMenuOpen(menuOpen === ex.exerciseId ? null : ex.exerciseId)}>⋯</button>
                        {menuOpen === ex.exerciseId && (
                          <div style={styles.menuDropdown}>
                            <button style={styles.menuItem} onClick={() => { setMenuOpen(null); window.location.href = `/instructor/exercises?edit=${ex.configId}`; }}>
                              Edit
                            </button>
                            <button style={{ ...styles.menuItem, color: "#ef4444" }} onClick={() => deleteExercise(ex.exerciseId)}>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={styles.cardBadges}>
                      <span style={styles.typeBadge}>{ex.type}</span>
                      <span style={styles.versionBadge}>v{ex.version}</span>
                    </div>
                    <p style={styles.enrolledText}>{ex.enrolledCount} students enrolled</p>
                    <div style={styles.cardActions}>
                      <button
                        style={styles.editBtn}
                        onClick={() => window.location.href = `/instructor/exercises?edit=${ex.configId}`}
                      >
                        Edit
                      </button>
                      <button style={styles.assignBtn} onClick={() => setAssignExercise(ex)}>Assign</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Recent Activity */}
          <div style={styles.activityCard}>
            <h3 style={styles.activityTitle}>Recent Activity</h3>
            {recentActivity.length === 0 ? (
              <p style={{ color: "#6b7280", fontSize: 13 }}>No recent activity yet.</p>
            ) : (
              recentActivity.map((act, i) => (
                <div key={i} style={styles.activityItem}>
                  <div style={styles.activityInfo}>
                    <div style={styles.activityName}>{act.studentName}</div>
                    <div style={styles.activityMeta}>
                      {act.action} · {act.time}
                    </div>
                  </div>
                  {act.score != null && (
                    <span style={{
                      ...styles.activityScore,
                      color: act.score >= 80 ? "#16a34a" : act.score >= 50 ? "#f97316" : "#ef4444",
                    }}>
                      {act.score}%
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  breadcrumb: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
  pageTitle: { fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 },
  liveSessionBtn: {
    background: "#FFC627", color: "#1a1a1a", border: "none", borderRadius: 8,
    padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
  },
  statsRow: {
    display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24,
  },
  statCard: {
    background: "#fff", borderRadius: 12, padding: "20px 24px",
    border: "1px solid #e5e7eb",
  },
  statValue: { fontSize: 36, fontWeight: 700, color: "#8C1D40" },
  statLabel: { fontSize: 13, color: "#6b7280", marginTop: 4 },
  mainGrid: {
    display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, alignItems: "start",
  },
  exercisesHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 },
  newExerciseBtn: {
    background: "#8C1D40", color: "#fff", border: "none", borderRadius: 6,
    padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  emptyCard: {
    background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
    padding: 32, textAlign: "center" as const,
  },
  exerciseGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
  },
  exerciseCard: {
    background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20,
  },
  cardHeader: {
    display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
  },
  cardDot: {
    width: 10, height: 10, borderRadius: "50%", background: "#16a34a", flexShrink: 0,
  },
  cardTitle: { fontSize: 14, fontWeight: 600, color: "#111827", margin: 0, flex: 1 },
  menuBtn: {
    background: "none", border: "none", fontSize: 18, color: "#6b7280",
    cursor: "pointer", padding: "0 4px",
  },
  menuDropdown: {
    position: "absolute" as any, top: 28, right: 0, background: "#fff",
    border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    zIndex: 50, minWidth: 120, overflow: "hidden",
  },
  menuItem: {
    display: "block", width: "100%", background: "none", border: "none",
    padding: "10px 14px", fontSize: 13, textAlign: "left" as any,
    cursor: "pointer", color: "#374151",
  },
  cardBadges: { display: "flex", gap: 6, marginBottom: 8 },
  typeBadge: {
    background: "#8C1D40", color: "#fff", fontSize: 10, fontWeight: 700,
    padding: "2px 8px", borderRadius: 4,
  },
  versionBadge: {
    background: "#f3f4f6", color: "#374151", fontSize: 10, fontWeight: 600,
    padding: "2px 8px", borderRadius: 4,
  },
  enrolledText: { fontSize: 12, color: "#6b7280", marginBottom: 12 },
  cardActions: { display: "flex", gap: 8 },
  editBtn: {
    flex: 1, background: "#f3f4f6", color: "#374151", border: "none",
    borderRadius: 6, padding: "8px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  assignBtn: {
    flex: 1, background: "#FFC627", color: "#1a1a1a", border: "none",
    borderRadius: 6, padding: "8px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer",
  },
  activityCard: {
    background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20,
  },
  activityTitle: { fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 16 },
  activityItem: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    padding: "10px 0", borderBottom: "1px solid #f3f4f6",
  },
  activityInfo: { flex: 1 },
  activityName: { fontSize: 13, fontWeight: 600, color: "#111827" },
  activityMeta: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  activityScore: { fontSize: 14, fontWeight: 700 },
  // Modal styles
  overlay: {
    position: "fixed" as const, top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center",
    justifyContent: "center", zIndex: 1000,
  },
  modal: {
    background: "#fff", borderRadius: 16, padding: "32px",
    width: 440, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  },
  modalHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 },
  closeBtn: {
    background: "none", border: "none", fontSize: 24, color: "#6b7280",
    cursor: "pointer", padding: 0, lineHeight: 1,
  },
  modalLabel: {
    display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6, marginTop: 16,
  },
  modalSelect: {
    width: "100%", padding: "10px 12px", border: "1px solid #d1d5db",
    borderRadius: 8, fontSize: 14,
  },
  codeRow: {
    display: "flex", alignItems: "center", gap: 12, marginTop: 4,
  },
  sessionCode: {
    fontSize: 28, fontWeight: 800, color: "#1a1a1a", letterSpacing: 2,
    background: "#FFC627", padding: "8px 20px", borderRadius: 8,
  },
  regenerateBtn: {
    background: "none", border: "none", color: "#8C1D40", fontSize: 13,
    fontWeight: 600, cursor: "pointer",
  },
  copyLinkBtn: {
    width: "100%", marginTop: 16, padding: "10px", background: "#f3f4f6",
    border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, fontWeight: 500,
    color: "#374151", cursor: "pointer", textAlign: "center" as const,
  },
  modalActions: {
    display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24,
  },
  cancelBtn: {
    background: "#fff", color: "#374151", border: "1px solid #d1d5db",
    borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  startBtn: {
    background: "#8C1D40", color: "#fff", border: "none",
    borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer",
  },
};
