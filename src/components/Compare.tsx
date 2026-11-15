import { formatScore } from "../lib/rank";
import { DIMENSIONS, type Experiment, type RankedExperiment } from "../types";

interface CompareProps {
  entries: RankedExperiment[];
  onRemove: (id: string) => void;
  onOpen: (id: string) => void;
}

const UNKNOWN = new Set(["Not listed", "Not reported"]);

function range(min: number | undefined, max: number | undefined, unit: string): string {
  if (min === undefined && max === undefined) return "Not reported";
  if (min !== undefined && max !== undefined) return min === max ? `${min} ${unit}` : `${min} to ${max} ${unit}`;
  if (max !== undefined) return `up to ${max} ${unit}`;
  return `from ${min} ${unit}`;
}

interface Row {
  label: string;
  value: (experiment: Experiment) => string;
}

const SETUP_ROWS: Row[] = [
  { label: "Domain", value: (e) => e.domain },
  { label: "Platform", value: (e) => e.platform },
  { label: "Years", value: (e) => e.years },
  { label: "Status", value: (e) => e.status.replace("-", " ") },
  { label: "Fuel", value: (e) => e.fuel || "Not listed" },
  { label: "Hardware", value: (e) => e.hardware || "Not listed" },
  { label: "Measurements", value: (e) => e.measurements || "Not listed" },
  { label: "Oxygen", value: (e) => range(e.conditions.oxygenMin, e.conditions.oxygenMax, "%") },
  { label: "Pressure", value: (e) => range(e.conditions.pressureMin, e.conditions.pressureMax, "atm") },
  { label: "Airflow", value: (e) => range(e.conditions.flowMin, e.conditions.flowMax, "cm/s") },
];

type Verdict = "same" | "differs" | "partial" | "none";

function judge(values: string[]): Verdict {
  const known = values.filter((value) => !UNKNOWN.has(value));
  if (known.length === 0) return "none";
  if (known.length < values.length) return "partial";
  const first = known[0].trim().toLowerCase();
  return known.every((value) => value.trim().toLowerCase() === first) ? "same" : "differs";
}

const TAG_TEXT: Record<Verdict, string> = {
  same: "Same",
  differs: "Differs",
  partial: "Missing for some",
  none: "No data",
};

export function Compare({ entries, onRemove, onOpen }: CompareProps) {
  if (entries.length === 0) {
    return (
      <section className="compare" aria-label="Pinned comparison">
        <p className="quiet">Nothing pinned yet. Press Pin on up to three experiments in the list below to compare them.</p>
      </section>
    );
  }

  const many = entries.length > 1;
  const differing = many
    ? SETUP_ROWS.filter((row) => judge(entries.map((entry) => row.value(entry.experiment))) === "differs").length
    : 0;

  return (
    <section className="compare" aria-label="Pinned comparison">
      <p className="compare-summary">
        {many
          ? `${entries.length} pinned. ${differing} of ${SETUP_ROWS.length} setup details differ. Scores use your weights from the Weights panel.`
          : "Pin one more experiment to see what is the same and what differs."}
      </p>

      <div className="compare-scroll">
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col">Detail</th>
              {entries.map((entry) => (
                <th key={entry.experiment.id} scope="col">
                  <button type="button" className="compare-name" onClick={() => onOpen(entry.experiment.id)}>
                    {entry.experiment.name}
                  </button>
                  <span className="score">
                    {formatScore(entry.score)} · rank {entry.rank}
                  </span>
                  <button
                    type="button"
                    className="chip"
                    onClick={() => onRemove(entry.experiment.id)}
                    aria-label={`Unpin ${entry.experiment.name}`}
                  >
                    Remove
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SETUP_ROWS.map((row) => {
              const values = entries.map((entry) => row.value(entry.experiment));
              const verdict = judge(values);
              return (
                <tr key={row.label}>
                  <th scope="row">
                    {row.label}
                    {many && <span className={`tag ${verdict}`}>{TAG_TEXT[verdict]}</span>}
                  </th>
                  {values.map((value, index) => (
                    <td key={entries[index].experiment.id}>{value}</td>
                  ))}
                </tr>
              );
            })}
            <tr>
              <th scope="row">What it means</th>
              {entries.map((entry) => (
                <td key={entry.experiment.id}>{entry.experiment.meaning}</td>
              ))}
            </tr>
            <tr className="compare-group">
              <th colSpan={entries.length + 1}>Scores (0 to 100)</th>
            </tr>
            {DIMENSIONS.map((dimension) => (
              <tr key={dimension.key}>
                <th scope="row">{dimension.label}</th>
                {entries.map((entry) => (
                  <td key={entry.experiment.id}>{entry.experiment.scores[dimension.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}