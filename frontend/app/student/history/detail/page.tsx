"use client";
import React, { useEffect, useState } from "react";
import { api } from "../../../../src/shared/session";
import { Sidebar } from "../../../../src/shared/Sidebar";
import { useRoleGuard } from "../../../../src/shared/useRoleGuard";

interface PhaseResult {
    phase: string;
    status: string;
    weight: number;
}

interface CardFeedback {
    activityId: string;
    placedPhases: string[];
    earned: number;
    max: number;
    perPhase: PhaseResult[];
}

interface AttemptDetail {
    attemptId: string;
    exerciseId: string;
    attemptNumber: number;
    isFinal: boolean;
    scorePercent: number;
    createdAt: string | null;
    cardFeedback: CardFeedback[];
    weakestMatch: { activityId: string; phase: string; reflectionPrompt?: string } | null;
    reflectionResponse: string | null;
}

const PHASE_COLORS: Record<string, string> = {
    "PRE-DEVELOPMENT": "#8C1D40",
    "DUE DILIGENCE": "#e65100",
    "CONCEPT & ANALYSIS": "#2e7d32",
    "IMPLEMENTATION": "#1565c0",
    "IMPLEMENTATION / BUILD": "#1565c0",
    "OPERATIONS": "#4a148c",
    "OPERATIONS & MGMT": "#4a148c",
    "PLANNING": "#8C1D40",
    "CONSTRUCTION": "#1565c0",
};

function getPhaseColor(phase: string): string {
    const upper = phase.toUpperCase();
    for (const [key, color] of Object.entries(PHASE_COLORS)) {
        if (upper.includes(key) || key.includes(upper)) return color;
    }
    return "#374151";
}

function getScoreColor(score: number): string {
    if (score >= 80) return "#16a34a";
    if (score >= 50) return "#f97316";
    return "#ef4444";
}

function DonutChart({ score, size = 90 }: { score: number; size?: number }) {
    const radius = (size - 10) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = getScoreColor(score);
    return (
        <svg width={size} height={size}>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={8} />
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
                stroke={color} strokeWidth={8} strokeDasharray={circumference}
                strokeDashoffset={offset} strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`} />
            <text x={size / 2} y={size / 2} textAnchor="middle" dy="0.35em"
                fontSize={20} fontWeight={700} fill={color}>{score}%</text>
        </svg>
    );
}

export default function HistoryDetailPage() {
    const allowed = useRoleGuard("STUDENT");
    const [detail, setDetail] = useState<AttemptDetail | null>(null);
    const [exerciseTitle, setExerciseTitle] = useState("");
    const [activityNames, setActivityNames] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const attemptId = params.get("attemptId");
        const exTitle = params.get("title");
        if (exTitle) setExerciseTitle(decodeURIComponent(exTitle));
        if (attemptId) loadDetail(attemptId);
        else { setErr("No attempt ID provided."); setLoading(false); }
    }, []);

    async function loadDetail(attemptId: string) {
        try {
            const client = api();
            const res: any = await client.getAttempt(attemptId);
            setDetail(res);

            // Fetch exercise data to get activity titles
            try {
                const exData: any = await client.getExercise(res.exerciseId);
                const names: Record<string, string> = {};
                for (const act of (exData.activities ?? [])) {
                    names[act.activityId] = act.title || act.activityId;
                }
                setActivityNames(names);
            } catch {
                // Exercise may have been deleted/re-applied — format IDs nicely
                const names: Record<string, string> = {};
                for (const card of (res.cardFeedback ?? [])) {
                    const match = card.activityId.match(/act-(\d+)/);
                    names[card.activityId] = match ? `Activity ${match[1]}` : card.activityId;
                }
                setActivityNames(names);
            }

            // Fetch exercise title if not already set
            if (!exerciseTitle) {
                try {
                    const exRes: any = await client.listExercises();
                    const exList = exRes.exercises ?? exRes ?? [];
                    const match = exList.find((e: any) => e.exerciseId === res.exerciseId);
                    if (match) setExerciseTitle(match.title || match.exerciseId);
                    else setExerciseTitle(res.exerciseId);
                } catch {
                    setExerciseTitle(res.exerciseId);
                }
            }
        } catch (e: any) {
            setErr(e.message);
        } finally {
            setLoading(false);
        }
    }

    if (!allowed) return null;

    if (loading) {
        return (
            <div style={{ display: "flex" }}>
                <Sidebar activeItem="history" />
                <main className="main-content">
                    <p style={{ color: "#6b7280" }}>Loading details...</p>
                </main>
            </div>
        );
    }

    if (err || !detail) {
        return (
            <div style={{ display: "flex" }}>
                <Sidebar activeItem="history" />
                <main className="main-content">
                    <p className="error">{err || "Failed to load."}</p>
                    <a href="/student/history/" style={{ color: "#8C1D40", fontWeight: 600 }}>← Back to History</a>
                </main>
            </div>
        );
    }

    // Build phase breakdown from card feedback
    const phaseGroups: Record<string, { correct: string[]; incorrect: { name: string; placedIn: string }[] }> = {};
    const phaseScores: Record<string, { earned: number; max: number }> = {};

    for (const card of detail.cardFeedback) {
        const name = activityNames[card.activityId] || card.activityId;
        for (const pp of card.perPhase) {
            if (!phaseGroups[pp.phase]) {
                phaseGroups[pp.phase] = { correct: [], incorrect: [] };
                phaseScores[pp.phase] = { earned: 0, max: 0 };
            }
            phaseScores[pp.phase].max += pp.weight;
            if (pp.status === "CORRECT" || pp.status === "PARTIAL") {
                phaseGroups[pp.phase].correct.push(name);
                phaseScores[pp.phase].earned += pp.status === "CORRECT" ? pp.weight : Math.round(pp.weight * 0.5);
            } else {
                const actualPhases = card.placedPhases.filter((p) => p !== pp.phase);
                phaseGroups[pp.phase].incorrect.push({
                    name,
                    placedIn: actualPhases.length > 0 ? actualPhases.join(", ") : "",
                });
            }
        }
    }

    const phases = Object.keys(phaseGroups);

    return (
        <div style={{ display: "flex" }}>
            <Sidebar activeItem="history" />
            <main className="main-content">
                {/* Header */}
                <div style={styles.headerCard}>
                    <DonutChart score={detail.scorePercent} size={90} />
                    <div style={styles.headerInfo}>
                        <div style={styles.badges}>
                            <span style={styles.badgeMaroon}>{exerciseTitle.split(" ")[0] || "Exercise"}</span>
                            <span style={styles.badgeGold}>Standard</span>
                        </div>
                        <h1 style={styles.headerTitle}>{exerciseTitle}</h1>
                        <p style={styles.headerMeta}>
                            Submitted {detail.createdAt ? new Date(detail.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                        </p>
                        <p style={styles.headerAttempts}>
                            Attempt {detail.attemptNumber}: <strong>{detail.scorePercent}%</strong>
                        </p>
                    </div>
                </div>

                {/* Phase Breakdown */}
                <h2 style={styles.sectionTitle}>Phase Breakdown</h2>

                {phases.map((phase) => {
                    const group = phaseGroups[phase];
                    const score = phaseScores[phase];
                    const pct = score.max > 0 ? Math.round((score.earned / score.max) * 100) : 0;
                    const color = getPhaseColor(phase);
                    const allCorrect = group.incorrect.length === 0 && group.correct.length > 0;

                    return (
                        <div key={phase} style={styles.phaseSection}>
                            <div style={{ ...styles.phaseBar, background: color }}>
                                <span style={styles.phaseName}>{phase}</span>
                                <span style={styles.phasePercent}>{pct}%</span>
                            </div>
                            {group.correct.map((n, i) => (
                                <div key={`c-${i}`} style={styles.resultRow}>
                                    <span style={styles.checkMark}>✓</span>
                                    <span style={styles.resultText}>{n}</span>
                                </div>
                            ))}
                            {allCorrect && (
                                <div style={styles.resultRow}>
                                    <span style={{ ...styles.checkMark, color: "#16a34a" }}>✓</span>
                                    <span style={{ fontSize: 13, color: "#16a34a", fontWeight: 600 }}>All correct!</span>
                                </div>
                            )}
                            {group.incorrect.map((item, i) => (
                                <div key={`x-${i}`} style={styles.resultRow}>
                                    <span style={styles.crossMark}>✗</span>
                                    <span style={styles.resultText}>
                                        {item.name}{item.placedIn ? <span style={{ color: "#6b7280", fontStyle: "italic" }}> — Placed in: {item.placedIn}</span> : null}
                                    </span>
                                </div>
                            ))}
                        </div>
                    );
                })}

                {/* Reflection Prompt */}
                {detail.weakestMatch?.reflectionPrompt && (
                    <div style={styles.reflectionCard}>
                        <h4 style={{ color: "#8C1D40", margin: "0 0 8px", fontSize: 14 }}>Reflection Prompt</h4>
                        <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
                            {detail.weakestMatch.reflectionPrompt}
                        </p>
                    </div>
                )}

                {/* Instructor Feedback / Reflection Response */}
                {detail.reflectionResponse && (
                    <div style={styles.feedbackCard}>
                        <h4 style={{ color: "#e65100", margin: "0 0 8px", fontSize: 14 }}>Instructor Feedback</h4>
                        <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
                            {detail.reflectionResponse}
                        </p>
                    </div>
                )}

                {/* Action buttons */}
                <div style={styles.actionRow}>
                    <button style={styles.tryAgainBtn}
                        onClick={() => window.location.href = `/student/exercise?id=${detail.exerciseId}`}>
                        Try This Exercise Again
                    </button>
                    <button style={styles.backBtn}
                        onClick={() => window.location.href = "/student/history/"}>
                        Back to History
                    </button>
                </div>
            </main>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    headerCard: {
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "24px 32px",
        display: "flex",
        alignItems: "center",
        gap: 24,
        marginBottom: 32,
    },
    headerInfo: { flex: 1 },
    badges: { display: "flex", gap: 8, marginBottom: 8 },
    badgeMaroon: {
        background: "#8C1D40", color: "#fff", fontSize: 11, fontWeight: 700,
        padding: "3px 10px", borderRadius: 4,
    },
    badgeGold: {
        background: "#FFC627", color: "#1a1a1a", fontSize: 11, fontWeight: 700,
        padding: "3px 10px", borderRadius: 4,
    },
    headerTitle: { fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 4px" },
    headerMeta: { fontSize: 13, color: "#6b7280", margin: "0 0 4px" },
    headerAttempts: { fontSize: 13, color: "#374151", margin: 0 },
    sectionTitle: { fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 16 },
    phaseSection: {
        marginBottom: 20, background: "#fff", border: "1px solid #e5e7eb",
        borderRadius: 10, overflow: "hidden",
    },
    phaseBar: {
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 16px", color: "#fff",
    },
    phaseName: { fontSize: 13, fontWeight: 700, textTransform: "uppercase" as const },
    phasePercent: { fontSize: 13, fontWeight: 700 },
    resultRow: {
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 16px", borderBottom: "1px solid #f3f4f6",
    },
    checkMark: { color: "#16a34a", fontWeight: 700, fontSize: 15, width: 18 },
    crossMark: { color: "#ef4444", fontWeight: 700, fontSize: 15, width: 18 },
    resultText: { fontSize: 14, color: "#374151" },
    reflectionCard: {
        borderLeft: "4px solid #FFC627", background: "#fffbeb",
        borderRadius: 8, padding: "16px 20px", marginTop: 24, marginBottom: 16,
    },
    feedbackCard: {
        borderLeft: "4px solid #e65100", background: "#fff7ed",
        borderRadius: 8, padding: "16px 20px", marginBottom: 24,
    },
    actionRow: { display: "flex", gap: 12, marginTop: 32, marginBottom: 40 },
    tryAgainBtn: {
        background: "#8C1D40", color: "#fff", border: "none", borderRadius: 8,
        padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
    },
    backBtn: {
        background: "#fff", color: "#8C1D40", border: "2px solid #8C1D40",
        borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
    },
};
