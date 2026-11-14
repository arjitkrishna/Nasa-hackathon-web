import { formatScore } from "../lib/rank";
import type { RankedExperiment } from "../types";

interface CompareProps {
  entries: RankedExperiment[];
  onRemove: (id: string) => void;
  onOpen: (id: string) => void;
}

export function Compare({ entries, onRemove, onOpen }: CompareProps) {
  if (entries.length === 0) {
    return (
      <section className="compare" aria-label="Pinned comparison">
        <p className="quiet">Nothing pinned yet. Open Rankings and press Pin on up to three experiments.</p>
      </section>
    );
  }

  return (
    <section className="compare" aria-label="Pinned comparison">
      <header>
        <p>Pinned · {entries.length} of 3</p>
        <span>Same weights as the list</span>
      </header>
      <ul>
        {entries.map((entry) => (
          <li key={entry.experiment.id}>
            <button type="button" onClick={() => onOpen(entry.experiment.id)}>
              <strong>{entry.experiment.name}</strong>
              <em>{formatScore(entry.score)}</em>
              <small>{entry.experiment.meaning}</small>
            </button>
            <button type="button" className="remove" onClick={() => onRemove(entry.experiment.id)} aria-label={`Unpin ${entry.experiment.name}`}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}