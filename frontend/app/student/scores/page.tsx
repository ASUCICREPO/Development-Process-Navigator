"use client";
import React from "react";
import { Sidebar } from "../../../src/shared/Sidebar";
import { MyResults } from "../../../src/student/MyResults";
import { useRoleGuard } from "../../../src/shared/useRoleGuard";

export default function ScoresPage() {
    const allowed = useRoleGuard("STUDENT");

    if (!allowed) return null;

    return (
        <div style={{ display: "flex" }}>
            <Sidebar activeItem="scores" />
            <main className="main-content">
                <div className="welcome-banner" style={{ marginBottom: 24 }}>
                    <div>
                        <h2>Development Process Navigator</h2>
                        <h1>My Scores</h1>
                    </div>
                </div>

                <div className="card">
                    <MyResults />
                </div>
            </main>
        </div>
    );
}
