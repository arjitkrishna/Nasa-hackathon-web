import { useState } from "react";
import { interpret, readingText } from "../lib/interpret";
import { DIMENSIONS, type RankedExperiment, type Weights } from "../types";
import { formatScore } from "../lib/rank";

interface DossierProps {
  entry: RankedExperiment | null;
  weights: Weights;
  pinned: boolean;
  onPin: (id: string) => void;
}

export function Dossier({ entry, weights, pinned, onPin }: DossierProps) {
  const [copied, setCopied] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  if (!entry) {
    return (
      <aside className="dossier empty">
        <p className="eyebrow">Reading</p>
        <h2>Select an experiment.</h2>
        <p>The brief, the limits, and the source links open here.</p>
      </aside>
    );
  }

  const { experiment } = entry;
  const reading = interpret(experiment, weights);

  async function copyReading() {
    await navigator.clipboard.writeText(readingText(experiment, reading));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <aside className="dossier">
      <p className="eyebrow">
        Rank {String(entry.rank).padStart(2, "0")} · {formatScore(entry.score)}
      </p>
      <h2>{experiment.name}</h2>
      <p className="aka">{experiment.aka}</p>
      <ul className="facts">
        <li>{experiment.domain}</li>
        <li>{experiment.platform}</li>
        <li>{experiment.status.replace("-", " ")}</li>
      </ul>
      <p className="place">
        {experiment.program}
        <span>{experiment.center}</span>
        <span>{experiment.years}</span>
      </p>

      <p className="summary">{experiment.summary}</p>
            {experiment.insight && (
        <section className="insight">
          <h3>Fire safety insight</h3>
          <p>
            <b>For crews:</b> {experiment.insight.crew}
          </p>
          <p>
            <b>For design:</b> {experiment.insight.design}
          </p>
          <small>An interpretation of the findings, not a NASA statement.</small>
        </section>
      )}

      <button
        type="button"
        className="original-btn"
        aria-expanded={showOriginal}
        onClick={() => setShowOriginal((open) => !open)}
      >
        {showOriginal ? "Hide original NASA data" : "View original NASA data"}
      </button>

      {showOriginal && (
        <section className="original-panel">
          <h3>Original NASA data</h3>
          {experiment.original.length > 0 ? (
            <dl className="original-data">
              {experiment.original.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>No original figures have been added for this experiment yet.</p>
          )}
          <p className="original-note">Check these against NASA's own pages:</p>
          <ul className="sources">
            {experiment.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3>Reading</h3>
        <p className="headline">{reading.headline}</p>
        <p>{reading.body}</p>
        <ul>
          {reading.drivers.map((driver) => (
            <li key={driver}>{driver}</li>
          ))}
        </ul>
        <p className="caution">{reading.caution}</p>
      </section>

      <section>
        <h3>Findings</h3>
        <ul>
          {experiment.findings.map((finding) => (
            <li key={finding}>{finding}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Limits</h3>
        <ul>
          {experiment.limits.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Still open</h3>
        <ul>
          {experiment.openQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Score breakdown</h3>
        <ul className="bars">
          {DIMENSIONS.map((dimension) => (
            <li key={dimension.key}>
              <span>{dimension.label}</span>
              <span className="track">
                <span style={{ width: `${experiment.scores[dimension.key]}%` }} />
              </span>
              <b>{experiment.scores[dimension.key]}</b>
            </li>
          ))}
        </ul>
      </section>

      <div className="dossier-actions">
        <button type="button" onClick={() => onPin(experiment.id)}>
          {pinned ? "Unpin" : "Pin to compare"}
        </button>
        <button type="button" onClick={copyReading}>
          {copied ? "Copied" : "Copy reading"}
        </button>
      </div>
    </aside>
  );
}