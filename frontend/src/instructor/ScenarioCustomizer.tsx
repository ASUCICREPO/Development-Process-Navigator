"use client";
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../shared/session";
import {
  CardType,
  ConfigSnapshot,
  ConfigurationView,
  SnapshotRound,
} from "../shared/types";

interface Template { templateId: string; source: string; name: string; }

const CARD_TYPE_COLOR: Record<CardType, string> = {
  PROCESS: "#8C1D40",
  MAJOR_ACTIVITY: "#1565c0",
  PROFESSIONAL: "#2e7d32",
  TASK_DELIVERABLE: "#e65100",
  DECISION: "#6d4c00",
};

/**
 * Scenario Customizer — the "Configure Exercise" tab.
 *
 * Flow: pick a scenario -> create a Draft configuration from it -> edit the
 * per-round card->target weights (and remove cards you don't want) -> Save ->
 * Publish (apply) to produce a shareable exercise. The full v2 snapshot is
 * preserved on save via updateConfigurationSnapshot.
 */
export const ScenarioCustomizer: React.FC = () => {
  const client = useMemo(() => api(), []);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [name, setName] = useState("");
  const [configId, setConfigId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<ConfigSnapshot | null>(null);
  const [activeRound, setActiveRound] = useState(0);
  const [status, setStatus] = useState<string>("");
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    client.listTemplates()
      .then((r: any) => {
        const ts: Template[] = (r.templates ?? []).filter(
          (t: Template) => t.source === "SYSTEM_SEEDED"
        );
        setTemplates(ts);
        if (ts[0]) { setTemplateId(ts[0].templateId); setName(`${ts[0].name} (custom)`); }
      })
      .catch((e) => setErr(e.message));
  }, [client]);

  function onPickTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.templateId === id);
    if (t) setName(`${t.name} (custom)`);
    // reset any in-progress edit
    setConfigId(null); setSnapshot(null); setExerciseId(null); setStatus("");
  }

  async function loadForEditing() {
    setBusy(true); setErr(null); setExerciseId(null);
    setStatus("Loading scenario…");
    try {
      const cfg = (await client.createConfiguration(name || "Custom scenario", templateId)) as any;
      const full = (await client.getConfiguration(cfg.configId)) as ConfigurationView;
      setConfigId(full.configId);
      setSnapshot(full.snapshot);
      setActiveRound(0);
      setStatus("Loaded. Adjust weights below, then save and publish.");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  function updateWeight(roundId: string, cardId: string, targetId: string, value: number) {
    setSnapshot((prev) => {
      if (!prev?.rounds) return prev;
      const rounds = prev.rounds.map((r) => {
        if (r.roundId !== roundId) return r;
        const mappings = [...r.mappings];
        const idx = mappings.findIndex((m) => m.cardId === cardId && m.targetId === targetId);
        if (value <= 0) {
          if (idx >= 0) mappings.splice(idx, 1);
        } else if (idx >= 0) {
          mappings[idx] = { ...mappings[idx], weight: value };
        } else {
          mappings.push({ cardId, targetId, weight: value });
        }
        return { ...r, mappings };
      });
      return { ...prev, rounds };
    });
  }

  function removeCard(roundId: string, cardId: string) {
    setSnapshot((prev) => {
      if (!prev?.rounds) return prev;
      const rounds = prev.rounds.map((r) => {
        if (r.roundId !== roundId) return r;
        return {
          ...r,
          cards: r.cards.filter((c) => c.cardId !== cardId),
          mappings: r.mappings.filter((m) => m.cardId !== cardId),
        };
      });
      return { ...prev, rounds };
    });
  }

  function weightOf(round: SnapshotRound, cardId: string, targetId: string): number {
    return round.mappings.find((m) => m.cardId === cardId && m.targetId === targetId)?.weight ?? 0;
  }

  // Each card must have at least one positive mapping (matches backend validation).
  function validationErrors(snap: ConfigSnapshot): string[] {
    const problems: string[] = [];
    (snap.rounds ?? []).forEach((r) => {
      if (!r.cards.length) return;
      const weighted = new Set(r.mappings.filter((m) => m.weight > 0).map((m) => m.cardId));
      const missing = r.cards.filter((c) => !weighted.has(c.cardId));
      if (missing.length) {
        problems.push(`${r.title}: ${missing.length} card(s) have no weighted target.`);
      }
    });
    return problems;
  }

  async function saveDraft() {
    if (!configId || !snapshot) return;
    setBusy(true); setErr(null);
    setStatus("Saving…");
    try {
      await client.updateConfigurationSnapshot(configId, snapshot);
      setStatus("Saved.");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!configId || !snapshot) return;
    const problems = validationErrors(snapshot);
    if (problems.length) { setErr(problems.join(" ")); return; }
    setBusy(true); setErr(null);
    setStatus("Saving and publishing…");
    try {
      await client.updateConfigurationSnapshot(configId, snapshot);
      const applied = (await client.applyConfiguration(configId)) as any;
      setExerciseId(applied.exerciseId);
      setStatus("Published.");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const rounds = snapshot?.rounds ?? [];
  const round = rounds[activeRound];

  return (
    <div style={styles.card}>
      {err && <p style={styles.error}>{err}</p>}

      {/* Step 1: pick scenario */}
      <h3 style={styles.h3}>1. Choose a scenario to customize</h3>
      <div style={styles.pickRow}>
        <select value={templateId} onChange={(e) => onPickTemplate(e.target.value)} style={styles.select}>
          {templates.map((t) => (
            <option key={t.templateId} value={t.templateId}>{t.name}</option>
          ))}
        </select>
        <input value={name} onChange={(e) => setName(e.target.value)} style={styles.input} placeholder="Exercise name" />
        <button style={styles.primaryBtn} onClick={loadForEditing} disabled={busy || !templateId}>
          {configId ? "Reload" : "Load for editing"}
        </button>
      </div>
      <p style={styles.help}>
        Customizing copies the scenario into a new exercise. Editing weights here does not change the original scenario template.
      </p>

      {/* Step 2: edit rounds */}
      {snapshot && rounds.length > 0 && (
        <>
          <h3 style={styles.h3}>2. Adjust the reference matrix</h3>
          <p style={styles.help}>
            Each cell is the alignment weight (0–100) for placing a card on a target. 100 = primary/correct,
            lower values = partial credit, 0 = not credited. Set a cell to 0 to remove that match.
          </p>

          {/* Round tabs */}
          <div style={styles.roundTabs}>
            {rounds.map((r, i) => (
              <button
                key={r.roundId}
                onClick={() => setActiveRound(i)}
                style={{
                  ...styles.roundTab,
                  borderBottomColor: i === activeRound ? CARD_TYPE_COLOR[r.cardType] : "transparent",
                  color: i === activeRound ? CARD_TYPE_COLOR[r.cardType] : "#6b7280",
                  fontWeight: i === activeRound ? 700 : 500,
                }}
              >
                {r.title.replace(/^Round \d+ — /, `R${i + 1}: `)}
              </button>
            ))}
          </div>

          {round && <RoundMatrix
            round={round}
            weightOf={weightOf}
            onWeight={updateWeight}
            onRemoveCard={removeCard}
          />}

          {/* Step 3: save / publish */}
          <div style={styles.actions}>
            <button style={styles.ghostBtn} onClick={saveDraft} disabled={busy}>Save Draft</button>
            <button style={styles.primaryBtn} onClick={publish} disabled={busy}>Save & Publish Exercise</button>
            {status && <span style={styles.status}>{status}</span>}
          </div>

          {exerciseId && (
            <div style={styles.success}>
              <strong style={{ color: "#16a34a" }}>Exercise published.</strong>{" "}
              Share this Exercise ID with students: <code style={styles.code}>{exerciseId}</code>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ---- Per-round weight matrix ----------------------------------------------
const RoundMatrix: React.FC<{
  round: SnapshotRound;
  weightOf: (r: SnapshotRound, cardId: string, targetId: string) => number;
  onWeight: (roundId: string, cardId: string, targetId: string, value: number) => void;
  onRemoveCard: (roundId: string, cardId: string) => void;
}> = ({ round, weightOf, onWeight, onRemoveCard }) => {
  const color = CARD_TYPE_COLOR[round.cardType];
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{ ...styles.th, position: "sticky", left: 0, background: "#f3f4f6", minWidth: 220 }}>
              Card
            </th>
            {round.targets.map((t) => (
              <th key={t.id} style={{ ...styles.th, minWidth: 90 }} title={t.label}>{t.label}</th>
            ))}
            <th style={styles.th}></th>
          </tr>
        </thead>
        <tbody>
          {round.cards.map((c) => (
            <tr key={c.cardId}>
              <td style={{ ...styles.td, position: "sticky", left: 0, background: "#fff", borderLeft: `4px solid ${color}` }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{c.title}</div>
                {c.description && <div style={{ fontSize: 11, color: "#9ca3af" }}>{c.description}</div>}
              </td>
              {round.targets.map((t) => {
                const w = weightOf(round, c.cardId, t.id);
                return (
                  <td key={t.id} style={styles.td}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={w || ""}
                      placeholder="0"
                      onChange={(e) => {
                        const v = Math.max(0, Math.min(100, parseInt(e.target.value || "0", 10)));
                        onWeight(round.roundId, c.cardId, t.id, isNaN(v) ? 0 : v);
                      }}
                      style={{
                        ...styles.weightInput,
                        background: w >= 100 ? "#e8f5e9" : w > 0 ? "#fff8e1" : "#fff",
                      }}
                    />
                  </td>
                );
              })}
              <td style={styles.td}>
                <button
                  title="Remove this card from the exercise"
                  onClick={() => onRemoveCard(round.roundId, c.cardId)}
                  style={styles.removeBtn}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24 },
  h3: { fontSize: 16, fontWeight: 700, color: "#111827", margin: "18px 0 8px" },
  help: { fontSize: 13, color: "#6b7280", margin: "0 0 12px", lineHeight: 1.5 },
  error: { color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "8px 12px", fontSize: 13, marginBottom: 12 },
  pickRow: { display: "flex", gap: 10, flexWrap: "wrap" as const, alignItems: "center" },
  select: { padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, minWidth: 260 },
  input: { padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, flex: 1, minWidth: 200 },
  roundTabs: { display: "flex", gap: 4, borderBottom: "1px solid #e5e7eb", marginBottom: 12, flexWrap: "wrap" as const },
  roundTab: { background: "none", border: "none", borderBottom: "3px solid transparent", padding: "8px 14px", fontSize: 13, cursor: "pointer", marginBottom: -1 },
  tableWrap: { overflowX: "auto" as const, border: "1px solid #e5e7eb", borderRadius: 8, maxHeight: "56vh", overflowY: "auto" as const },
  table: { borderCollapse: "collapse" as const, width: "100%" },
  th: { textAlign: "left" as const, fontSize: 11, fontWeight: 700, color: "#374151", padding: "8px 10px", background: "#f3f4f6", borderBottom: "1px solid #e5e7eb", position: "sticky" as const, top: 0, zIndex: 1 },
  td: { padding: "6px 10px", borderBottom: "1px solid #f3f4f6", fontSize: 13, verticalAlign: "top" as const },
  weightInput: { width: 60, padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, textAlign: "center" as const },
  removeBtn: { background: "none", border: "1px solid #e5e7eb", color: "#9ca3af", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" as const },
  actions: { display: "flex", gap: 12, alignItems: "center", marginTop: 18 },
  primaryBtn: { background: "#8C1D40", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  ghostBtn: { background: "transparent", border: "1px solid #d1d5db", color: "#374151", borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  status: { fontSize: 13, color: "#6b7280" },
  success: { marginTop: 16, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: 16, fontSize: 14 },
  code: { background: "#f3f4f6", padding: "2px 8px", borderRadius: 4, fontSize: 13, fontFamily: "monospace" },
};
