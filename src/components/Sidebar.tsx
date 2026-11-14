import { DIMENSIONS, type Preset, type Weights } from "../types";
import { PRESETS } from "../lib/rank";

interface SidebarProps {
  query: string;
  domain: string;
  platform: string;
  status: string;
  domains: string[];
  platforms: string[];
  statuses: string[];
  weights: Weights;
  activePreset: string | null;
  count: number;
  total: number;
  onQuery: (value: string) => void;
  onDomain: (value: string) => void;
  onPlatform: (value: string) => void;
  onStatus: (value: string) => void;
  onWeights: (weights: Weights) => void;
  onPreset: (preset: Preset) => void;
  onReset: () => void;
}

export function Sidebar(props: SidebarProps) {
  return (
    <aside className="rail">
      <header className="brand">
        <p className="mark">Orrery</p>
        <h1>NASA experiment atlas</h1>
        <p className="lede">
          A reading room for public investigations. Rank them with your own weights, then read what the record actually supports.
        </p>
      </header>

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

      <section className="weights">
        <div className="section-head">
          <h2>Weights</h2>
          <span>
            {props.count} of {props.total}
          </span>
        </div>
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
      </section>

      <button type="button" className="text-button" onClick={props.onReset}>
        Reset filters and weights
      </button>
      <p className="footnote">Scores live in data/experiments.json. Press / to search.</p>
    </aside>
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
