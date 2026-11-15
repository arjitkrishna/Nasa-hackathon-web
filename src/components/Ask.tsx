import { useState } from "react";
import type { Experiment } from "../types";

interface AskProps {
  catalog: Experiment[];
  onOpen: (id: string) => void;
}

interface Answer {
  answer: string;
  sources: string[];
  mode: "ai" | "offline";
}

const EXAMPLES = [
  "What is the main hazard of a spacecraft fire?",
  "Does low oxygen stop a flame in microgravity?",
  "What do we still not know about fires on the Moon or Mars?",
];

// Questions about the Moon, Mars or partial gravity touch a known gap in the data.
const GRAVITY_WORDS = /\b(moon|lunar|mars|martian|partial)\b/i;

function renderBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : part,
  );
}

function rangeText(min: number | undefined, max: number | undefined, unit: string): string | null {
  if (min === undefined && max === undefined) return null;
  if (min !== undefined && max !== undefined) return min === max ? `${min} ${unit}` : `${min} to ${max} ${unit}`;
  if (max !== undefined) return `up to ${max} ${unit}`;
  return `from ${min} ${unit}`;
}

function testedText(experiment: Experiment): string {
  const c = experiment.conditions;
  const parts = [
    rangeText(c.oxygenMin, c.oxygenMax, "% oxygen"),
    rangeText(c.pressureMin, c.pressureMax, "atm"),
    rangeText(c.flowMin, c.flowMax, "cm/s airflow"),
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(", ") : "no oxygen, pressure or airflow numbers in this atlas";
}

function missingText(experiment: Experiment): string | null {
  const c = experiment.conditions;
  const missing: string[] = [];
  if (c.oxygenMin === undefined && c.oxygenMax === undefined) missing.push("oxygen");
  if (c.pressureMin === undefined && c.pressureMax === undefined) missing.push("pressure");
  if (c.flowMin === undefined && c.flowMax === undefined) missing.push("airflow");
  return missing.length > 0 ? `${experiment.name}: ${missing.join(", ")} not reported in this atlas.` : null;
}

export function Ask({ catalog, onOpen }: AskProps) {
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Answer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const names = new Map(catalog.map((experiment) => [experiment.id, experiment.name]));

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Request failed.");
      setResult(data as Answer);
      setAsked(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Is the API server running?");
    } finally {
      setBusy(false);
    }
  }

  const shown = result
    ? result.answer.replace(/\[([a-z0-9-]+)\]/g, (match, id: string) =>
        names.has(id) ? `(${names.get(id)})` : match,
      )
    : "";

  const used = result
    ? result.sources
        .map((id) => catalog.find((experiment) => experiment.id === id))
        .filter((experiment): experiment is Experiment => Boolean(experiment))
    : [];

  const unknown: string[] = [];
  if (result) {
    if (used.length === 0) {
      unknown.push("No experiment was cited, so this answer is not tied to a specific record. Treat it with care.");
    }
    for (const experiment of used) {
      const missing = missingText(experiment);
      if (missing) unknown.push(missing);
      if (experiment.limits.length > 0) unknown.push(`${experiment.name}: ${experiment.limits[0]}`);
    }
    if (GRAVITY_WORDS.test(asked)) {
      unknown.push(
        "Moon, Mars and partial gravity: every experiment here ran in microgravity, and the 2026 NASA Space Apps challenge description states that NASA's PSI database currently has no partial-gravity combustion data.",
      );
    }
    if (used.some((experiment) => experiment.insight)) {
      unknown.push("Fire safety insights in the records are this atlas's interpretations, not NASA statements.");
    }
  }

  return (
    <div className="ask">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(question);
        }}
      >
        <label className="search" htmlFor="ask-input">
          <span>Your question</span>
          <input
            id="ask-input"
            value={question}
            maxLength={500}
            placeholder="e.g. What is the main hazard of a spacecraft fire?"
            onChange={(event) => setQuestion(event.target.value)}
          />
        </label>
        <button type="submit" className="chip ask-go" disabled={busy || question.trim() === ""}>
          {busy ? "Thinking…" : "Ask"}
        </button>
      </form>

      <div className="presets">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            className="chip"
            onClick={() => {
              setQuestion(example);
              submit(example);
            }}
          >
            {example}
          </button>
        ))}
      </div>

      {error && <p className="ask-error">{error}</p>}

      {result && (
        <section className="ask-answer" aria-live="polite">
          <p className="ask-text">{renderBold(shown)}</p>

          {used.length > 0 && (
            <div className="presets">
              {used.map((experiment) => (
                <button key={experiment.id} type="button" className="chip" onClick={() => onOpen(experiment.id)}>
                  Open {experiment.name}
                </button>
              ))}
            </div>
          )}

          <details className="ask-work">
            <summary>How this answer was built</summary>
            <p>
              Used {used.length} of {catalog.length} records in this atlas. This panel is built from the records themselves, not written
              by the AI.
            </p>

            <h4>Records used</h4>
            {used.length > 0 ? (
              <ul>
                {used.map((experiment) => (
                  <li key={experiment.id}>
                    <strong>{experiment.name}</strong> ({experiment.years}, {experiment.status.replace("-", " ")}). Tested: {testedText(experiment)}.
                    {experiment.fuel ? ` Fuel: ${experiment.fuel}.` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p>None cited.</p>
            )}

            <h4>What these records do not tell you</h4>
            <ul>
              {unknown.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>

          <p className="footnote">
            {result.mode === "ai"
              ? "Answered only from the experiment records in this atlas."
              : "Showing the closest records without AI. Ask again for a written answer."}
          </p>
        </section>
      )}
    </div>
  );
}