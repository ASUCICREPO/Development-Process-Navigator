import React from "react";
import { Activity, Phase, PHASES } from "../shared/types";

interface Props {
  activities: Activity[];
  weights: Record<string, Partial<Record<Phase, number>>>; // activityId -> phase -> weight
  onChange: (activityId: string, phase: Phase, weight: number) => void;
}

/**
 * Instructor weight editor (U0A). Phases are fixed (Planning/Construction/Operations).
 * Each cell is an activity-phase weight 0..100; highest weight = primary (correct) phase.
 */
export const WeightMatrix: React.FC<Props> = ({ activities, weights, onChange }) => {
  function primaryPhase(activityId: string): Phase | null {
    const row = weights[activityId] ?? {};
    let best: Phase | null = null;
    let bestW = 0;
    for (const p of PHASES) {
      const w = row[p] ?? 0;
      if (w > bestW) {
        bestW = w;
        best = p;
      }
    }
    return best;
  }

  return (
    <table data-testid="weight-matrix">
      <thead>
        <tr>
          <th>Activity</th>
          {PHASES.map((p) => (
            <th key={p}>{p}</th>
          ))}
          <th>Primary</th>
        </tr>
      </thead>
      <tbody>
        {activities.map((a) => (
          <tr key={a.activityId} data-testid={`weight-row-${a.activityId}`}>
            <td>{a.title}</td>
            {PHASES.map((p) => (
              <td key={p}>
                <input
                  type="number"
                  min={0}
                  max={100}
                  data-testid={`weight-${a.activityId}-${p}`}
                  value={weights[a.activityId]?.[p] ?? 0}
                  onChange={(e) =>
                    onChange(a.activityId, p, clamp(parseInt(e.target.value || "0", 10)))
                  }
                />
              </td>
            ))}
            <td data-testid={`primary-${a.activityId}`}>{primaryPhase(a.activityId) ?? "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

function clamp(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}
