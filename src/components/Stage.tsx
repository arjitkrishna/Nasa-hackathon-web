import { formatScore } from "../lib/rank";
import type { RankedExperiment } from "../types";

interface StageProps {
  entries: RankedExperiment[];
  selectedId: string | null;
  pinnedIds: string[];
  onSelect: (id: string) => void;
  onPin: (id: string) => void;
}

export function Stage({ entries, selectedId, pinnedIds, onSelect, onPin }: StageProps) {
  const open = entries.find((entry) => entry.experiment.id === selectedId) ?? entries[0];

  return (
    <main className="stage">
      <header className="stage-head">
        <div>
          <p className="eyebrow">{open ? `Rank ${String(open.rank).padStart(2, "0")}` : "Current order"}</p>
          <h2>{open ? open.experiment.name : "No match"}</h2>
        </div>
        <p className="stage-note">
          {open
            ? `Atlas score ${formatScore(open.score)} under these weights. The three cards are the head of the same list.`
            : "Nothing in the catalog matches this search."}
        </p>
      </header>

      {entries.length > 0 && (
        <ol className="podium">
          {entries.slice(0, 3).map((entry) => (
            <li key={entry.experiment.id}>
              <button
                type="button"
                className={entry.experiment.id === selectedId ? "podium-card is-on" : "podium-card"}
                onClick={() => onSelect(entry.experiment.id)}
              >
                <span>{String(entry.rank).padStart(2, "0")}</span>
                <strong>{entry.experiment.name}</strong>
                <em>{formatScore(entry.score)}</em>
                <small>
                  {entry.experiment.domain} · {entry.experiment.platform}
                </small>
              </button>
            </li>
          ))}
        </ol>
      )}

      <ol className="ledger">
        {entries.map((entry) => {
          const pinned = pinnedIds.includes(entry.experiment.id);
          const selected = entry.experiment.id === selectedId;
          return (
            <li key={entry.experiment.id} className={selected ? "row is-on" : "row"}>
              <button type="button" className="row-hit" onClick={() => onSelect(entry.experiment.id)}>
                <span className="rank">{String(entry.rank).padStart(2, "0")}</span>
                <span>
                  <strong>{entry.experiment.name}</strong>
                  <small>
                    {entry.experiment.aka} · {entry.experiment.years}
                  </small>
                </span>
                <span className="meta">
                  <i>{entry.experiment.domain}</i>
                  <b>{formatScore(entry.score)}</b>
                </span>
              </button>
              <button
                type="button"
                className={pinned ? "pin is-on" : "pin"}
                aria-pressed={pinned}
                onClick={() => onPin(entry.experiment.id)}
              >
                {pinned ? "Pinned" : "Pin"}
              </button>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
