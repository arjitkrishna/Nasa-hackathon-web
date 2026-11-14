import { useEffect, useMemo, useState } from "react";
import { Compare } from "./components/Compare";
import { Dossier } from "./components/Dossier";
import { FiltersPanel, WeightsPanel } from "./components/Panels";
import { Stage } from "./components/Stage";
import { uniqueValues } from "./lib/catalog";
import { DEFAULT_WEIGHTS, PRESETS, rankExperiments, sameWeights } from "./lib/rank";
import type { Experiment, Weights } from "./types";

const MAX_PINS = 3;

type View = "filters" | "weights" | "compare";

const TITLES: Record<View, string> = {
  filters: "Search & filters",
  weights: "Weights",
  compare: "Compare",
};

const HINTS: Record<View, string> = {
  filters: "Find an experiment by name, domain or platform",
  weights: "Decide what matters to you",
  compare: "Read pinned experiments side by side",
};

interface AppProps {
  catalog: Experiment[];
  catalogError: string | null;
}

export function App({ catalog, catalogError }: AppProps) {
  const [view, setView] = useState<View | null>(null);
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [status, setStatus] = useState("all");
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  const domains = useMemo(() => uniqueValues(catalog, "domain"), [catalog]);
  const platforms = useMemo(() => uniqueValues(catalog, "platform"), [catalog]);
  const statuses = useMemo(() => uniqueValues(catalog, "status"), [catalog]);

  const ranked = useMemo(() => rankExperiments(catalog, weights), [catalog, weights]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ranked.filter(({ experiment }) => {
      if (domain !== "all" && experiment.domain !== domain) return false;
      if (platform !== "all" && experiment.platform !== platform) return false;
      if (status !== "all" && experiment.status !== status) return false;
      if (!needle) return true;
      const haystack = [
        experiment.name,
        experiment.aka,
        experiment.program,
        experiment.center,
        experiment.summary,
        experiment.meaning,
        experiment.domain,
        experiment.platform,
        ...experiment.findings,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [ranked, query, domain, platform, status]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.closest("input, textarea");
      if (event.key === "/" && !typing) {
        event.preventDefault();
        setView("filters");
        window.setTimeout(() => document.getElementById("catalog-search")?.focus(), 0);
      }
      if (event.key === "Escape") {
        if (selectedId) setSelectedId(null);
        else setView(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const selected = ranked.find((entry) => entry.experiment.id === selectedId) ?? null;
  const pinned = pinnedIds
    .map((id) => ranked.find((entry) => entry.experiment.id === id))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const activePreset = PRESETS.find((preset) => sameWeights(preset.weights, weights))?.id ?? null;
  const activeFilters = [query.trim() !== "", domain !== "all", platform !== "all", status !== "all"].filter(Boolean).length;

  const badges: Record<View, string> = {
    filters: activeFilters ? `${activeFilters} active` : `${visible.length} of ${catalog.length}`,
    weights: PRESETS.find((preset) => preset.id === activePreset)?.label ?? "Custom",
    compare: `${pinnedIds.length} of ${MAX_PINS}`,
  };

  function togglePin(id: string) {
    setPinnedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= MAX_PINS) return [...current.slice(1), id];
      return [...current, id];
    });
  }

  function resetAll() {
    setQuery("");
    setDomain("all");
    setPlatform("all");
    setStatus("all");
    setWeights(DEFAULT_WEIGHTS);
  }

  if (catalogError) {
    return (
      <main className="boot-error">
        <p className="eyebrow">Catalog</p>
        <h1>The experiment file needs a fix.</h1>
        <p>{catalogError}</p>
        <p className="quiet">Edit data/experiments.json and reload.</p>
      </main>
    );
  }

  return (
    <div className={view ? "home has-panel" : "home"}>
      <header className="home-brand">
        <p className="mark">Orrery</p>
        <h1>NASA experiment atlas</h1>
        <p className="lede">
          A reading room for public investigations. Rank them with your own weights, then read what the record actually supports.
        </p>
      </header>

      <nav className="home-nav" aria-label="Sections">
        {(Object.keys(TITLES) as View[]).map((id) => (
          <button
            key={id}
            type="button"
            className={view === id ? "nav-btn is-on" : "nav-btn"}
            aria-expanded={view === id}
            onClick={() => setView(view === id ? null : id)}
          >
            <span className="nav-top">
              <strong>{TITLES[id]}</strong>
              <em>{badges[id]}</em>
            </span>
            <small>{HINTS[id]}</small>
          </button>
        ))}
      </nav>

      {view && (
        <section className="panel" aria-label={TITLES[view]}>
          <header className="panel-head">
            <h2>{TITLES[view]}</h2>
            <div>
              {(view === "filters" || view === "weights") && (
                <button type="button" className="chip" onClick={resetAll}>
                  Reset filters and weights
                </button>
              )}
              <button type="button" className="chip" onClick={() => setView(null)}>
                Close
              </button>
            </div>
          </header>

          {view === "filters" && (
            <FiltersPanel
              query={query}
              domain={domain}
              platform={platform}
              status={status}
              domains={domains}
              platforms={platforms}
              statuses={statuses}
              count={visible.length}
              total={catalog.length}
              onQuery={setQuery}
              onDomain={setDomain}
              onPlatform={setPlatform}
              onStatus={setStatus}
            />
          )}

          {view === "weights" && (
            <WeightsPanel
              weights={weights}
              activePreset={activePreset}
              onWeights={setWeights}
              onPreset={(preset) => setWeights(preset.weights)}
            />
          )}

          {view === "compare" && <Compare entries={pinned} onRemove={togglePin} onOpen={setSelectedId} />}

          <div className="panel-ranking">
            <Stage
              entries={visible}
              selectedId={selectedId}
              pinnedIds={pinnedIds}
              onSelect={setSelectedId}
              onPin={togglePin}
            />
          </div>
        </section>
      )}

      {selected && (
        <>
          <div className="drawer-backdrop" onClick={() => setSelectedId(null)} />
          <div className="drawer">
            <button type="button" className="chip drawer-close" onClick={() => setSelectedId(null)}>
              Close
            </button>
            <Dossier
              entry={selected}
              weights={weights}
              pinned={pinnedIds.includes(selected.experiment.id)}
              onPin={togglePin}
            />
          </div>
        </>
      )}
    </div>
  );
}