"use client";
import React, { useState } from "react";
import { InstructorSidebar } from "../../../src/shared/InstructorSidebar";
import { useRoleGuard } from "../../../src/shared/useRoleGuard";

interface Participant {
    name: string;
    initials: string;
    status: "Active" | "Completed" | "Idle";
    progress: number;
    score: number | null;
}

const DEMO_PARTICIPANTS: Participant[] = [
    { name: "Jordan Lee", initials: "JL", status: "Completed", progress: 100, score: 85 },
    { name: "Priya Sharma", initials: "PS", status: "Active", progress: 65, score: null },
    { name: "Marcus Webb", initials: "MW", status: "Active", progress: 40, score: null },
    { name: "Aisha Johnson", initials: "AJ", status: "Completed", progress: 100, score: 91 },
    { name: "Carlos Rivera", initials: "CR", status: "Idle", progress: 10, score: null },
];

export default function SessionPage() {
    const allowed = useRoleGuard("INSTRUCTOR");
    const [sessionActive, setSessionActive] = useState(true);

    if (!allowed) return null;

    const completedCount = DEMO_PARTICIPANTS.filter((p) => p.status === "Completed").length;
    const activeCount = DEMO_PARTICIPANTS.filter((p) => p.status === "Active").length;

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

                {!sessionActive ? (
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
                        <div style={styles.infoBar}>
                            <div>
                                <div style={{ fontSize: 12, color: "#6b7280" }}>Exercise</div>
                                <div style={{ fontSize: 15, fontWeight: 600 }}>Office Building Development</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: "#6b7280" }}>Session Code</div>
                                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 1 }}>DELTA-7</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: "#6b7280" }}>Duration</div>
                                <div style={{ fontSize: 15, fontWeight: 600 }}>12:34</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: "#6b7280" }}>Participants</div>
                                <div style={{ fontSize: 15, fontWeight: 600 }}>{DEMO_PARTICIPANTS.length}</div>
                            </div>
                        </div>

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
                                <div style={{ fontSize: 28, fontWeight: 700, color: "#6b7280" }}>{DEMO_PARTICIPANTS.length - completedCount - activeCount}</div>
                                <div style={styles.statLabel}>Idle</div>
                            </div>
                        </div>

                        {/* Participant List */}
                        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                                <thead>
                                    <tr style={{ background: "#f9fafb" }}>
                                        <th style={styles.th}>Student</th>
                                        <th style={styles.th}>Status</th>
                                        <th style={styles.th}>Progress</th>
                                        <th style={styles.th}>Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {DEMO_PARTICIPANTS.map((p, i) => (
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
                                                <div style={styles.progressBar}>
                                                    <div style={{
                                                        ...styles.progressFill,
                                                        width: `${p.progress}%`,
                                                        background: p.status === "Completed" ? "#16a34a" : "#1565c0",
                                                    }} />
                                                </div>
                                                <span style={{ fontSize: 11, color: "#6b7280" }}>{p.progress}%</span>
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
                    </>
                )}
            </main>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    breadcrumb: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
    pageTitle: { fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 },
    liveBadge: { color: "#ef4444", fontWeight: 700, fontSize: 13, animation: "pulse 2s infinite" },
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
    progressBar: { width: 100, height: 6, background: "#e5e7eb", borderRadius: 3, overflow: "hidden", display: "inline-block", marginRight: 8, verticalAlign: "middle" as const },
    progressFill: { height: "100%", borderRadius: 3 },
};
