"use client";
import React, { useState } from "react";
import { InstructorSidebar } from "../../../src/shared/InstructorSidebar";
import { useRoleGuard } from "../../../src/shared/useRoleGuard";

type TabType = "results" | "histories" | "trends";

interface StudentResult {
    name: string;
    email: string;
    attempt1: number | null;
    attempt2: number | null;
    change: "up" | "down" | "none";
    status: "Completed" | "Submitted" | "In Progress" | "Not Started";
}

const DEMO_RESULTS: StudentResult[] = [
    { name: "Jordan Lee", email: "jlee@asu.edu", attempt1: 85, attempt2: null, change: "up", status: "Completed" },
    { name: "Priya Sharma", email: "psharma@asu.edu", attempt1: 72, attempt2: null, change: "up", status: "Submitted" },
    { name: "Marcus Webb", email: "mwebb@asu.edu", attempt1: null, attempt2: null, change: "none", status: "In Progress" },
    { name: "Aisha Johnson", email: "ajohnson@asu.edu", attempt1: 91, attempt2: null, change: "up", status: "Completed" },
    { name: "Carlos Rivera", email: "crivera@asu.edu", attempt1: 58, attempt2: null, change: "up", status: "Submitted" },
    { name: "Emma Chen", email: "echen@asu.edu", attempt1: null, attempt2: null, change: "none", status: "Not Started" },
];

function getStatusStyle(status: string): React.CSSProperties {
    switch (status) {
        case "Completed": return { color: "#16a34a", fontWeight: 600 };
        case "Submitted": return { color: "#f97316", fontWeight: 600 };
        case "In Progress": return { color: "#1565c0", fontWeight: 600 };
        default: return { color: "#6b7280", fontWeight: 600 };
    }
}

export default function ResultsPage() {
    const allowed = useRoleGuard("INSTRUCTOR");
    const [tab, setTab] = useState<TabType>("results");
    const [exercise, setExercise] = useState("Office Building Development");
    const [statusFilter, setStatusFilter] = useState("All");

    if (!allowed) return null;

    const filtered = DEMO_RESULTS.filter((r) =>
        statusFilter === "All" || r.status === statusFilter
    );

    const scores = DEMO_RESULTS.filter((r) => r.attempt1 != null).map((r) => r.attempt1!);
    const classAvg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const highest = scores.length > 0 ? Math.max(...scores) : 0;
    const lowest = scores.length > 0 ? Math.min(...scores) : 0;
    const submitted = DEMO_RESULTS.filter((r) => r.status !== "Not Started" && r.status !== "In Progress").length;

    return (
        <div>
            <InstructorSidebar activeItem="results" />
            <main className="main-content">
                <div style={styles.breadcrumb}>Instructor &gt; Results</div>
                <h1 style={styles.pageTitle}>Results & History</h1>

                {/* Tabs */}
                <div style={styles.tabRow}>
                    <button style={tab === "results" ? styles.tabActive : styles.tabInactive} onClick={() => setTab("results")}>
                        Exercise Results
                    </button>
                    <button style={tab === "histories" ? styles.tabActive : styles.tabInactive} onClick={() => setTab("histories")}>
                        Student Histories
                    </button>
                    <button style={tab === "trends" ? styles.tabActive : styles.tabInactive} onClick={() => setTab("trends")}>
                        Score Trends
                    </button>
                </div>

                {tab === "results" && (
                    <>
                        {/* Filters */}
                        <div style={styles.filterRow}>
                            <select style={styles.filterSelect} value={exercise} onChange={(e) => setExercise(e.target.value)}>
                                <option>Office Building Development</option>
                                <option>Mixed-Use Development</option>
                            </select>
                            <select style={styles.filterSelectSm} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                <option>All</option>
                                <option>Completed</option>
                                <option>Submitted</option>
                                <option>In Progress</option>
                                <option>Not Started</option>
                            </select>
                            <input type="text" placeholder="mm/dd/yyyy" style={styles.dateInput} />
                            <input type="text" placeholder="mm/dd/yyyy" style={styles.dateInput} />
                            <div style={{ flex: 1 }} />
                            <button style={styles.downloadBtn}>📥 Download Report</button>
                        </div>

                        {/* Stats */}
                        <div style={styles.statsRow}>
                            <div style={styles.statCard}>
                                <div style={{ ...styles.statValue, color: "#8C1D40" }}>{classAvg}%</div>
                                <div style={styles.statLabel}>Class Average</div>
                            </div>
                            <div style={styles.statCard}>
                                <div style={{ ...styles.statValue, color: "#16a34a" }}>{highest}%</div>
                                <div style={styles.statLabel}>Highest Score</div>
                            </div>
                            <div style={styles.statCard}>
                                <div style={{ ...styles.statValue, color: "#ef4444" }}>{lowest}%</div>
                                <div style={styles.statLabel}>Lowest Score</div>
                            </div>
                            <div style={styles.statCard}>
                                <div style={styles.statValue}>{submitted}/{DEMO_RESULTS.length}</div>
                                <div style={styles.statLabel}>Submitted</div>
                            </div>
                        </div>

                        {/* Table */}
                        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                                <thead>
                                    <tr style={{ background: "#f9fafb" }}>
                                        <th style={styles.th}>Student</th>
                                        <th style={styles.th}>Email</th>
                                        <th style={styles.th}>Attempt 1</th>
                                        <th style={styles.th}>Attempt 2</th>
                                        <th style={styles.th}>Change</th>
                                        <th style={styles.th}>Status</th>
                                        <th style={styles.th}>Note</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((r, i) => (
                                        <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                            <td style={styles.td}><span style={{ fontWeight: 600 }}>{r.name}</span></td>
                                            <td style={styles.td}>{r.email}</td>
                                            <td style={styles.td}>{r.attempt1 != null ? `${r.attempt1}%` : "—"}</td>
                                            <td style={styles.td}>{r.attempt2 != null ? `${r.attempt2}%` : "—"}</td>
                                            <td style={styles.td}>
                                                {r.change === "up" && <span style={{ color: "#16a34a" }}>📈</span>}
                                                {r.change === "down" && <span style={{ color: "#ef4444" }}>📉</span>}
                                                {r.change === "none" && "—"}
                                            </td>
                                            <td style={styles.td}><span style={getStatusStyle(r.status)}>{r.status}</span></td>
                                            <td style={styles.td}>
                                                <button style={styles.noteBtn}>Add Note</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {tab === "histories" && (
                    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 32, textAlign: "center" as const }}>
                        <p style={{ color: "#6b7280" }}>Student Histories view — select a student to see their full attempt history across all exercises.</p>
                    </div>
                )}

                {tab === "trends" && (
                    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 32, textAlign: "center" as const }}>
                        <p style={{ color: "#6b7280" }}>Score Trends — class performance over time will be displayed here.</p>
                    </div>
                )}
            </main>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    breadcrumb: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
    pageTitle: { fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 20 },
    tabRow: { display: "flex", gap: 0, marginBottom: 24, borderBottom: "2px solid #e5e7eb" },
    tabActive: { background: "none", border: "none", borderBottom: "2px solid #8C1D40", color: "#8C1D40", fontWeight: 700, padding: "10px 20px", fontSize: 14, cursor: "pointer", marginBottom: -2 },
    tabInactive: { background: "none", border: "none", color: "#6b7280", fontWeight: 400, padding: "10px 20px", fontSize: 14, cursor: "pointer", marginBottom: -2 },
    filterRow: { display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" as const },
    filterSelect: { padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, minWidth: 200 },
    filterSelectSm: { padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, minWidth: 80 },
    dateInput: { padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, width: 120 },
    downloadBtn: { background: "#fff", border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
    statsRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 24 },
    statCard: { background: "#fff", borderRadius: 12, padding: "16px 20px", border: "1px solid #e5e7eb" },
    statValue: { fontSize: 28, fontWeight: 700, color: "#111827" },
    statLabel: { fontSize: 12, color: "#6b7280", marginTop: 2 },
    th: { textAlign: "left" as const, padding: "12px 14px", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" as const, borderBottom: "1px solid #e5e7eb" },
    td: { padding: "14px", fontSize: 13, color: "#374151" },
    noteBtn: { background: "#f3f4f6", border: "none", borderRadius: 4, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#374151" },
};
