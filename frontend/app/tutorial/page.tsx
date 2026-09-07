"use client";
import React, { useState, useEffect } from "react";
import { getRole } from "../../src/shared/session";

type Tab = "instructor" | "student";

interface GuideItem {
    title: string;
    description: string;
    steps: string[];
}

const instructorGuides: GuideItem[] = [
    {
        title: "Getting Started as an Instructor",
        description: "Set up your account and create your first exercise.",
        steps: [
            "Register with your ASU email and select 'Instructor' as your role.",
            "Enter the Instructor Access Code when prompted — this is provided by your department admin.",
            "After logging in, you'll land on the Instructor Dashboard.",
            "Click \"+ New Exercise\" to create your first development process exercise.",
        ],
    },
    {
        title: "Choosing a Scenario",
        description: "Pick one of the five development scenarios for your class.",
        steps: [
            "Go to \"My Exercises\" and open the \"Create from Template\" tab.",
            "Select one of the five scenarios: Land Speculation, Master-Planned Community, Finished Lots to Homebuilders, Multi-Tenant Retail, or Residential Condominium.",
            "Assign the same scenario to everyone for a comparison discussion, or different scenarios to explore how the process changes with product and strategy.",
            "Each scenario runs the full five-round card sort with a scenario-specific reference matrix.",
            "Click \"Create & Publish\" and share the Exercise ID with your students.",
        ],
    },
    {
        title: "The Five-Round Card Sort",
        description: "What students work through in each exercise.",
        steps: [
            "Round 1 — Sequence the eight process stages (Concept & Acquisition through Operations).",
            "Round 2 — Place the fifteen major activities onto the process stages.",
            "Round 3 — Match professional/role cards to the activities they contribute to (multiple matches allowed).",
            "Round 4 — Match task & deliverable cards to their activities.",
            "Round 5 (optional) — Match developer go/no-go decision cards to their activities.",
            "Budget & Schedule — students then draft cost categories, durations, and predecessors for each activity.",
        ],
    },
    {
        title: "Building a Configuration",
        description: "Define phases and activities for the development process.",
        steps: [
            "When creating an exercise, you'll build a Configuration — the correct ordering of activities.",
            "Add phases (e.g., Pre-Development, Design, Construction, Close-Out).",
            "Add activity cards to each phase — these are what students will drag and drop.",
            "Save your configuration as a template to reuse across exercises.",
        ],
    },
    {
        title: "Managing Your Student Roster",
        description: "Add students via email invite or join code.",
        steps: [
            "Go to \"Student Roster\" from the sidebar.",
            "Click \"Add Student\" and choose: Email Invite or Join Code.",
            "Email Invite: Enter the student's ASU email (they must have registered first).",
            "Join Code: Share the generated code with your class — students enter it to self-enroll.",
        ],
    },
    {
        title: "Viewing Results & History",
        description: "Track student performance and submission history.",
        steps: [
            "Go to \"Results & History\" in the sidebar.",
            "View individual student scores, attempts, and time-per-exercise.",
            "Export data as CSV for grading or record-keeping.",
            "Use detailed results to identify common mistakes across the class.",
        ],
    },
];

const studentGuides: GuideItem[] = [
    {
        title: "Getting Started as a Student",
        description: "Register and join your instructor's class.",
        steps: [
            "Register with your ASU email — no access code needed for students.",
            "After logging in, you'll land on the Student Dashboard.",
            "To join a class, ask your instructor for a Join Code or wait for an email invite.",
        ],
    },
    {
        title: "Completing an Exercise (Five Rounds)",
        description: "Work through the rounds, then draft a budget and schedule.",
        steps: [
            "From the Dashboard, click \"Start\" or \"Continue\" on an assigned exercise.",
            "Round 1: drag the process-stage cards into the order that fits the scenario.",
            "Round 2: place each major activity onto the process stage where it belongs.",
            "Rounds 3–5: match professionals, tasks/deliverables, and developer decisions to activities. A card can match more than one activity when that is defensible.",
            "Use \"Next\" to advance rounds and \"Back\" to revise. Your work is saved as you go.",
            "Final step: fill in the Budget & Schedule table, then click \"Submit Exercise\".",
        ],
    },
    {
        title: "Understanding Your Score",
        description: "How scoring works and what your results mean.",
        steps: [
            "After submitting, you'll see an overall score plus a score for each round.",
            "Each card earns credit for the alignment weight of the targets you place it on; strong matches earn full credit, weaker but defensible matches earn partial credit, and there is no penalty for an extra placement.",
            "A reflection prompt highlights your weakest match so you can rethink it.",
            "You get one resubmission; your most recent submission is final.",
        ],
    },
    {
        title: "Viewing Your History",
        description: "Review past attempts and track your progress.",
        steps: [
            "Go to \"My History\" in the sidebar.",
            "See all your past attempts with dates, scores, and exercise details.",
            "Click on any attempt to see your detailed card placement vs. the correct answer.",
            "Track your improvement over time.",
        ],
    },
];

export default function TutorialPage() {
    const [activeTab, setActiveTab] = useState<Tab>("student");
    const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        const userRole = getRole();
        setRole(userRole);
        // Instructors default to instructor tab, students only see student tab
        if (userRole === "INSTRUCTOR") {
            setActiveTab("instructor");
        } else {
            setActiveTab("student");
        }
    }, []);

    const isInstructor = role === "INSTRUCTOR";

    const guides = activeTab === "instructor" ? instructorGuides : studentGuides;

    function toggleExpand(index: number) {
        setExpandedIndex(expandedIndex === index ? null : index);
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>Help Center</h1>
                <p style={styles.subtitle}>
                    Quick guides to help you get the most out of the Development Process Navigator.
                </p>
            </div>

            {/* Tab Switcher - Instructors see only instructor tab, Students see only student tab */}
            <div style={styles.tabRow}>
                {isInstructor && (
                    <button
                        style={styles.tabActive}
                        onClick={() => { setActiveTab("instructor"); setExpandedIndex(0); }}
                    >
                        🎓 Instructor Guide
                    </button>
                )}
                {!isInstructor && (
                    <button
                        style={styles.tabActive}
                        onClick={() => { setActiveTab("student"); setExpandedIndex(0); }}
                    >
                        📝 Student Guide
                    </button>
                )}
            </div>

            {/* Instructor Manual download — instructors only */}
            {isInstructor && (
                <a
                    href="/Instructor-Manual.docx"
                    download
                    style={styles.manualCard}
                >
                    <span style={styles.manualIcon}>📘</span>
                    <div style={{ flex: 1 }}>
                        <div style={styles.manualTitle}>Instructor Manual</div>
                        <div style={styles.manualDesc}>
                            The complete facilitation guide — teaching philosophy, learning objectives,
                            the eight process stages and fifteen major activities, professional roles,
                            the five scenarios, in-class facilitation, scoring rubric, and the reference matrix.
                        </div>
                    </div>
                    <span style={styles.manualBtn}>Download (.docx)</span>
                </a>
            )}

            {/* Guides Accordion */}
            <div style={styles.guidesContainer}>
                {guides.map((guide, index) => (
                    <div key={index} style={styles.guideCard}>
                        <button
                            style={styles.guideHeader}
                            onClick={() => toggleExpand(index)}
                            aria-expanded={expandedIndex === index}
                        >
                            <div>
                                <div style={styles.guideTitle}>{guide.title}</div>
                                <div style={styles.guideDesc}>{guide.description}</div>
                            </div>
                            <span style={styles.chevron}>
                                {expandedIndex === index ? "▾" : "▸"}
                            </span>
                        </button>
                        {expandedIndex === index && (
                            <div style={styles.guideBody}>
                                <ol style={styles.stepList}>
                                    {guide.steps.map((step, si) => (
                                        <li key={si} style={styles.stepItem}>{step}</li>
                                    ))}
                                </ol>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Quick Tips */}
            <div style={styles.tipsCard}>
                <h3 style={styles.tipsTitle}>💡 Quick Tips</h3>
                <ul style={styles.tipsList}>
                    <li>Look for the <strong style={{ color: "#8C1D40" }}>ⓘ</strong> icons throughout the app — hover over them for contextual help.</li>
                    <li>Exercises can be attempted up to two times — use your first attempt to learn, then resubmit for a better score.</li>
                    <li>Instructors: share your Exercise ID or link with students. They can also find assigned exercises on their dashboard.</li>
                    <li>Need help? Contact your instructor or reach out to the ASU CIC team.</li>
                </ul>
            </div>

            <div style={styles.backRow}>
                <button
                    style={styles.backBtn}
                    onClick={() => window.history.back()}
                >
                    ← Back to App
                </button>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        maxWidth: 800,
        margin: "0 auto",
        padding: "80px 24px 48px",
        minHeight: "100vh",
    },
    header: {
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: 700,
        color: "#111827",
        margin: 0,
    },
    subtitle: {
        fontSize: 15,
        color: "#6b7280",
        marginTop: 8,
    },
    manualCard: {
        display: "flex",
        alignItems: "center",
        gap: 16,
        background: "#fff",
        border: "1px solid #8C1D40",
        borderLeft: "5px solid #8C1D40",
        borderRadius: 10,
        padding: "18px 20px",
        marginBottom: 24,
        textDecoration: "none",
        color: "inherit",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    },
    manualIcon: {
        fontSize: 28,
        lineHeight: 1,
    },
    manualTitle: {
        fontSize: 16,
        fontWeight: 700,
        color: "#8C1D40",
    },
    manualDesc: {
        fontSize: 13,
        color: "#6b7280",
        marginTop: 4,
        lineHeight: 1.5,
    },
    manualBtn: {
        flexShrink: 0,
        background: "#8C1D40",
        color: "#fff",
        borderRadius: 6,
        padding: "10px 16px",
        fontSize: 13,
        fontWeight: 700,
        whiteSpace: "nowrap" as const,
    },
    tabRow: {
        display: "flex",
        gap: 8,
        marginBottom: 24,
        borderBottom: "2px solid #e5e7eb",
        paddingBottom: 0,
    },
    tabActive: {
        background: "none",
        border: "none",
        borderBottom: "3px solid #8C1D40",
        padding: "12px 20px",
        fontSize: 14,
        fontWeight: 700,
        color: "#8C1D40",
        cursor: "pointer",
        marginBottom: -2,
    },
    tabInactive: {
        background: "none",
        border: "none",
        borderBottom: "3px solid transparent",
        padding: "12px 20px",
        fontSize: 14,
        fontWeight: 500,
        color: "#6b7280",
        cursor: "pointer",
        marginBottom: -2,
    },
    guidesContainer: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
    },
    guideCard: {
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        overflow: "hidden",
    },
    guideHeader: {
        width: "100%",
        background: "none",
        border: "none",
        padding: "16px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        cursor: "pointer",
        textAlign: "left" as const,
    },
    guideTitle: {
        fontSize: 15,
        fontWeight: 600,
        color: "#111827",
    },
    guideDesc: {
        fontSize: 13,
        color: "#6b7280",
        marginTop: 2,
    },
    chevron: {
        fontSize: 16,
        color: "#6b7280",
        flexShrink: 0,
        marginLeft: 16,
    },
    guideBody: {
        padding: "0 20px 20px",
        borderTop: "1px solid #f3f4f6",
    },
    stepList: {
        margin: "12px 0 0",
        paddingLeft: 20,
    },
    stepItem: {
        fontSize: 14,
        color: "#374151",
        lineHeight: 1.7,
        marginBottom: 6,
    },
    tipsCard: {
        background: "#FFF8E1",
        border: "1px solid #FFC627",
        borderRadius: 10,
        padding: "20px 24px",
        marginTop: 32,
    },
    tipsTitle: {
        fontSize: 15,
        fontWeight: 700,
        color: "#111827",
        margin: "0 0 12px",
    },
    tipsList: {
        margin: 0,
        paddingLeft: 20,
        fontSize: 13,
        color: "#374151",
        lineHeight: 1.8,
    },
    backRow: {
        marginTop: 32,
        textAlign: "center" as const,
    },
    backBtn: {
        background: "#f3f4f6",
        color: "#374151",
        border: "1px solid #d1d5db",
        borderRadius: 8,
        padding: "10px 24px",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
    },
};
