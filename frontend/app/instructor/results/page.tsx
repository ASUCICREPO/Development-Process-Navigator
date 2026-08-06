"use client";
import React, { useEffect, useState } from "react";
import { API_BASE, getToken } from "../../../src/shared/session";
import { InstructorSidebar } from "../../../src/shared/InstructorSidebar";
import { useRoleGuard } from "../../../src/shared/useRoleGuard";

type TabType = "results" | "histories" | "trends";

interface StudentResult {
    name: string;
    email: string;
    attempt1: number | null;
    attempt2: number | null;
    change: string;
    status: string;
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
    const [exercises, setExercises] = useState<{ exerciseId: string; title: string }[]>([]);
    const [selectedExercise, setSelectedExercise] = useState("");
    const [results, setResults] = useState<StudentResult[]>([]);
    const [stats, setStats] = useState({ classAverage: 0, highest: 0, lowest: 0, submitted: 0, total: 0 });
    const [statusFilter, setStatusFilter] = useState("All");
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadExercises(); }, []);

    async function loadExercises() {
        try {
            const res = await authed("/exercises");
            const exList = (res.exercises ?? []).map((e: any) => ({ exerciseId: e.exerciseId, title: e.title || e.exerciseId }));
            setExercises(exList);
            if (exList.length > 0) {
                setSelectedExercise(exList[0].exerciseId);
                await loadResults(exList[0].exerciseId);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }

    async function loadResults(exerciseId: string) {
        try {
            const res = await authed(`/exercises/${exerciseId}/detailed-results`);
            setResults(res.results ?? []);
            setStats(res.stats ?? { classAverage: 0, highest: 0, lowest: 0, submitted: 0, total: 0 });
        } catch {
            setResults([]);
            setStats({ classAverage: 0, highest: 0, lowest: 0, submitted: 0, total: 0 });
        }
    }

    function onExerciseChange(eid: string) {
        setSelectedExercise(eid);
        loadResults(eid);
    }

    if (!allowed) return null;

    const filtered = statusFilter === "All" ? results : results.filter((r) => r.status === statusFilter);

    return (
        <div>
            <InstructorSidebar activeItem="results" />
            <main className="main-content">
                <div style={styles.breadcrumb}>Instructor &gt; Results</div>
                <h1 style={styles.pageTitle}>Results & History</h1>

                {/* Tabs */}
                <div style={styles.tabRow}>
                    <button style={tab === "results" ? styles.tabActive : styles.tabInactive} onClick={() => setTab("results")}>Exercise Results</button>
                    <button style={tab === "histories" ? styles.tabActive : styles.tabInactive} onClick={() => setTab("histories")}>Student Histories</button>
                    <button style={tab === "trends" ? styles.tabActive : styles.tabInactive} onClick={() => setTab("trends")}>Score Trends</button>
                </div>

                {tab === "results" && (
                    <>
                        {/* Filters */}
                        <div style={styles.filterRow}>
                            <select style={styles.filterSelect} value={selectedExercise} onChange={(e) => onExerciseChange(e.target.value)}>
                                {exercises.map((ex) => <option key={ex.exerciseId} value={ex.exerciseId}>{ex.title}</option>)}
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
                            <button style={styles.downloadBtn} onClick={() => {
                                const headers = ["Student", "Email", "Attempt 1", "Attempt 2", "Change", "Status"];
                                const rows = filtered.map((r) => [r.name, r.email, r.attempt1 ?? "", r.attempt2 ?? "", r.change, r.status]);
                                const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
                                const blob = new Blob([csv], { type: "text/csv" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a"); a.href = url; a.download = "exercise-results.csv"; a.click();
                                URL.revokeObjectURL(url);
                            }}>📥 Download Report</button>
                        </div>

                        {/* Stats */}
                        <div style={styles.statsRow}>
                            <div style={styles.statCard}>
                                <div style={{ ...styles.statValue, color: "#8C1D40" }}>{stats.classAverage}%</div>
                                <div style={styles.statLabel}>Class Average</div>
                            </div>
                            <div style={styles.statCard}>
                                <div style={{ ...styles.statValue, color: "#16a34a" }}>{stats.highest}%</div>
                                <div style={styles.statLabel}>Highest Score</div>
                            </div>
                            <div style={styles.statCard}>
                                <div style={{ ...styles.statValue, color: "#ef4444" }}>{stats.lowest}%</div>
                                <div style={styles.statLabel}>Lowest Score</div>
                            </div>
                            <div style={styles.statCard}>
                                <div style={styles.statValue}>{stats.submitted}/{stats.total}</div>
                                <div style={styles.statLabel}>Submitted</div>
                            </div>
                        </div>

                        {/* Table */}
                        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
                            {loading ? <p style={{ padding: 20, color: "#6b7280" }}>Loading...</p> : filtered.length === 0 ? (
                                <p style={{ padding: 20, color: "#6b7280" }}>No results yet for this exercise.</p>
                            ) : (
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ background: "#f9fafb" }}>
                                            <th style={styles.th}>Student</th>
                                            <th style={styles.th}>Email</th>
                                            <th style={styles.th}>Attempt 1</th>
                                            <th style={styles.th}>Attempt 2</th>
                                            <th style={styles.th}>Change</th>
                                            <th style={styles.th}>Status</th>
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
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                )}

                {tab === "histories" && (
                    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 32, textAlign: "center" }}>
                        <p style={{ color: "#6b7280" }}>Student Histories — select a student to see their full attempt history.</p>
                    </div>
                )}

                {tab === "trends" && (
                    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 32, textAlign: "center" }}>
                        <p style={{ color: "#6b7280" }}>Score Trends — class performance over time.</p>
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
};
