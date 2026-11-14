import { DIMENSIONS, type Experiment, type Preset, type RankedExperiment, type Weights } from "../types";

export const DEFAULT_WEIGHTS: Weights = {
  impact: 50,
  evidence: 50,
  openness: 50,
  exploration: 50,
  clarity: 50,
};

export const PRESETS: Preset[] = [
  { id: "even", label: "Even", weights: { ...DEFAULT_WEIGHTS } },
  {
    id: "mission",
    label: "Mission",
    weights: { impact: 40, evidence: 35, openness: 15, exploration: 100, clarity: 30 },
  },
  {
    id: "evidence",
    label: "Evidence",
    weights: { impact: 35, evidence: 100, openness: 25, exploration: 20, clarity: 70 },
  },
  {
    id: "open",
    label: "Open record",
    weights: { impact: 30, evidence: 40, openness: 100, exploration: 20, clarity: 45 },
  },
];

export function scoreExperiment(experiment: Experiment, weights: Weights): number {
  const weightTotal = DIMENSIONS.reduce((sum, dimension) => sum + weights[dimension.key], 0);
  if (weightTotal <= 0) return 0;
  const weighted = DIMENSIONS.reduce(
    (sum, dimension) => sum + experiment.scores[dimension.key] * weights[dimension.key],
    0,
  );
  return weighted / weightTotal;
}

export function rankExperiments(experiments: Experiment[], weights: Weights): RankedExperiment[] {
  return experiments
    .map((experiment) => ({
      experiment,
      score: scoreExperiment(experiment, weights),
      rank: 0,
    }))
    .sort((a, b) => b.score - a.score || a.experiment.name.localeCompare(b.experiment.name))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function formatScore(score: number): string {
  return score.toFixed(1);
}

export function sameWeights(a: Weights, b: Weights): boolean {
  return DIMENSIONS.every((dimension) => a[dimension.key] === b[dimension.key]);
}
