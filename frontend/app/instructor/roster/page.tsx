"use client";
import React, { useEffect, useState } from "react";
import { API_BASE, getToken } from "../../../src/shared/session";
import { InstructorSidebar } from "../../../src/shared/InstructorSidebar";
import { useRoleGuard } from "../../../src/shared/useRoleGuard";

interface Student {
    id: string;
    name: string;
    email: string;
    initials: string;
    joined: string;
    exercise: string;
    score: number | null;
    status: "Completed" | "Submitted" | "In Progress" | "Not Started";
}

async function authed(path: string, method = "GET", body?: unknown) {
    const token = getToken();
    if (!token) throw new Error("Session expired.");
    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
    return res.json();
}

const AVATAR_COLORS = ["#8C1D40", "#e65100", "#2e7d32", "#1565c0", "#4a148c", "#bf360c", "#1b5e20", "#283593"];

function getAvatarColor(idx: number) { return AVATAR_COLORS[idx % AVATAR_COLORS.length]; }

function getInitials(name: string): string {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

function getStatusStyle(status: string): React.CSSProperties {
    switch (status) {
        case "Completed": return { color: "#16a34a", fontWeight: 600, fontSize: 12 };
        case "Submitted": return { color: "#f97316", fontWeight: 600, fontSize: 12 };
        case "In Progress": return { color: "#1565c0", fontWeight: 600, fontSize: 12 };
        default: return { color: "#6b7280", fontWeight: 600, fontSize: 12 };
    }
}

export default function RosterPage() {
    const allowed = useRoleGuard("INSTRUCTOR");
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All Statuses");
    const [showFilterDrop, setShowFilterDrop] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addTab, setAddTab] = useState<"email" | "code">("email");
    const [inviteEmail, setInviteEmail] = useState("");
    const [joinCode, setJoinCode] = useState("ASU-2026");
    const [viewStudent, setViewStudent] = useState<Student | null>(null);
    const [studentHistory, setStudentHistory] = useState<{ title: string; score: number }[]>([]);

    useEffect(() => { loadRoster(); }, []);

    useEffect(() => {
        if (viewStudent) {
            // Fetch this student's exercise history
            authed(`/students/${viewStudent.id}/history`).then((res) => {
                const attempts = res.attempts ?? [];
                const byExercise: Record<string, number> = {};
                for (const a of attempts) {
                    const eid = a.exerciseId;
                    if (!byExercise[eid] || a.scorePercent > byExercise[eid]) {
                        byExercise[eid] = a.scorePercent || 0;
                    }
                }
                setStudentHistory(Object.entries(byExercise).map(([eid, score]) => ({
                    title: eid.slice(0, 12),
                    score,
                })));
            }).catch(() => setStudentHistory([]));
        } else {
            setStudentHistory([]);
        }
    }, [viewStudent]);

    async function loadRoster() {
        try {
            const res = await authed("/roster");
            const roster = (res.roster ?? []).map((s: any) => ({
                id: s.studentId,
                name: s.name || "Student",
                email: s.email || "",
                initials: getInitials(s.name || "ST"),
                joined: s.joined ? new Date(s.joined).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
                exercise: s.exercise || "",
                score: s.score,
                status: (s.status || "Not Started") as Student["status"],
            }));
            setStudents(roster);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }

    function generateJoinCode() {
        authed("/join-codes", "POST").then((res) => {
            setJoinCode(res.code || "ASU-0000");
        }).catch(() => {
            const num = Math.floor(Math.random() * 9000) + 1000;
            setJoinCode(`ASU-${num}`);
        });
    }

    const filtered = students.filter((s) => {
        const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "All Statuses" || s.status === statusFilter;
        return matchSearch && matchStatus;
    });

    function exportCSV() {
        const headers = ["#", "Name", "Email", "Joined", "Exercise", "Score", "Status"];
        const rows = filtered.map((s, i) => [
            i + 1,
            s.name,
            s.email,
            s.joined,
            s.exercise,
            s.score != null ? `${s.score}%` : "",
            s.status,
        ]);
        const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "student-roster.csv";
        a.click();
        URL.revokeObjectURL(url);
    }

    if (!allowed) return null;

    return (
        <div>
            <InstructorSidebar activeItem="roster" />

            {/* Add Student Modal */}
            {showAddModal && (
                <div style={styles.overlay} onClick={() => setShowAddModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>Add Student</h2>
                            <button style={styles.closeBtn} onClick={() => setShowAddModal(false)}>×</button>
                        </div>

                        {/* Tabs */}
                        <div style={styles.tabRow}>
                            <button
                                style={addTab === "email" ? styles.tabActive : styles.tabInactive}
                                onClick={() => setAddTab("email")}
                            >By Email Invite</button>
                            <button
                                style={addTab === "code" ? styles.tabActive : styles.tabInactive}
                                onClick={() => setAddTab("code")}
                            >By Join Code</button>
                        </div>

                        {addTab === "email" && (
                            <>
                                <label style={styles.modalLabel}>Student Email (ASU)</label>
                                <input
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="name@asu.edu"
                                    style={styles.modalInput}
                                />
                                <button style={styles.sendInviteBtn} onClick={async () => {
                                    if (!inviteEmail) return;
                                    try {
                                        await authed("/roster/add", "POST", { email: inviteEmail });
                                        setInviteEmail("");
                                        loadRoster();
                                        alert("Student added!");
                                    } catch (e: any) { alert(e.message); }
                                }}>Send Invite</button>
                            </>
                        )}

                        {addTab === "code" && (
                            <>
                                <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 12 }}>Share this code with your students:</p>
                                <div style={styles.codeDisplay}>{joinCode}</div>
                                <div style={styles.codeActions}>
                                    <button style={styles.copyBtn}>📋 Copy Link</button>
                                    <button style={styles.regenBtn} onClick={generateJoinCode}>↻ Regenerate</button>
                                </div>
                            </>
                        )}

                        <div style={styles.modalFooter}>
                            <button style={styles.cancelBtn} onClick={() => setShowAddModal(false)}>Cancel</button>
                            <button style={styles.doneBtn} onClick={() => setShowAddModal(false)}>Done</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Student Modal */}
            {viewStudent && (
                <div style={styles.overlay} onClick={() => setViewStudent(null)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>Student Detail</h2>
                            <button style={styles.closeBtn} onClick={() => setViewStudent(null)}>×</button>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                            <div style={{ ...styles.avatarLg, background: getAvatarColor(parseInt(viewStudent.id)) }}>
                                {viewStudent.initials}
                            </div>
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{viewStudent.name}</div>
                                <div style={{ fontSize: 13, color: "#6b7280" }}>{viewStudent.email}</div>
                            </div>
                        </div>

                        <div style={styles.detailGrid}>
                            <div style={styles.detailBox}>
                                <div style={styles.detailLabel}>Joined</div>
                                <div style={styles.detailValue}>{viewStudent.joined}</div>
                            </div>
                            <div style={styles.detailBox}>
                                <div style={styles.detailLabel}>Exercise</div>
                                <div style={styles.detailValue}>{viewStudent.exercise}</div>
                            </div>
                            <div style={styles.detailBox}>
                                <div style={styles.detailLabel}>Score</div>
                                <div style={styles.detailValue}>{viewStudent.score != null ? `${viewStudent.score}%` : "—"}</div>
                            </div>
                            <div style={styles.detailBox}>
                                <div style={styles.detailLabel}>Status</div>
                                <div style={styles.detailValue}>{viewStudent.status}</div>
                            </div>
                        </div>

                        <h4 style={{ fontSize: 15, fontWeight: 700, marginTop: 20, marginBottom: 12 }}>Exercise History</h4>
                        {studentHistory.length === 0 ? (
                            <p style={{ color: "#6b7280", fontSize: 13 }}>No exercise history yet.</p>
                        ) : (
                            studentHistory.map((h, i) => (
                                <div key={i} style={styles.historyItem}>
                                    <span>{h.title}</span>
                                    <span style={{ color: h.score >= 80 ? "#16a34a" : h.score >= 50 ? "#f97316" : "#ef4444", fontWeight: 700 }}>{h.score}%</span>
                                </div>
                            ))
                        )}

                        <div style={{ marginTop: 24, textAlign: "center" as const }}>
                            <button style={styles.doneBtn} onClick={() => setViewStudent(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            <main className="main-content">
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                    <div>
                        <div style={styles.breadcrumb}>Instructor &gt; Roster</div>
                        <h1 style={styles.pageTitle}>Student Roster</h1>
                    </div>
                    <button style={styles.addStudentBtn} onClick={() => setShowAddModal(true)}>+ Add Student</button>
                </div>

                {/* Filters */}
                <div style={styles.filterRow}>
                    <input
                        placeholder="Search students..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={styles.searchInput}
                    />
                    <div style={{ position: "relative" as const }}>
                        <button style={styles.filterBtn} onClick={() => setShowFilterDrop(!showFilterDrop)}>
                            {statusFilter} ▾
                        </button>
                        {showFilterDrop && (
                            <div style={styles.filterDrop}>
                                {["All Statuses", "Completed", "In Progress", "Submitted", "Not Started"].map((s) => (
                                    <div
                                        key={s}
                                        style={{ ...styles.filterOption, color: statusFilter === s ? "#8C1D40" : "#374151", fontWeight: statusFilter === s ? 700 : 400 }}
                                        onClick={() => { setStatusFilter(s); setShowFilterDrop(false); }}
                                    >{s}</div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button style={styles.exportBtn} onClick={exportCSV}>📥 Export CSV</button>
                </div>

                {/* Table */}
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                        <thead>
                            <tr style={{ background: "#f9fafb" }}>
                                <th style={styles.th}>#</th>
                                <th style={styles.th}>Student</th>
                                <th style={styles.th}>Email</th>
                                <th style={styles.th}>Joined</th>
                                <th style={styles.th}>Exercise</th>
                                <th style={styles.th}>Score</th>
                                <th style={styles.th}>Status</th>
                                <th style={styles.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((s, idx) => (
                                <tr key={s.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                    <td style={styles.td}>{idx + 1}</td>
                                    <td style={styles.td}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <div style={{ ...styles.avatar, background: getAvatarColor(idx) }}>{s.initials}</div>
                                            <span style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</span>
                                        </div>
                                    </td>
                                    <td style={styles.td}>{s.email}</td>
                                    <td style={styles.td}>{s.joined}</td>
                                    <td style={styles.td}>{s.exercise}</td>
                                    <td style={{ ...styles.td, fontWeight: 700, color: s.score != null ? (s.score >= 80 ? "#16a34a" : s.score >= 50 ? "#f97316" : "#ef4444") : "#6b7280" }}>
                                        {s.score != null ? `${s.score}%` : "—"}
                                    </td>
                                    <td style={styles.td}><span style={getStatusStyle(s.status)}>{s.status}</span></td>
                                    <td style={styles.td}>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button style={styles.viewBtn} onClick={() => setViewStudent(s)}>View</button>
                                            <button style={styles.deleteBtn} onClick={async () => {
                                                if (!confirm(`Remove ${s.name} from your roster?`)) return;
                                                try {
                                                    await authed(`/roster/${s.id}`, "DELETE");
                                                    setStudents((prev) => prev.filter((st) => st.id !== s.id));
                                                } catch (e: any) { alert(e.message); }
                                            }}>🗑</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    breadcrumb: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
    pageTitle: { fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 },
    addStudentBtn: { background: "#8C1D40", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
    filterRow: { display: "flex", gap: 12, marginBottom: 20, alignItems: "center" },
    searchInput: { padding: "8px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, width: 220 },
    filterBtn: { background: "#fff", border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer" },
    filterDrop: { position: "absolute" as const, top: 36, left: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 50, minWidth: 140, overflow: "hidden" },
    filterOption: { padding: "8px 14px", fontSize: 13, cursor: "pointer" },
    exportBtn: { background: "#fff", border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer" },
    th: { textAlign: "left" as const, padding: "12px 14px", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" as const, borderBottom: "1px solid #e5e7eb" },
    td: { padding: "12px 14px", fontSize: 13, color: "#374151" },
    avatar: { width: 30, height: 30, borderRadius: "50%", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 },
    avatarLg: { width: 52, height: 52, borderRadius: "50%", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 },
    viewBtn: { background: "#f3f4f6", border: "none", borderRadius: 4, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
    deleteBtn: { background: "none", border: "none", fontSize: 14, cursor: "pointer", color: "#ef4444" },
    // Modals
    overlay: { position: "fixed" as const, top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
    modal: { background: "#fff", borderRadius: 16, padding: 32, width: 440, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" },
    modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 },
    closeBtn: { background: "none", border: "none", fontSize: 24, color: "#6b7280", cursor: "pointer", padding: 0 },
    tabRow: { display: "flex", gap: 0, marginBottom: 20, borderBottom: "2px solid #e5e7eb" },
    tabActive: { background: "none", border: "none", borderBottom: "2px solid #8C1D40", color: "#8C1D40", fontWeight: 700, padding: "8px 16px", fontSize: 14, cursor: "pointer", marginBottom: -2 },
    tabInactive: { background: "none", border: "none", color: "#6b7280", fontWeight: 400, padding: "8px 16px", fontSize: 14, cursor: "pointer", marginBottom: -2 },
    modalLabel: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
    modalInput: { width: "100%", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, marginBottom: 16 },
    sendInviteBtn: { width: "100%", background: "#8C1D40", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
    codeDisplay: { background: "#f3f4f6", borderRadius: 10, padding: "16px 24px", textAlign: "center" as const, fontSize: 28, fontWeight: 800, color: "#8C1D40", letterSpacing: 3, marginBottom: 12 },
    codeActions: { display: "flex", gap: 12, marginBottom: 16 },
    copyBtn: { flex: 1, background: "#f3f4f6", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
    regenBtn: { flex: 1, background: "#f3f4f6", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
    modalFooter: { display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 },
    cancelBtn: { background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
    doneBtn: { background: "#8C1D40", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
    // Student detail modal
    detailGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
    detailBox: { background: "#f9fafb", borderRadius: 8, padding: "12px 16px" },
    detailLabel: { fontSize: 11, color: "#6b7280", marginBottom: 2 },
    detailValue: { fontSize: 15, fontWeight: 700, color: "#111827" },
    historyItem: { display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6", fontSize: 14 },
};
