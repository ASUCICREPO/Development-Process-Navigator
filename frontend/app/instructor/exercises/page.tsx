"use client";
import React, { useEffect, useState } from "react";
import { API_BASE, getToken } from "../../../src/shared/session";
import { InstructorSidebar } from "../../../src/shared/InstructorSidebar";
import { CsvConfigEditor } from "../../../src/instructor/CsvConfigEditor";
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
                if (r.templates[0]) setTemplateId(r.templates[0].templateId);
            })
            .catch((e) => setErr(e.message));
    }, []);

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
                        Configure Exercise
                    </button>
                </div>

                {tab === "create" && (
                    <div style={styles.card}>
                        {err && <p style={{ color: "#ef4444", marginBottom: 12 }}>{err}</p>}

                        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Create New Exercise</h3>

                        <label style={styles.label}>Template</label>
                        <select
                            value={templateId}
                            onChange={(e) => setTemplateId(e.target.value)}
                            style={styles.select}
                        >
                            {templates.map((t) => (
                                <option key={t.templateId} value={t.templateId}>
                                    {t.name} ({t.source})
                                </option>
                            ))}
                        </select>

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
                                <h4 style={{ margin: "0 0 8px", color: "#16a34a" }}>Exercise Created!</h4>
                                <p style={{ margin: 0, fontSize: 14 }}>
                                    Share this Exercise ID with students: <code style={styles.code}>{exerciseId}</code>
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {tab === "configure" && <CsvConfigEditor />}
            </main>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    breadcrumb: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
    pageTitle: { fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 20 },
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
