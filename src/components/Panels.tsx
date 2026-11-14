import { DIMENSIONS, type Preset, type Weights } from "../types";
import { PRESETS } from "../lib/rank";

interface FiltersPanelProps {
  query: string;
  domain: string;
  platform: string;
  status: string;
  domains: string[];
  platforms: string[];
  statuses: string[];
  count: number;
  total: number;
  onQuery: (value: string) => void;
  onDomain: (value: string) => void;
  onPlatform: (value: string) => void;
  onStatus: (value: string) => void;
}

export function FiltersPanel(props: FiltersPanelProps) {
  return (
    <div>
      <label className="search" htmlFor="catalog-search">
        <span>Search</span>
        <input
          id="catalog-search"
          value={props.query}
          placeholder="Name, center, finding"
          onChange={(event) => props.onQuery(event.target.value)}
        />
      </label>

      <Filter label="Domain" value={props.domain} options={props.domains} onChange={props.onDomain} />
      <Filter label="Platform" value={props.platform} options={props.platforms} onChange={props.onPlatform} />
      <Filter label="Status" value={props.status} options={props.statuses} onChange={props.onStatus} />

      <p className="footnote">
        {props.count} of {props.total} experiments match. Press / to search from anywhere.
      </p>
    </div>
  );
}

interface WeightsPanelProps {
  weights: Weights;
  activePreset: string | null;
  onWeights: (weights: Weights) => void;
  onPreset: (preset: Preset) => void;
}

export function WeightsPanel(props: WeightsPanelProps) {
  return (
    <div className="weights">
      <div className="presets">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={props.activePreset === preset.id ? "chip is-on" : "chip"}
            onClick={() => props.onPreset(preset)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {DIMENSIONS.map((dimension) => (
        <label key={dimension.key} className="slider">
          <span>
            {dimension.label}
            <strong>{props.weights[dimension.key]}</strong>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={props.weights[dimension.key]}
            aria-label={dimension.hint}
            onChange={(event) =>
              props.onWeights({ ...props.weights, [dimension.key]: Number(event.target.value) })
            }
          />
          <small>{dimension.hint}</small>
        </label>
      ))}
      <p className="footnote">Scores live in data/experiments.json.</p>
    </div>
  );
}

function Filter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="filter">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replaceAll("-", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}