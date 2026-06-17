"use client";
import React, { useRef, useState } from "react";
import { api } from "../shared/session";

const PHASES = ["PLANNING", "CONSTRUCTION", "OPERATIONS"] as const;
type Phase = typeof PHASES[number];

interface Row {
  id: string;           // activityId
  title: string;
  strongestBucket: Phase;
  planning: string;
  construction: string;
  operations: string;
  description: string;
  rationale: string;
}

// Default sample data mirroring the seed template
const SAMPLE_ROWS: Omit<Row, "id">[] = [
  { title: "Site Feasibility Review",        strongestBucket: "PLANNING",      planning: "1",    construction: "0.2",  operations: "0.1",  description: "Early review of whether the site can support the intended project", rationale: "because it happens before execution and shapes the project decision" },
  { title: "Zoning and Entitlement",         strongestBucket: "PLANNING",      planning: "1",    construction: "0.1",  operations: "0",    description: "Securing approvals for land use density and permitted project scope", rationale: "Usually belongs in Planning because it determines whether and how the project proceeds" },
  { title: "Architectural Drafting",         strongestBucket: "PLANNING",      planning: "0.95", construction: "0.4",  operations: "0.1",  description: "Creation of drawings and design documents for the project", rationale: "because it defines the intended build before field execution begins" },
  { title: "Construction Budgeting",         strongestBucket: "PLANNING",      planning: "0.85", construction: "0.6",  operations: "0.2",  description: "Estimating project costs and aligning budget to scope", rationale: "Usually belongs in Planning because it informs feasibility and pre-build" },
  { title: "Permit Submission",              strongestBucket: "PLANNING",      planning: "0.9",  construction: "0.5",  operations: "0.1",  description: "Submitting plans and documents for governmental approval", rationale: "Usually belongs in Planning because it is a pre-construction approval step" },
  { title: "Foundation Pour",                strongestBucket: "CONSTRUCTION",  planning: "0.1",  construction: "1",    operations: "0",    description: "Execution of the structural foundation work on site", rationale: "Usually belongs in Construction because it is direct field execution" },
  { title: "Framing and Envelope",           strongestBucket: "CONSTRUCTION",  planning: "0.1",  construction: "1",    operations: "0",    description: "Building the primary structure walls roof and enclosure", rationale: "Usually belongs in Construction because it is part of active physical building" },
  { title: "Final Inspection",               strongestBucket: "CONSTRUCTION",  planning: "0.3",  construction: "0.85", operations: "0.4",  description: "Inspection confirming that work meets code and can move toward closeout", rationale: "Usually belongs most strongly in Construction because it validates completed work" },
  { title: "Tenant Turnover Setup",          strongestBucket: "OPERATIONS",    planning: "0",    construction: "0.2",  operations: "1",    description: "Preparing the building or unit for occupancy handoff and ongoing use", rationale: "Usually belongs in Operations because it is the transition to active use" },
  { title: "Property Maintenance Scheduling",strongestBucket: "OPERATIONS",    planning: "0",    construction: "0",    operations: "1",    description: "Planning recurring service and upkeep after occupancy", rationale: "Usually belongs in Operations because it sustains the asset post-build" },
];

function makeSampleRows(): Row[] {
  return SAMPLE_ROWS.map((r, i) => ({ ...r, id: `act-${i + 1}` }));
}

function rowsToPayload(rows: Row[]) {
  const activities = rows.map((r) => ({
    activityId: r.id,
    title: r.title,
    description: r.description,
  }));
  const mappings: { activityId: string; phase: string; weight: number }[] = [];
  for (const r of rows) {
    const weights: Record<string, number> = {
      PLANNING: parseFloat(r.planning) || 0,
      CONSTRUCTION: parseFloat(r.construction) || 0,
      OPERATIONS: parseFloat(r.operations) || 0,
    };
    for (const [phase, weight] of Object.entries(weights)) {
      if (weight > 0) mappings.push({ activityId: r.id, phase, weight: Math.round(weight * 100) });
    }
  }
  return { activities, mappings, phases: ["PLANNING", "CONSTRUCTION", "OPERATIONS"], prompts: [] };
}

export const CsvConfigEditor: React.FC = () => {
  const clientRef = useRef<ReturnType<typeof api> | null>(null);
  const getClient = () => { if (!clientRef.current) clientRef.current = api(); return clientRef.current; };

  const [rows, setRows] = useState<Row[]>(makeSampleRows);
  const [status, setStatus] = useState<string>("Loaded sample CSV data.");
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  function updateRow(id: string, field: keyof Row, value: string) {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  }

  function addRow() {
    const id = `act-${Date.now()}`;
    setRows((prev) => [...prev, { id, title: "", strongestBucket: "PLANNING", planning: "0", construction: "0", operations: "0", description: "", rationale: "" }]);
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function applyTable() {
    setApplying(true);
    setStatus("Applying…");
    setExerciseId(null);
    try {
      const payload = rowsToPayload(rows);
      const cfg = await getClient().createConfiguration("CSV Configuration") as any;
      await getClient().updateConfiguration(cfg.configId, payload);
      const applied = await getClient().applyConfiguration(cfg.configId) as any;
      setExerciseId(applied.exerciseId);
      setStatus("Applied. Share the exercise ID below with your students.");
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    } finally {
      setApplying(false);
    }
  }

  function restoreSample() {
    setRows(makeSampleRows());
    setExerciseId(null);
    setStatus("Loaded sample CSV data.");
  }

  const cellStyle: React.CSSProperties = {
    padding: "2px 4px",
    verticalAlign: "top",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    fontSize: 12,
    padding: "3px 5px",
    border: "1px solid #555",
    borderRadius: 4,
    background: "#2a3a4a",
    color: "#fff",
    resize: "vertical",
  };
  const scoreStyle: React.CSSProperties = { ...inputStyle, width: 64 };

  return (
    <div style={{ background: "#1a2a3a", color: "#fff", borderRadius: 10, padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>Instructor View</div>
          <h2 style={{ margin: "4px 0 8px", fontSize: 22 }}>Instructor Configuration (editable CSV preview)</h2>
          <p style={{ margin: 0, color: "#bbb", fontSize: 13 }}>
            Edit the CSV-backed rows below, then apply the table to regenerate the student exercise and clear any previous placements or results.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 200 }}>
          <button
            onClick={applyTable}
            disabled={applying}
            style={{ background: "#e8a020", color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 16px", borderRadius: 20, border: "none", cursor: applying ? "not-allowed" : "pointer" }}
          >
            {applying ? "Applying…" : "Apply Instructor Table to Demo"}
          </button>
          <button
            onClick={restoreSample}
            style={{ background: "transparent", color: "#fff", fontWeight: 600, fontSize: 13, padding: "7px 16px", borderRadius: 20, border: "1px solid #fff", cursor: "pointer" }}
          >
            Restore Sample Data
          </button>
        </div>
      </div>

      <p style={{ fontSize: 12, color: "#7af", marginBottom: 12 }}>{status}</p>

      {exerciseId && (
        <div style={{ background: "#1e3a1e", border: "1px solid #4caf50", borderRadius: 6, padding: "10px 14px", marginBottom: 16 }}>
          <strong style={{ color: "#81c784" }}>Exercise created.</strong>{" "}
          <span style={{ color: "#ccc" }}>Share this ID with students: </span>
          <code style={{ color: "#fff", background: "#0d1f0d", padding: "2px 8px", borderRadius: 4 }}>{exerciseId}</code>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#253545", color: "#bbb", textTransform: "uppercase", fontSize: 10, letterSpacing: 0.5 }}>
              <th style={{ ...cellStyle, minWidth: 120 }}>Activity Name</th>
              <th style={{ ...cellStyle, minWidth: 130 }}>Strongest Bucket</th>
              <th style={{ ...cellStyle, minWidth: 80 }}>Planning Score</th>
              <th style={{ ...cellStyle, minWidth: 80 }}>Construction Score</th>
              <th style={{ ...cellStyle, minWidth: 80 }}>Operations Score</th>
              <th style={{ ...cellStyle, minWidth: 180 }}>Description</th>
              <th style={{ ...cellStyle, minWidth: 200 }}>Instructor Rationale</th>
              <th style={{ ...cellStyle, textAlign: "center" }}>Delete</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} style={{ borderBottom: "1px solid #2d3d4d" }}>
                <td style={cellStyle}>
                  <input style={inputStyle} value={row.title} onChange={(e) => updateRow(row.id, "title", e.target.value)} />
                </td>
                <td style={cellStyle}>
                  <select
                    value={row.strongestBucket}
                    onChange={(e) => updateRow(row.id, "strongestBucket", e.target.value as Phase)}
                    style={{ ...inputStyle, width: 120 }}
                  >
                    {PHASES.map((p) => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
                  </select>
                </td>
                <td style={cellStyle}><input style={scoreStyle} value={row.planning} onChange={(e) => updateRow(row.id, "planning", e.target.value)} /></td>
                <td style={cellStyle}><input style={scoreStyle} value={row.construction} onChange={(e) => updateRow(row.id, "construction", e.target.value)} /></td>
                <td style={cellStyle}><input style={scoreStyle} value={row.operations} onChange={(e) => updateRow(row.id, "operations", e.target.value)} /></td>
                <td style={cellStyle}><textarea style={{ ...inputStyle, minHeight: 56 }} value={row.description} onChange={(e) => updateRow(row.id, "description", e.target.value)} /></td>
                <td style={cellStyle}><textarea style={{ ...inputStyle, minHeight: 56 }} value={row.rationale} onChange={(e) => updateRow(row.id, "rationale", e.target.value)} /></td>
                <td style={{ ...cellStyle, textAlign: "center", verticalAlign: "middle" }}>
                  <button
                    onClick={() => removeRow(row.id)}
                    title="Delete row"
                    style={{
                      background: "#c62828", color: "#fff", border: "none",
                      borderRadius: 4, padding: "4px 10px", cursor: "pointer",
                      fontSize: 13, fontWeight: 700, lineHeight: 1,
                    }}
                  >
                    🗑 Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={addRow} style={{ marginTop: 12, background: "#2a4a6a", color: "#7af", border: "1px dashed #7af", borderRadius: 4, padding: "4px 12px", cursor: "pointer", fontSize: 12 }}>
        + Add row
      </button>
    </div>
  );
};
