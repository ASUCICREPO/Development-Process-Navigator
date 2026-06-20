"use client";
import React, { useEffect, useState } from "react";
import { api, getUserId } from "../../../src/shared/session";
import { Sidebar } from "../../../src/shared/Sidebar";
import { useRoleGuard } from "../../../src/shared/useRoleGuard";

interface AttemptRow {
    attemptId: string;
    exerciseId: string;
    exerciseTitle?: string;
    attemptNumber: number;
    isFinal: boolean;
    scorePercent: number;
    reflectionResponse: string | null;
    createdAt: string | null;
}

interface ExerciseGroup {
    exerciseId: string;
    title: string;
    date: string;
    attempts: AttemptRow[];
    finalScore: number;
    improvement: number | null; // difference between last and first attempt
}

export default function HistoryPage() {
    const allowed = useRoleGuard("STUDENT");
    const [groups, setGroups] = useState<ExerciseGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        loadHistory();
    }, []);

    async function loadHistory() {
        try {
            const studentId = getUserId();
            if (!studentId) { setErr("Not logged in."); setLoading(false); return; }
            const client = api();
            const res: any = await client.getHistory(studentId);
            const attempts: AttemptRow[] = res.attempts ?? [];

            // Fetch exercise list for friendly titles
            let exerciseTitles: Record<string, string> = {};
            try {
                const exRes: any = await client.listExercises();
                const exList = exRes.exercises ?? exRes ?? [];
                for (const ex of exList) {
                    exerciseTitles[ex.exerciseId] = ex.title || ex.name || ex.exerciseId;
                }
            } catch { }

            // Group by exercise
            const byExercise: Record<string, AttemptRow[]> = {};
            for (const a of attempts) {
                if (!byExercise[a.exerciseId]) byExercise[a.exerciseId] = [];
                byExercise[a.exerciseId].push(a);
            }

            const exerciseGroups: ExerciseGroup[] = Object.entries(byExercise).map(([exId, rows]) => {
                rows.sort((a, b) => a.attemptNumber - b.attemptNumber);
                const finalAttempt = rows.find((r) => r.isFinal) ?? rows[rows.length - 1];
                const firstScore = rows[0]?.scorePercent ?? 0;
                const lastScore = finalAttempt?.scorePercent ?? 0;
                const improvement = rows.length > 1 ? lastScore - firstScore : null;
                const latestDate = rows[rows.length - 1]?.createdAt;

                return {
                    exerciseId: exId,
                    title: exerciseTitles[exId] || rows[0]?.exerciseTitle || exId,
                    date: latestDate
                        ? new Date(latestDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "",
                    attempts: rows,
                    finalScore: lastScore,
                    improvement,
                };
            });

            setGroups(exerciseGroups);
        } catch (e: any) {
            setErr(e.message);
        } finally {
            setLoading(false);
        }
    }

    function getScoreColor(score: number): string {
        if (score >= 80) return "#16a34a";
        if (score >= 50) return "#f97316";
        return "#ef4444";
    }

    if (!allowed) return null;

    return (
        <div style={{ display: "flex" }}>
            <Sidebar activeItem="history" />
            <main className="main-content">
                {/* Breadcrumb */}
                <div style={styles.breadcrumb}>Student &gt; History</div>
                <h1 style={styles.pageTitle}>My History</h1>

                {loading && <p style={{ color: "#6b7280" }}>Loading history...</p>}
                {err && <p className="error">{err}</p>}

                {!loading && groups.length === 0 && !err && (
                    <p style={{ color: "#6b7280", fontSize: 14 }}>
                        No submissions yet. Complete an exercise to see your history here.
                    </p>
                )}

                {/* Exercise History Cards */}
                {groups.length > 0 && (
                    <div style={styles.historyCard}>
                        {groups.map((group) => (
                            <div key={group.exerciseId} style={styles.exerciseRow}>
                                <div style={styles.exerciseInfo}>
                                    <div style={styles.exerciseTitle}>{group.title}</div>
                                    <div style={styles.exerciseDate}>{group.date}</div>
                                </div>
                                <div style={styles.exerciseRight}>
                                    {/* Attempt scores */}
                                    {group.attempts.map((a) => (
                                        <span key={a.attemptId} style={styles.attemptScore}>
                                            Attempt {a.attemptNumber}: {a.scorePercent}%
                                        </span>
                                    ))}

                                    {/* Improvement indicator */}
                                    {group.improvement !== null && group.improvement > 0 && (
                                        <span style={styles.improvement}>
                                            📈 +{group.improvement}%
                                        </span>
                                    )}

                                    {/* Score circle */}
                                    <div style={{
                                        ...styles.scoreCircle,
                                        borderColor: getScoreColor(group.finalScore),
                                        color: getScoreColor(group.finalScore),
                                    }}>
                                        {group.finalScore}%
                                    </div>

                                    {/* Final badge */}
                                    {group.attempts.some((a) => a.isFinal) && (
                                        <span style={styles.finalBadge}>Final</span>
                                    )}

                                    {/* Details button */}
                                    <button
                                        style={styles.detailsBtn}
                                        onClick={() => {
                                            const finalAttempt = group.attempts.find((a) => a.isFinal) ?? group.attempts[group.attempts.length - 1];
                                            window.location.href = `/student/history/detail?attemptId=${finalAttempt.attemptId}&title=${encodeURIComponent(group.title)}`;
                                        }}
                                    >
                                        Details
                                    </button>

                                    {/* Expand chevron */}
                                    <span
                                        style={styles.chevron}
                                        onClick={() => setExpandedId(expandedId === group.exerciseId ? null : group.exerciseId)}
                                    >
                                        {expandedId === group.exerciseId ? "⌃" : "⌄"}
                                    </span>
                                </div>

                                {/* Expanded details */}
                                {expandedId === group.exerciseId && (
                                    <div style={styles.detailsPanel}>
                                        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                                            <thead>
                                                <tr>
                                                    <th style={styles.th}>Attempt</th>
                                                    <th style={styles.th}>Score</th>
                                                    <th style={styles.th}>Status</th>
                                                    <th style={styles.th}>Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group.attempts.map((a) => (
                                                    <tr key={a.attemptId}>
                                                        <td style={styles.td}>#{a.attemptNumber}</td>
                                                        <td style={{ ...styles.td, fontWeight: 700, color: getScoreColor(a.scorePercent) }}>
                                                            {a.scorePercent}%
                                                        </td>
                                                        <td style={styles.td}>
                                                            {a.isFinal ? <span style={{ color: "#8C1D40", fontWeight: 600 }}>Final</span> : "Draft"}
                                                        </td>
                                                        <td style={styles.td}>
                                                            {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "—"}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Reflection History */}
                {groups.some((g) => g.attempts.some((a) => a.reflectionResponse)) && (
                    <div style={styles.historyCard}>
                        <h3 style={styles.sectionTitle}>Reflection History</h3>
                        {groups.map((group) => {
                            const reflections = group.attempts.filter((a) => a.reflectionResponse);
                            if (reflections.length === 0) return null;
                            return (
                                <div key={`ref-${group.exerciseId}`} style={{ marginBottom: 20 }}>
                                    <div style={styles.reflectionHeader}>
                                        <span style={styles.reflectionExTitle}>{group.title}</span>
                                        <span style={styles.reflectionDate}>{group.date}</span>
                                    </div>
                                    {reflections.map((a) => (
                                        <div key={a.attemptId} style={styles.reflectionItem}>
                                            <p style={styles.reflectionText}>{a.reflectionResponse}</p>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    breadcrumb: {
        fontSize: 12,
        color: "#6b7280",
        marginBottom: 4,
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: 700,
        color: "#111827",
        marginBottom: 24,
    },
    historyCard: {
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        padding: "24px",
        marginBottom: 24,
    },
    exerciseRow: {
        padding: "16px 0",
        borderBottom: "1px solid #f3f4f6",
        display: "flex",
        flexWrap: "wrap" as const,
        alignItems: "center",
        gap: 12,
    },
    exerciseInfo: {
        flex: 1,
        minWidth: 200,
    },
    exerciseTitle: {
        fontSize: 15,
        fontWeight: 600,
        color: "#111827",
    },
    exerciseDate: {
        fontSize: 12,
        color: "#6b7280",
        marginTop: 2,
    },
    exerciseRight: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap" as const,
    },
    attemptScore: {
        fontSize: 12,
        color: "#6b7280",
    },
    improvement: {
        fontSize: 12,
        color: "#16a34a",
        fontWeight: 600,
    },
    scoreCircle: {
        width: 44,
        height: 44,
        borderRadius: "50%",
        border: "3px solid",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700,
    },
    finalBadge: {
        background: "#8C1D40",
        color: "#fff",
        fontSize: 11,
        fontWeight: 700,
        padding: "4px 10px",
        borderRadius: 4,
    },
    detailsBtn: {
        background: "#1a1a1a",
        color: "#fff",
        border: "none",
        borderRadius: 4,
        padding: "6px 14px",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
    },
    chevron: {
        fontSize: 16,
        color: "#6b7280",
        cursor: "pointer",
        padding: "4px 8px",
    },
    detailsPanel: {
        width: "100%",
        marginTop: 12,
        padding: "12px 16px",
        background: "#f9fafb",
        borderRadius: 8,
    },
    th: {
        textAlign: "left" as const,
        padding: "6px 8px",
        borderBottom: "1px solid #e5e7eb",
        fontWeight: 600,
        color: "#374151",
        fontSize: 12,
    },
    td: {
        padding: "6px 8px",
        borderBottom: "1px solid #f3f4f6",
        fontSize: 13,
        color: "#374151",
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 700,
        color: "#111827",
        marginBottom: 16,
    },
    reflectionHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    reflectionExTitle: {
        fontSize: 14,
        fontWeight: 600,
        color: "#111827",
    },
    reflectionDate: {
        fontSize: 12,
        color: "#6b7280",
    },
    reflectionItem: {
        borderLeft: "3px solid #8C1D40",
        paddingLeft: 12,
        marginBottom: 8,
        marginLeft: 4,
    },
    reflectionText: {
        fontSize: 13,
        color: "#374151",
        lineHeight: 1.5,
        margin: 0,
    },
};
