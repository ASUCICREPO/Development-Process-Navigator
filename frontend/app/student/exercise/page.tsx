"use client";
import React, { useEffect, useState } from "react";
import { api } from "../../../src/shared/session";
import { ExerciseBoard } from "../../../src/student/ExerciseBoard";
import { ExerciseView } from "../../../src/shared/types";
import { useRoleGuard } from "../../../src/shared/useRoleGuard";

export default function ExercisePage() {
    const allowed = useRoleGuard("STUDENT");
    const [exerciseId, setExerciseId] = useState("");
    const [exercise, setExercise] = useState<ExerciseView | null>(null);
    const [started, setStarted] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get("id");
        if (id) {
            setExerciseId(id);
            loadExercise(id);
        }
    }, []);

    async function loadExercise(id?: string) {
        const targetId = id || exerciseId;
        if (!targetId) return;
        setErr(null);
        setLoading(true);
        try {
            const ex = (await api().getExercise(targetId)) as ExerciseView;
            setExercise(ex);
        } catch (e: any) {
            setErr(e.message);
        } finally {
            setLoading(false);
        }
    }

    if (!allowed) return null;

    // Exercise loaded but not yet started — show intro card
    if (exercise && !started) {
        return (
            <div style={{ paddingTop: 80 }}>
                <div style={styles.introWrapper}>
                    <div style={styles.introCard}>
                        <span style={styles.badge}>Standard Scenario</span>
                        <h1 style={styles.title}>
                            {exercise.exerciseId}
                        </h1>
                        <p style={styles.description}>
                            In this exercise you will sequence the roles, tasks, and analytical tests involved
                            in developing a commercial project. Drag each activity card into the
                            phase where it typically occurs. A card may appear in more than one phase.
                        </p>

                        <div style={styles.statsRow}>
                            <div style={styles.statBox}>
                                <div style={styles.statNumber}>{exercise.activities.length}</div>
                                <div style={styles.statLabel}>Activity Cards</div>
                            </div>
                            <div style={styles.statBox}>
                                <div style={styles.statNumber}>{exercise.phases.length}</div>
                                <div style={styles.statLabel}>Phases</div>
                            </div>
                        </div>

                        <p style={styles.metaText}>Assigned by Instructor</p>
                        <p style={styles.dueDate}>Due: TBD</p>

                        <button
                            style={styles.beginBtn}
                            onClick={() => setStarted(true)}
                        >
                            Begin Exercise
                        </button>
                        <a
                            href="/student/"
                            style={styles.saveLink}
                        >
                            Save for later
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    // Exercise started — show the board
    if (exercise && started) {
        return (
            <div style={{ marginTop: 56 }}>
                <ExerciseBoard api={api()} exercise={exercise} />
            </div>
        );
    }

    // No exercise loaded — show ID input
    return (
        <div style={{ paddingTop: 80 }}>
            <div style={styles.introWrapper}>
                <div style={styles.introCard}>
                    <h1 style={{ ...styles.title, fontSize: 20 }}>Load an Exercise</h1>
                    <p style={styles.description}>
                        Enter the Exercise ID provided by your instructor to begin.
                    </p>
                    <div style={{ marginTop: 16 }}>
                        <input
                            data-testid="exercise-id-input"
                            value={exerciseId}
                            onChange={(e) => setExerciseId(e.target.value)}
                            placeholder="Enter exercise ID..."
                            style={styles.input}
                        />
                    </div>
                    {err && <p style={{ color: "#ef4444", marginTop: 8, fontSize: 14 }}>{err}</p>}
                    <button
                        style={styles.beginBtn}
                        onClick={() => loadExercise()}
                        disabled={!exerciseId || loading}
                    >
                        {loading ? "Loading..." : "Load Exercise"}
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    introWrapper: {
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        minHeight: "calc(100vh - 120px)",
        padding: "40px 24px",
    },
    introCard: {
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #e5e7eb",
        padding: "40px 48px",
        maxWidth: 540,
        width: "100%",
        textAlign: "center",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
    },
    badge: {
        display: "inline-block",
        background: "#8C1D40",
        color: "#fff",
        fontSize: 11,
        fontWeight: 700,
        padding: "4px 12px",
        borderRadius: 12,
        textTransform: "uppercase" as const,
        letterSpacing: 0.5,
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 700,
        color: "#8C1D40",
        marginBottom: 12,
    },
    description: {
        fontSize: 14,
        color: "#6b7280",
        lineHeight: 1.6,
        marginBottom: 24,
    },
    statsRow: {
        display: "flex",
        gap: 16,
        justifyContent: "center",
        marginBottom: 24,
    },
    statBox: {
        background: "#fef9e7",
        borderRadius: 12,
        padding: "16px 32px",
        minWidth: 120,
    },
    statNumber: {
        fontSize: 28,
        fontWeight: 700,
        color: "#8C1D40",
    },
    statLabel: {
        fontSize: 12,
        color: "#6b7280",
        marginTop: 2,
    },
    metaText: {
        fontSize: 13,
        color: "#6b7280",
        marginBottom: 4,
    },
    dueDate: {
        fontSize: 13,
        color: "#ef4444",
        fontWeight: 600,
        marginBottom: 24,
    },
    beginBtn: {
        display: "block",
        width: "100%",
        background: "#FFC627",
        color: "#1a1a1a",
        border: "none",
        borderRadius: 8,
        padding: "14px 24px",
        fontSize: 16,
        fontWeight: 700,
        cursor: "pointer",
        marginBottom: 12,
    },
    saveLink: {
        display: "block",
        fontSize: 13,
        color: "#6b7280",
        textDecoration: "underline",
        cursor: "pointer",
    },
    input: {
        width: "100%",
        padding: "12px 16px",
        border: "1px solid #d1d5db",
        borderRadius: 8,
        fontSize: 15,
        outline: "none",
    },
};
