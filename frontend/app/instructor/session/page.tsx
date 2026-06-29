"use client";
import React, { useEffect, useState } from "react";
import { API_BASE, getToken } from "../../../src/shared/session";
import { InstructorSidebar } from "../../../src/shared/InstructorSidebar";
import { useRoleGuard } from "../../../src/shared/useRoleGuard";

interface Participant {
    name: string;
    initials: string;
    status: "Active" | "Completed" | "Idle";
    progress: number;
    score: number | null;
}

interface SessionInfo {
    sessionId: string;
    exerciseTitle: string;
    sessionCode: string;
    startedAt: string;
    participantCount: number;
}

async function authed(path: string) {
    const token = getToken();
    if (!token) throw new Error("Session expired.");
    const res = await fetch(`${API_BASE.replace(/\/$/, "")}${path}`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load");
    return res.json();
}

function getInitials(name: string): string {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

export default function SessionPage() {
    const allowed = useRoleGuard("INSTRUCTOR");
    const [sessionActive, setSessionActive] = useState(false);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadSession(); }, []);

    async function loadSession() {
        try {
            // Try to get active sessions from instructor stats
            const stats = await authed("/instructor/stats");

            // Check if there's any recent activity that indicates an active session
            if (stats.recentActivity && stats.recentActivity.length > 0) {
                // Build participants from recent activity data
                const participantMap: Record<string, Participant> = {};
                for (const act of stats.recentActivity) {
                    const name = act.studentName || "Student";
                    if (!participantMap[name]) {
                        participantMap[name] = {
                            name,
                            initials: getInitials(name),
                            status: act.score != null ? "Completed" : "Active",
                            progress: act.score != null ? 100 : 50,
                            score: act.score,
                        };
                    }
                }
                setParticipants(Object.values(participantMap));
            }

            // If exercises exist, show session info from the most recent one
            const exRes = await authed("/exercises");
            const exercises = exRes.exercises ?? [];
            if (exercises.length > 0) {
                setSessionInfo({
                    sessionId: "current",
                    exerciseTitle: exercises[0].title || exercises[0].exerciseId,
                    sessionCode: "—",
                    startedAt: "",
                    participantCount: Object.keys(participants).length,
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    if (!allowed) return null;

    const completedCount = participants.filter((p) => p.status === "Completed").length;
    const activeCount = participants.filter((p) => p.status === "Active").length;
    const idleCount = participants.length - completedCount - activeCount;

    return (
        <div>
            <InstructorSidebar activeItem="session" />
            <main className="main-content">
                <div style={styles.breadcrumb}>Instructor &gt; Live Session</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                    <h1 style={styles.pageTitle}>Live Session</h1>
                    {sessionActive && (
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={styles.liveBadge}>● LIVE</span>
                            <button style={styles.endBtn} onClick={() => setSessionActive(false)}>End Session</button>
                        </div>
                    )}
                </div>

                {loading ? (
                    <p style={{ color: "#6b7280" }}>Loading session data...</p>
                ) : !sessionActive && participants.length === 0 ? (
                    <div style={styles.emptyState}>
                        <h3 style={{ fontSize: 18, color: "#111827", marginBottom: 8 }}>No Active Session</h3>
                        <p style={{ color: "#6b7280", fontSize: 14 }}>
                            Start a live session from the dashboard to monitor student progress in real-time.
                        </p>
                        <button style={styles.startBtn} onClick={() => window.location.href = "/instructor/"}>
                            Go to Dashboard
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Session Info Bar */}
                        {sessionInfo && (
                            <div style={styles.infoBar}>
                                <div>
                                    <div style={{ fontSize: 12, color: "#6b7280" }}>Exercise</div>
                                    <div style={{ fontSize: 15, fontWeight: 600 }}>{sessionInfo.exerciseTitle}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: "#6b7280" }}>Session Code</div>
                                    <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 1 }}>{sessionInfo.sessionCode}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: "#6b7280" }}>Participants</div>
                                    <div style={{ fontSize: 15, fontWeight: 600 }}>{participants.length}</div>
                                </div>
                            </div>
                        )}

                        {/* Stats */}
                        <div style={styles.statsRow}>
                            <div style={styles.statCard}>
                                <div style={{ fontSize: 28, fontWeight: 700, color: "#16a34a" }}>{completedCount}</div>
                                <div style={styles.statLabel}>Completed</div>
                            </div>
                            <div style={styles.statCard}>
                                <div style={{ fontSize: 28, fontWeight: 700, color: "#1565c0" }}>{activeCount}</div>
                                <div style={styles.statLabel}>In Progress</div>
                            </div>
                            <div style={styles.statCard}>
                                <div style={{ fontSize: 28, fontWeight: 700, color: "#6b7280" }}>{idleCount}</div>
                                <div style={styles.statLabel}>Idle</div>
                            </div>
                        </div>

                        {/* Participant List */}
                        {participants.length > 0 ? (
                            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ background: "#f9fafb" }}>
                                            <th style={styles.th}>Student</th>
                                            <th style={styles.th}>Status</th>
                                            <th style={styles.th}>Progress</th>
                                            <th style={styles.th}>Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {participants.map((p, i) => (
                                            <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                                <td style={styles.td}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                        <div style={styles.avatar}>{p.initials}</div>
                                                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                                                    </div>
                                                </td>
                                                <td style={styles.td}>
                                                    <span style={{
                                                        fontSize: 12, fontWeight: 600,
                                                        color: p.status === "Completed" ? "#16a34a" : p.status === "Active" ? "#1565c0" : "#6b7280",
                                                    }}>
                                                        {p.status === "Active" && "● "}{p.status}
                                                    </span>
                                                </td>
                                                <td style={styles.td}>
                                                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                                                        <div style={styles.progressBar}>
                                                            <div style={{ ...styles.progressFill, width: `${p.progress}%`, background: p.status === "Completed" ? "#16a34a" : "#1565c0" }} />
                                                        </div>
                                                        <span style={{ fontSize: 11, color: "#6b7280" }}>{p.progress}%</span>
                                                    </div>
                                                </td>
                                                <td style={styles.td}>
                                                    <span style={{ fontWeight: 700, color: p.score != null ? "#16a34a" : "#6b7280" }}>
                                                        {p.score != null ? `${p.score}%` : "—"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p style={{ color: "#6b7280", fontSize: 14 }}>No participants yet.</p>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    breadcrumb: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
    pageTitle: { fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 },
    liveBadge: { color: "#ef4444", fontWeight: 700, fontSize: 13 },
    endBtn: { background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
    emptyState: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 48, textAlign: "center" as const },
    startBtn: { background: "#8C1D40", color: "#fff", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 12 },
    infoBar: { display: "flex", gap: 32, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 24px", marginBottom: 20 },
    statsRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 },
    statCard: { background: "#fff", borderRadius: 12, padding: "16px 20px", border: "1px solid #e5e7eb" },
    statLabel: { fontSize: 12, color: "#6b7280", marginTop: 2 },
    th: { textAlign: "left" as const, padding: "12px 14px", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" as const, borderBottom: "1px solid #e5e7eb" },
    td: { padding: "14px", fontSize: 13, color: "#374151" },
    avatar: { width: 30, height: 30, borderRadius: "50%", background: "#8C1D40", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 },
    progressBar: { width: 100, height: 6, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" as const },
    progressFill: { height: "100%", borderRadius: 3 },
};
