"use client";
import React, { useState } from "react";
import { api } from "../../src/shared/session";
import { ExerciseBoard } from "../../src/student/ExerciseBoard";
import { ExerciseView } from "../../src/shared/types";

export default function StudentPage() {
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
      <h1>Student — Sorting Exercise</h1>

      <div className="card">
        <label>Exercise ID (from your instructor)</label>
        <input data-testid="exercise-id-input" value={exerciseId}
               onChange={(e) => setExerciseId(e.target.value)} style={{ width: "100%" }} />
        <button data-testid="load-exercise" onClick={load}>Load Exercise</button>
        {err && <p className="error" data-testid="student-error">{err}</p>}
      </div>

      {exercise && <ExerciseBoard api={api()} exercise={exercise} />}
    </div>
  );
}
