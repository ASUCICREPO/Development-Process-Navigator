"use client";
import React, { useEffect, useState } from "react";
import { API_BASE, getToken } from "../../../src/shared/session";
import { InstructorSidebar } from "../../../src/shared/InstructorSidebar";
import { ScenarioCustomizer } from "../../../src/instructor/ScenarioCustomizer";
import { useRoleGuard } from "../../../src/shared/useRoleGuard";

interface Template { templateId: string; source: string; name: string; }

async function authed(path: string, method = "GET", body?: unknown) {
    const token = getToken();
    if (!token) throw new Error("Session expired.");
    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({ error: `HTTP ${res.status}` }))).error || `Request failed`);
    return res.json();
}

export default function ExercisesPage() {
    const allowed = useRoleGuard("INSTRUCTOR");
    const [templates, setTemplates] = useState<Template[]>([]);
    const [templateId, setTemplateId] = useState("");
    const [name, setName] = useState("Real Estate Demo");
    const [exerciseId, setExerciseId] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [tab, setTab] = useState<"create" | "configure">("create");

    useEffect(() => {
        authed("/templates")
            .then((r) => {
                setTemplates(r.templates);
                if (r.templates[0]) {
                    setTemplateId(r.templates[0].templateId);
                    setName(r.templates[0].name);
                }
            })
            .catch((e) => setErr(e.message));
    }, []);

    function onTemplateChange(id: string) {
        setTemplateId(id);
        const t = templates.find((x) => x.templateId === id);
        if (t) setName(t.name);
    }

    async function createAndApply() {
        setErr(null);
        try {
            const cfg = await authed("/configurations", "POST", { name, templateId });
            const applied = await authed(`/configurations/${cfg.configId}/apply`, "POST");
            setExerciseId(applied.exerciseId);
        } catch (e: any) {
            setErr(e.message);
        }
    }

    if (!allowed) return null;

    return (
        <div>
            <InstructorSidebar activeItem="exercises" />
            <main className="main-content">
                <div style={styles.breadcrumb}>Instructor &gt; Exercises</div>
                <h1 style={styles.pageTitle}>My Exercises</h1>

                {/* How this works — quick orientation */}
                <div style={styles.howCard}>
                    <div style={styles.howTitle}>How to set up an assignment</div>
                    <ol style={styles.howList}>
                        <li><strong>Pick a scenario</strong> below (e.g. Multi-Tenant Retail) and click <strong>Create &amp; Publish</strong>. Optionally use <strong>Customize a Scenario</strong> first to adjust the answer key.</li>
                        <li><strong>Get students into your class</strong> — go to <a href="/instructor/roster" style={styles.howLink}>Student Roster</a> and either invite them by email or share a <strong>Join Code</strong>.</li>
                        <li><strong>Share the Exercise ID</strong> (shown after you publish) so students can open the assignment.</li>
                        <li><strong>Review results</strong> anytime under <a href="/instructor/results" style={styles.howLink}>Results &amp; History</a>.</li>
                    </ol>
                </div>

                {/* Tabs */}
                <div style={styles.tabRow}>
                    <button
                        style={tab === "create" ? styles.tabActive : styles.tabInactive}
                        onClick={() => setTab("create")}
                    >
                        Create from Template
                    </button>
                    <button
                        style={tab === "configure" ? styles.tabActive : styles.tabInactive}
                        onClick={() => setTab("configure")}
                    >
                        Customize a Scenario
                    </button>
                </div>

                {tab === "create" && (
                    <div style={styles.card}>
                        {err && <p style={{ color: "#ef4444", marginBottom: 12 }}>{err}</p>}

                        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Create New Exercise</h3>
                        <p style={styles.cardHint}>
                            Choose a ready-made scenario, give it a name, and publish. Students will complete
                            it as a multi-round card sort. To edit the answer key first, use the
                            &ldquo;Customize a Scenario&rdquo; tab.
                        </p>

                        <label style={styles.label}>Scenario / Template</label>
                        <select
                            value={templateId}
                            onChange={(e) => onTemplateChange(e.target.value)}
                            style={styles.select}
                        >
                            {templates.map((t) => (
                                <option key={t.templateId} value={t.templateId}>
                                    {t.name} ({t.source === "SYSTEM_SEEDED" ? "Scenario" : "Saved"})
                                </option>
                            ))}
                        </select>
                        <p style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                            The five scenarios (Land Speculation, Master-Planned Community, Finished Lots,
                            Multi-Tenant Retail, Residential Condominium) each run the full five-round card sort.
                        </p>

                        <label style={styles.label}>Exercise Name</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={styles.input}
                        />

                        <button style={styles.createBtn} onClick={createAndApply}>
                            Create & Publish Exercise
                        </button>

                        {exerciseId && (
                            <div style={styles.successCard}>
                                <h4 style={{ margin: "0 0 8px", color: "#16a34a" }}>✓ Exercise published</h4>
                                <p style={{ margin: "0 0 8px", fontSize: 14 }}>
                                    Your assignment is ready. Share this <strong>Exercise ID</strong> with your
                                    students — they enter it after logging in to open the assignment:
                                </p>
                                <div style={styles.idRow}>
                                    <code style={styles.code}>{exerciseId}</code>
                                    <button
                                        style={styles.copyBtn}
                                        onClick={() => { navigator.clipboard.writeText(exerciseId); }}
                                    >
                                        Copy ID
                                    </button>
                                </div>
                                <p style={{ margin: "12px 0 0", fontSize: 13, color: "#374151" }}>
                                    <strong>Next:</strong> make sure your students are in your class —{" "}
                                    <a href="/instructor/roster" style={styles.howLink}>add them in Student Roster</a>{" "}
                                    (email invite or Join Code). Track submissions under{" "}
                                    <a href="/instructor/results" style={styles.howLink}>Results &amp; History</a>.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {tab === "configure" && <ScenarioCustomizer />}
            </main>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    breadcrumb: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
    pageTitle: { fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 16 },
    howCard: {
        background: "#fdf6f8", border: "1px solid #f3d6de", borderLeft: "4px solid #8C1D40",
        borderRadius: 10, padding: "16px 20px", marginBottom: 24,
    },
    howTitle: { fontSize: 14, fontWeight: 700, color: "#8C1D40", marginBottom: 8 },
    howList: { margin: 0, paddingLeft: 20, fontSize: 14, color: "#374151", lineHeight: 1.7 },
    howLink: { color: "#8C1D40", fontWeight: 600, textDecoration: "underline" },
    cardHint: { fontSize: 13, color: "#6b7280", lineHeight: 1.5, marginBottom: 16 },
    idRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const },
    copyBtn: {
        background: "#8C1D40", color: "#fff", border: "none", borderRadius: 6,
        padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
    },
    tabRow: { display: "flex", gap: 0, marginBottom: 24, borderBottom: "2px solid #e5e7eb" },
    tabActive: {
        background: "none", border: "none", borderBottom: "2px solid #8C1D40",
        color: "#8C1D40", fontWeight: 700, padding: "10px 20px", fontSize: 14,
        cursor: "pointer", marginBottom: -2,
    },
    tabInactive: {
        background: "none", border: "none", color: "#6b7280", fontWeight: 500,
        padding: "10px 20px", fontSize: 14, cursor: "pointer", marginBottom: -2,
    },
    card: {
        background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24,
    },
    label: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginTop: 12, marginBottom: 4 },
    select: {
        width: "100%", padding: "10px 12px", border: "1px solid #d1d5db",
        borderRadius: 6, fontSize: 14,
    },
    input: {
        width: "100%", padding: "10px 12px", border: "1px solid #d1d5db",
        borderRadius: 6, fontSize: 14,
    },
    createBtn: {
        marginTop: 20, background: "#8C1D40", color: "#fff", border: "none",
        borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
    },
    successCard: {
        marginTop: 20, background: "#f0fdf4", border: "1px solid #bbf7d0",
        borderRadius: 8, padding: 16,
    },
    code: {
        background: "#f3f4f6", padding: "2px 8px", borderRadius: 4,
        fontSize: 13, fontFamily: "monospace",
    },
};
