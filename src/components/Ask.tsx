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

function renderBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : part,
  );
}
export function Ask({ catalog, onOpen }: AskProps) {
  const [question, setQuestion] = useState("");
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
          {result.sources.length > 0 && (
            <div className="presets">
              {result.sources.map((id) => (
                <button key={id} type="button" className="chip" onClick={() => onOpen(id)}>
                  Open {names.get(id) ?? id}
                </button>
              ))}
            </div>
          )}
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