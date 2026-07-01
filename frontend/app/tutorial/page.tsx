"use client";
import React, { useState } from "react";

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
        title: "Creating & Managing Exercises",
        description: "Build exercises with custom process configurations.",
        steps: [
            "Go to \"My Exercises\" from the sidebar.",
            "Click \"+ New Exercise\" — give it a title and select a configuration (or create a new one).",
            "A configuration defines the phases and activity cards that students will arrange.",
            "You can edit, duplicate, or delete exercises from the exercise card menu (⋯).",
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
        title: "Running a Live Session",
        description: "Facilitate real-time collaborative exercises in class.",
        steps: [
            "From the Dashboard, click \"Start Live Session\".",
            "Select which exercise to run and share the session code with students.",
            "Students join using the code — you can monitor their progress in real time.",
            "Use the live view to discuss results and facilitate group learning.",
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
        title: "Completing an Exercise",
        description: "Arrange activity cards in the correct development process order.",
        steps: [
            "From the Dashboard, click \"Start\" or \"Continue\" on an assigned exercise.",
            "You'll see a set of activity note cards and phase columns.",
            "Drag and drop each activity card into the phase you think it belongs to.",
            "Arrange cards within each phase in the correct sequence.",
            "Click \"Submit\" when you're satisfied with your arrangement.",
        ],
    },
    {
        title: "Understanding Your Score",
        description: "How scoring works and what your results mean.",
        steps: [
            "After submitting, you'll see your score as a percentage.",
            "Scoring is based on: correct phase placement and correct ordering within phases.",
            "You can attempt the exercise multiple times (if allowed by your instructor).",
            "Your best score and most recent score are both tracked.",
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
    {
        title: "Joining a Live Session",
        description: "Participate in instructor-led real-time exercises.",
        steps: [
            "Your instructor will share a session code during class.",
            "Go to the exercise page — if a live session is active, you'll see a prompt to join.",
            "Complete the exercise in real-time alongside your classmates.",
            "Results are shared with the instructor immediately after submission.",
        ],
    },
];

export default function TutorialPage() {
    const [activeTab, setActiveTab] = useState<Tab>("instructor");
    const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

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

            {/* Tab Switcher */}
            <div style={styles.tabRow}>
                <button
                    style={activeTab === "instructor" ? styles.tabActive : styles.tabInactive}
                    onClick={() => { setActiveTab("instructor"); setExpandedIndex(0); }}
                >
                    🎓 Instructor Guide
                </button>
                <button
                    style={activeTab === "student" ? styles.tabActive : styles.tabInactive}
                    onClick={() => { setActiveTab("student"); setExpandedIndex(0); }}
                >
                    📝 Student Guide
                </button>
            </div>

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
                    <li>Instructors can switch to "Student View" using the toggle in the top-right to preview the student experience.</li>
                    <li>Exercises can be attempted multiple times — use each attempt to improve your understanding.</li>
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
