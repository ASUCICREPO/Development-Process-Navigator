"use client";
import React, { useEffect, useState } from "react";
import { API_BASE, getToken } from "../../src/shared/session";

interface Template { templateId: string; source: string; name: string; }

async function authed(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken() ?? ""}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json()).error || `Request failed: ${res.status}`);
  return res.json();
}

export default function InstructorPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [name, setName] = useState("Real Estate Demo");
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

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

  return (
    <div>
      <h1>Instructor — Author Exercise</h1>
      {err && <p className="error" data-testid="instructor-error">{err}</p>}

      <div className="card">
        <h2>1. Choose a template</h2>
        <select data-testid="template-select" value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}>
          {templates.map((t) => (
            <option key={t.templateId} value={t.templateId}>
              {t.name} ({t.source})
            </option>
          ))}
        </select>
        <label>Exercise name</label>
        <input data-testid="config-name" value={name} onChange={(e) => setName(e.target.value)} />
        <div>
          <button data-testid="apply-button" onClick={createAndApply}>
            Create &amp; Apply to Students
          </button>
        </div>
      </div>

      {exerciseId && (
        <div className="card ok" data-testid="exercise-created">
          <h2>2. Share this Exercise ID with students</h2>
          <p>
            Exercise ID: <code data-testid="exercise-id">{exerciseId}</code>
          </p>
          <p>Students enter this ID on their page to take the exercise.</p>
        </div>
      )}
    </div>
  );
}
