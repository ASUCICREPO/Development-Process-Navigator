"use client";
import React, { useState } from "react";
import { api } from "../../src/shared/session";
import { ExerciseBoard } from "../../src/student/ExerciseBoard";
import { MyResults } from "../../src/student/MyResults";
import { ExerciseView } from "../../src/shared/types";
import { useRoleGuard } from "../../src/shared/useRoleGuard";

type Tab = "exercise" | "results";

export default function StudentPage() {
  useRoleGuard("STUDENT");
  const [tab, setTab] = useState<Tab>("exercise");
  const [exerciseId, setExerciseId] = useState("");
  const [exercise, setExercise] = useState<ExerciseView | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    setExercise(null);
    try {
      const ex = (await api().getExercise(exerciseId)) as ExerciseView;
      setExercise(ex);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div>
      <h1>Student</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          data-testid="tab-exercise"
          onClick={() => setTab("exercise")}
          style={{
            background: tab === "exercise" ? "#1565c0" : "#e0e0e0",
            color: tab === "exercise" ? "#fff" : "#333",
          }}
        >
          Exercise
        </button>
        <button
          data-testid="tab-results"
          onClick={() => setTab("results")}
          style={{
            background: tab === "results" ? "#1565c0" : "#e0e0e0",
            color: tab === "results" ? "#fff" : "#333",
          }}
        >
          My Results
        </button>
      </div>

      {tab === "exercise" && (
        <>
          <div className="card">
            <label>Exercise ID (from your instructor)</label>
            <input
              data-testid="exercise-id-input"
              value={exerciseId}
              onChange={(e) => setExerciseId(e.target.value)}
              style={{ width: "100%" }}
            />
            <button data-testid="load-exercise" onClick={load}>
              Load Exercise
            </button>
            {err && <p className="error" data-testid="student-error">{err}</p>}
          </div>
          {exercise && <ExerciseBoard api={api()} exercise={exercise} />}
        </>
      )}

      {tab === "results" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>My Results &amp; Feedback</h2>
          <MyResults />
        </div>
      )}
    </div>
  );
}
