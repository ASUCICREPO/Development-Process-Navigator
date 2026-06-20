"use client";
import React, { useEffect, useState } from "react";
import { API_BASE, getToken } from "../../../../src/shared/session";
import { InstructorSidebar } from "../../../../src/shared/InstructorSidebar";
import { useRoleGuard } from "../../../../src/shared/useRoleGuard";

interface Template { templateId: string; source: string; name: string; }

interface ActivityRow {
    activityId: string;
    title: string;
    description: string;
    roleType: string;
    phases: Record<string, boolean>;
    weight: number;
}

async function authed(path: string, method = "GET", body?: unknown) {
    const token = getToken();
    if (!token) throw new Error("Session expired.");
    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({ error: `HTTP ${res.status}` }))).error || `Failed`);
    return res.json();
}

const TEMPLATE_CARDS = [
    { name: "Office Building", desc: "Standard commercial office development" },
    { name: "Mixed-Use Development", desc: "Retail + residential combination" },
    { name: "Single-Family Residential", desc: "Suburban residential project" },
    { name: "Master Plan", desc: "Large-scale multi-phase development" },
    { name: "Industrial/Warehouse", desc: "Logistics and manufacturing facility" },
    { name: "Public/Civic", desc: "Government or institutional building" },
];

const DEFAULT_PHASES = ["Pre-Dev", "Due Dilig.", "Concept", "Build", "Operations"];

export default function NewExercisePage() {
    const allowed = useRoleGuard("INSTRUCTOR");
    const [step, setStep] = useState(1);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [configId, setConfigId] = useState<string | null>(null);
    const [activities, setActivities] = useState<ActivityRow[]>([]);
    const [phases, setPhases] = useState<string[]>(DEFAULT_PHASES);
    const [exerciseId, setExerciseId] = useState<string | null>(null);
    const [exerciseName, setExerciseName] = useState("Office Building Development");
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        authed("/templates").then((r) => setTemplates(r.templates ?? [])).catch(() => { });
    }, []);

    async function handleContinueFromTemplate() {
        setErr(null);
        try {
            // Use the first template (seed) or match by name
            const tid = templates[0]?.templateId || "";
            const cfg = await authed("/configurations", "POST", { name: exerciseName, templateId: tid });
            setConfigId(cfg.configId);

            // Build activity rows from snapshot
            const snap = cfg.snapshot || {};
            const acts = (snap.activities || []).map((a: any) => {
                const phaseMap: Record<string, boolean> = {};
                for (const p of (snap.phases || DEFAULT_PHASES)) {
                    phaseMap[p] = false;
                }
                // Set phases from mappings
                for (const m of (snap.mappings || [])) {
                    if (m.activityId === a.activityId && m.weight > 0) {
                        phaseMap[m.phase] = true;
                    }
                }
                return {
                    activityId: a.activityId,
                    title: a.title || a.activityId,
                    description: a.description || "",
                    roleType: "People",
                    phases: phaseMap,
                    weight: 5,
                };
            });
            setActivities(acts);
            if (snap.phases) setPhases(snap.phases);
            setStep(2);
        } catch (e: any) {
            setErr(e.message);
        }
    }

    async function handlePublish() {
        if (!configId) return;
        setErr(null);
        try {
            const result = await authed(`/configurations/${configId}/apply`, "POST");
            setExerciseId(result.exerciseId);
            setStep(3);
        } catch (e: any) {
            setErr(e.message);
        }
    }

    function togglePhase(actIdx: number, phase: string) {
        setActivities((prev) => {
            const updated = [...prev];
            updated[actIdx] = {
                ...updated[actIdx],
                phases: { ...updated[actIdx].phases, [phase]: !updated[actIdx].phases[phase] },
            };
            return updated;
        });
    }

    function removeActivity(idx: number) {
        setActivities((prev) => prev.filter((_, i) => i !== idx));
    }

    function addActivity() {
        const newId = `act-${Date.now()}`;
        const phaseMap: Record<string, boolean> = {};
        phases.forEach((p) => (phaseMap[p] = false));
        setActivities((prev) => [...prev, {
            activityId: newId, title: "", description: "", roleType: "People",
            phases: phaseMap, weight: 5,
        }]);
    }

    function getPhaseCount(phase: string): number {
        return activities.filter((a) => a.phases[phase]).length;
    }

    if (!allowed) return null;

    return (
        <div>
            <InstructorSidebar activeItem="exercises" />
            <main className="main-content">
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                        <div style={styles.breadcrumb}>Instructor &gt; Exercises &gt; {step === 1 ? "Choose Template" : step === 2 ? "Configure" : "Assign"}</div>
                        <h1 style={styles.pageTitle}>{step === 3 ? "Exercise Published" : "New Exercise"}</h1>
                    </div>
                    <a href="/instructor/" style={{ color: "#6b7280", fontSize: 13, textDecoration: "none" }}>
                        ← Back to Dashboard
                    </a>
                </div>

                {/* Stepper */}
                <div style={styles.stepper}>
                    <StepIndicator num={1} label="Choose Template" active={step >= 1} completed={step > 1} />
                    <div style={styles.stepLine} />
                    <StepIndicator num={2} label="Customize Activities" active={step >= 2} completed={step > 2} />
                    <div style={styles.stepLine} />
                    <StepIndicator num={3} label="Assign to Students" active={step >= 3} completed={false} />
                </div>

                {err && <p style={{ color: "#ef4444", marginBottom: 12 }}>{err}</p>}

                {/* Step 1: Choose Template */}
                {step === 1 && (
                    <>
                        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 20 }}>
                            Select a development scenario template to begin.
                        </p>
                        <div style={styles.templateGrid}>
                            {TEMPLATE_CARDS.map((t, i) => (
                                <div
                                    key={i}
                                    style={{
                                        ...styles.templateCard,
                                        borderColor: selectedTemplate === t.name ? "#8C1D40" : "#e5e7eb",
                                        background: selectedTemplate === t.name ? "#fdf2f4" : "#fff",
                                    }}
                                    onClick={() => { setSelectedTemplate(t.name); setExerciseName(`${t.name} Development`); }}
                                >
                                    <h4 style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>{t.name}</h4>
                                    <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{t.desc}</p>
                                </div>
                            ))}
                        </div>
                        <button
                            style={{ ...styles.primaryBtn, marginTop: 24, opacity: selectedTemplate ? 1 : 0.5 }}
                            onClick={handleContinueFromTemplate}
                            disabled={!selectedTemplate}
                        >
                            Continue →
                        </button>
                    </>
                )}

                {/* Step 2: Customize Activities */}
                {step === 2 && (
                    <div style={styles.step2Layout}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Activity Table</h3>
                            <div style={{ overflowX: "auto" }}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>#</th>
                                            <th style={styles.th}>Activity Name</th>
                                            <th style={styles.th}>Role Type</th>
                                            <th style={styles.th}>Assigned Phase(s)</th>
                                            <th style={styles.th}>Weight</th>
                                            <th style={styles.th}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activities.map((act, idx) => (
                                            <tr key={act.activityId}>
                                                <td style={styles.td}>{idx + 1}</td>
                                                <td style={styles.td}>
                                                    <input
                                                        value={act.title}
                                                        onChange={(e) => {
                                                            const updated = [...activities];
                                                            updated[idx].title = e.target.value;
                                                            setActivities(updated);
                                                        }}
                                                        style={{ border: "none", fontSize: 13, fontWeight: 500, width: "100%", outline: "none" }}
                                                    />
                                                </td>
                                                <td style={styles.td}>
                                                    <select
                                                        value={act.roleType}
                                                        onChange={(e) => {
                                                            const updated = [...activities];
                                                            updated[idx].roleType = e.target.value;
                                                            setActivities(updated);
                                                        }}
                                                        style={{ fontSize: 12, border: "1px solid #d1d5db", borderRadius: 4, padding: "2px 6px" }}
                                                    >
                                                        <option>People</option>
                                                        <option>Task</option>
                                                        <option>Test</option>
                                                    </select>
                                                </td>
                                                <td style={styles.td}>
                                                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                                        {phases.map((p) => (
                                                            <button
                                                                key={p}
                                                                onClick={() => togglePhase(idx, p)}
                                                                style={{
                                                                    fontSize: 10, padding: "2px 8px", borderRadius: 4,
                                                                    border: "none", cursor: "pointer", fontWeight: 600,
                                                                    background: act.phases[p] ? "#8C1D40" : "#f3f4f6",
                                                                    color: act.phases[p] ? "#fff" : "#6b7280",
                                                                }}
                                                            >
                                                                {p}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td style={styles.td}>
                                                    <input
                                                        type="number"
                                                        value={act.weight}
                                                        onChange={(e) => {
                                                            const updated = [...activities];
                                                            updated[idx].weight = parseInt(e.target.value) || 0;
                                                            setActivities(updated);
                                                        }}
                                                        style={{ width: 40, fontSize: 13, border: "1px solid #d1d5db", borderRadius: 4, padding: "2px 4px", textAlign: "center" }}
                                                    />
                                                </td>
                                                <td style={styles.td}>
                                                    <button onClick={() => removeActivity(idx)} style={styles.deleteBtn}>🗑</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <button onClick={addActivity} style={styles.addLink}>+ Add Activity</button>

                            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                                <button style={styles.backBtn} onClick={() => setStep(1)}>← Back</button>
                                <button style={styles.secondaryBtn}>Save Draft</button>
                                <button style={styles.primaryBtn} onClick={handlePublish}>Continue to Assign →</button>
                            </div>
                        </div>

                        {/* Phase Overview sidebar */}
                        <div style={styles.phaseOverview}>
                            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Phase Overview</h4>
                            {phases.map((p, i) => {
                                const colors = ["#8C1D40", "#e65100", "#2e7d32", "#1565c0", "#4a148c"];
                                return (
                                    <div key={p} style={{ marginBottom: 10 }}>
                                        <div style={{ background: colors[i % colors.length], color: "#fff", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700 }}>
                                            {p}
                                        </div>
                                        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                                            {getPhaseCount(p)} activities assigned
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Step 3: Published / Assign */}
                {step === 3 && (
                    <div style={styles.successSection}>
                        <div style={styles.successCard}>
                            <h3 style={{ color: "#16a34a", marginBottom: 8 }}>Exercise Published!</h3>
                            <p style={{ fontSize: 14, color: "#374151" }}>
                                Your exercise is live. Share the Exercise ID with students:
                            </p>
                            <code style={styles.codeBlock}>{exerciseId}</code>
                            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 12 }}>
                                Students can enter this ID on their exercise page to begin.
                            </p>
                        </div>
                        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                            <button style={styles.primaryBtn} onClick={() => window.location.href = "/instructor/"}>
                                Back to Dashboard
                            </button>
                            <button style={styles.secondaryBtn} onClick={() => { setStep(1); setExerciseId(null); setConfigId(null); }}>
                                Create Another
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

function StepIndicator({ num, label, active, completed }: { num: number; label: string; active: boolean; completed: boolean }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
                width: 28, height: 28, borderRadius: "50%", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700,
                background: completed ? "#16a34a" : active ? "#8C1D40" : "#e5e7eb",
                color: active || completed ? "#fff" : "#6b7280",
            }}>
                {completed ? "✓" : num}
            </div>
            <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#111827" : "#6b7280" }}>
                {label}
            </span>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    breadcrumb: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
    pageTitle: { fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 },
    stepper: {
        display: "flex", alignItems: "center", gap: 0, marginBottom: 32,
        padding: "16px 0", borderBottom: "1px solid #e5e7eb",
    },
    stepLine: { flex: 1, height: 2, background: "#e5e7eb", margin: "0 12px" },
    templateGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 },
    templateCard: {
        border: "2px solid #e5e7eb", borderRadius: 10, padding: "20px 24px",
        cursor: "pointer", transition: "border-color 0.15s",
    },
    primaryBtn: {
        background: "#8C1D40", color: "#fff", border: "none", borderRadius: 8,
        padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
    },
    secondaryBtn: {
        background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8,
        padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer",
    },
    backBtn: {
        background: "#fff", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8,
        padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer",
    },
    step2Layout: { display: "flex", gap: 24 },
    table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 },
    th: { textAlign: "left" as const, padding: "8px 10px", borderBottom: "2px solid #e5e7eb", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" as const },
    td: { padding: "10px", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" as const },
    deleteBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 16 },
    addLink: { background: "none", border: "none", color: "#8C1D40", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 12, padding: 0 },
    phaseOverview: {
        width: 200, flexShrink: 0, background: "#fff", border: "1px solid #e5e7eb",
        borderRadius: 12, padding: 16,
    },
    successSection: { maxWidth: 500 },
    successCard: {
        background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 24,
    },
    codeBlock: {
        display: "block", background: "#f3f4f6", padding: "12px 16px",
        borderRadius: 6, fontSize: 14, fontFamily: "monospace", marginTop: 8,
        wordBreak: "break-all" as const,
    },
};
