import { useState } from "react";
import type { Experiment } from "../types";

interface HabitatProps {
  catalog: Experiment[];
  onOpen: (id: string) => void;
}

export interface HabitatOption {
  id: string;
  label: string;
  note: string;
  oxygen: number; // percent oxygen
  pressure: number; // atmospheres
}

export const HABITATS: HabitatOption[] = [
  { id: "station", label: "Space station", note: "Earth-like air: about 21% oxygen at 1 atm (14.7 psi).", oxygen: 21, pressure: 1 },
  { id: "moon", label: "Moon base or pressurized rover", note: "Expected: 30% oxygen or more at 10.2 psi (0.69 atm) or less.", oxygen: 30, pressure: 0.69 },
  { id: "suit", label: "Spacesuit", note: "100% oxygen at only 4.3 psi (0.29 atm).", oxygen: 100, pressure: 0.29 },
  { id: "custom", label: "Custom", note: "Set your own oxygen and pressure, for example for a Mars habitat.", oxygen: 30, pressure: 0.6 },
];

interface Part {
  score: number | null;
  note: string;
}

function gap(value: number, min?: number, max?: number): number | null {
  if (min === undefined && max === undefined) return null;
  const low = min ?? (max as number);
  const high = max ?? (min as number);
  if (value < low) return low - value;
  if (value > high) return value - high;
  return 0;
}

function part(name: string, target: number, unit: string, min: number | undefined, max: number | undefined, scale: number): Part {
  const off = gap(target, min, max);
  if (off === null) return { score: null, note: `${name}: not reported in this atlas` };
  const tested = min !== undefined && max !== undefined && min !== max ? `${min} to ${max} ${unit}` : `${min ?? max} ${unit}`;
  if (off === 0) return { score: 1, note: `${name}: tested ${tested}, which includes ${target} ${unit}` };
  const rounded = Math.round(off * 100) / 100;
  return { score: Math.max(0, 1 - off / scale), note: `${name}: tested ${tested}, ${rounded} ${unit} away from ${target} ${unit}` };
}

export function Habitat({ catalog, onOpen }: HabitatProps) {
  const [habitatId, setHabitatId] = useState("moon");
  const [customOxygen, setCustomOxygen] = useState(30);
  const [customPressure, setCustomPressure] = useState(0.6);

  const habitat = HABITATS.find((option) => option.id === habitatId) ?? HABITATS[1];
  const oxygen = habitatId === "custom" ? customOxygen : habitat.oxygen;
  const pressure = habitatId === "custom" ? customPressure : habitat.pressure;

  const results = catalog
    .map((experiment) => {
      const c = experiment.conditions;
      const o = part("Oxygen", oxygen, "%", c.oxygenMin, c.oxygenMax, 30);
      const p = part("Pressure", pressure, "atm", c.pressureMin, c.pressureMax, 1);
      const known = [o.score, p.score].filter((s): s is number => s !== null);
      const score = known.length > 0 ? known.reduce((a, b) => a + b, 0) / known.length : null;
      const basis =
        o.score !== null && p.score !== null
          ? "Based on oxygen and pressure"
          : o.score !== null
            ? "Based on oxygen only"
            : p.score !== null
              ? "Based on pressure only"
              : "No oxygen or pressure data in this atlas, so it cannot be matched";
      return { experiment, score, basis, notes: [o.note, p.note] };
    })
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  return (
    <div className="habitat">
      <div className="presets">
        {HABITATS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={option.id === habitatId ? "chip is-on" : "chip"}
            onClick={() => setHabitatId(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <p className="habitat-note">
        {habitat.note} Matching uses {oxygen}% oxygen at {pressure} atm.
      </p>

      {habitatId === "custom" && (
        <div className="habitat-custom">
          <label className="slider">
            <span>
              Oxygen
              <strong>{customOxygen}%</strong>
            </span>
            <input
              type="range"
              min={15}
              max={100}
              step={1}
              value={customOxygen}
              onChange={(event) => setCustomOxygen(Number(event.target.value))}
            />
          </label>
          <label className="slider">
            <span>
              Pressure
              <strong>{customPressure} atm</strong>
            </span>
            <input
              type="range"
              min={0.1}
              max={1.2}
              step={0.01}
              value={customPressure}
              onChange={(event) => setCustomPressure(Number(event.target.value))}
            />
          </label>
        </div>
      )}

      <ol className="match-list">
        {results.map(({ experiment, score, basis, notes }) => (
          <li key={experiment.id} className={score === null ? "match-row is-unknown" : "match-row"}>
            <div>
              <h3>{experiment.name}</h3>
              <small>{experiment.aka}</small>
              {notes.map((note) => (
                <small key={note}>{note}</small>
              ))}
              <small>{basis}</small>
            </div>
            <div className="match-side">
              <span className="match-score">{score === null ? "No data" : `${Math.round(score * 100)}%`}</span>
              <button type="button" className="chip" onClick={() => onOpen(experiment.id)}>
                Open
              </button>
            </div>
            {score !== null && (
              <div className="match-bar" aria-hidden="true">
                <span style={{ width: `${Math.round(score * 100)}%` }} />
              </div>
            )}
          </li>
        ))}
      </ol>

      <p className="footnote">
        The match compares only the tested oxygen and pressure ranges. A test may not have combined both at once, and a high match does not
        prove a habitat is safe. Every experiment here ran in microgravity, and the challenge notes that NASA's PSI database currently has no
        partial-gravity combustion data, so the Moon's gravity is not covered.
      </p>
    </div>
  );
}