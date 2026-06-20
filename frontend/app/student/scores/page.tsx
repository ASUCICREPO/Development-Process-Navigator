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
    createdAt: string | null;
}

interface ScoreCard {
    exerciseId: string;
    title: string;
    date: string;
    finalScore: number;
    attempts: { number: number; score: number }[];
}

function getScoreColor(score: number): string {
    if (score >= 80) return "#16a34a";
    if (score >= 50) return "#f97316";
    return "#ef4444";
}

// Simple SVG donut chart
function DonutChart({ score, size = 64 }: { score: number; size?: number }) {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = getScoreColor(score);

    return (
        <svg width={size} height={size} style={{ display: "block", margin: "0 auto 12px" }}>
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth={6}
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={6}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
            <text
                x={size / 2}
                y={size / 2}
                textAnchor="middle"
                dy="0.35em"
                fontSize={14}
                fontWeight={700}
                fill={color}
            >
                {score}%
            </text>
        </svg>
    );
}

export default function ScoresPage() {
    const allowed = useRoleGuard("STUDENT");
    const [cards, setCards] = useState<ScoreCard[]>([]);
    const [avgScore, setAvgScore] = useState(0);
    const [bestScore, setBestScore] = useState(0);
    const [exercisesDone, setExercisesDone] = useState(0);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        loadScores();
    }, []);

    async function loadScores() {
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

            const scoreCards: ScoreCard[] = Object.entries(byExercise).map(([exId, rows]) => {
                rows.sort((a, b) => a.attemptNumber - b.attemptNumber);
                const finalAttempt = rows.find((r) => r.isFinal) ?? rows[rows.length - 1];
                const latestDate = finalAttempt?.createdAt;

                return {
                    exerciseId: exId,
                    title: exerciseTitles[exId] || rows[0]?.exerciseTitle || exId,
                    date: latestDate
                        ? new Date(latestDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "",
                    finalScore: finalAttempt?.scorePercent ?? 0,
                    attempts: rows.map((r) => ({ number: r.attemptNumber, score: r.scorePercent })),
                };
            });

            setCards(scoreCards);

            // Calculate stats
            const finalScores = scoreCards.map((c) => c.finalScore);
            const avg = finalScores.length > 0 ? Math.round(finalScores.reduce((a, b) => a + b, 0) / finalScores.length) : 0;
            const best = finalScores.length > 0 ? Math.max(...finalScores) : 0;

            setAvgScore(avg);
            setBestScore(best);
            setExercisesDone(scoreCards.length);
        } catch (e: any) {
            setErr(e.message);
        } finally {
            setLoading(false);
        }
    }

    if (!allowed) return null;

    return (
        <div style={{ display: "flex" }}>
            <Sidebar activeItem="scores" />
            <main className="main-content">
                {/* Breadcrumb */}
                <div style={styles.breadcrumb}>Student &gt; Scores</div>
                <h1 style={styles.pageTitle}>My Scores</h1>

                {loading && <p style={{ color: "#6b7280" }}>Loading scores...</p>}
                {err && <p className="error">{err}</p>}

                {!loading && (
                    <>
                        {/* Top Stats */}
                        <div style={styles.statsRow}>
                            <div style={styles.statCard}>
                                <div style={{ ...styles.statValue, color: "#8C1D40" }}>{avgScore}%</div>
                                <div style={styles.statLabel}>Average Score</div>
                            </div>
                            <div style={styles.statCard}>
                                <div style={{ ...styles.statValue, color: "#8C1D40" }}>{bestScore}%</div>
                                <div style={styles.statLabel}>Personal Best</div>
                            </div>
                            <div style={styles.statCard}>
                                <div style={{ ...styles.statValue, color: "#111827" }}>{exercisesDone}</div>
                                <div style={styles.statLabel}>Exercises Done</div>
                            </div>
                        </div>

                        {/* Score Cards Grid */}
                        {cards.length === 0 ? (
                            <p style={{ color: "#6b7280", fontSize: 14 }}>
                                No scores yet. Complete an exercise to see your scores here.
                            </p>
                        ) : (
                            <div style={styles.cardsGrid}>
                                {cards.map((card) => (
                                    <div key={card.exerciseId} style={styles.scoreCard}>
                                        <DonutChart score={card.finalScore} size={72} />
                                        <h4 style={styles.cardTitle}>{card.title}</h4>
                                        <p style={styles.cardDate}>{card.date}</p>
                                        <p style={styles.cardAttempts}>
                                            {card.attempts.map((a) => `Attempt ${a.number}: ${a.score}%`).join(" · ")}
                                        </p>
                                        <button
                                            style={styles.breakdownBtn}
                                            onClick={() => window.location.href = `/student/history?id=${card.exerciseId}`}
                                        >
                                            View Full Breakdown →
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
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
    statsRow: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 16,
        marginBottom: 24,
    },
    statCard: {
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        padding: "20px 24px",
    },
    statValue: {
        fontSize: 36,
        fontWeight: 700,
    },
    statLabel: {
        fontSize: 13,
        color: "#6b7280",
        marginTop: 4,
    },
    cardsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 20,
    },
    scoreCard: {
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        padding: "24px",
        textAlign: "center" as const,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: 600,
        color: "#111827",
        margin: "0 0 4px",
    },
    cardDate: {
        fontSize: 12,
        color: "#6b7280",
        margin: "0 0 8px",
    },
    cardAttempts: {
        fontSize: 12,
        color: "#6b7280",
        margin: "0 0 16px",
    },
    breakdownBtn: {
        width: "100%",
        background: "#f3f4f6",
        color: "#374151",
        border: "none",
        borderRadius: 8,
        padding: "10px 16px",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
    },
};
