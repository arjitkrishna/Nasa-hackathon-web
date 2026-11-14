export const DIMENSIONS = [
  {
    key: "impact",
    label: "Fire-safety impact",
    hint: "Does it change how fires are prevented, detected or fought?",
  },
  {
    key: "evidence",
    label: "Evidence",
    hint: "How hard is the result to wave off?",
  },
  {
    key: "openness",
    label: "Open record",
    hint: "Can a newcomer reach the write-up?",
  },
  {
    key: "exploration",
    label: "Moon & Mars fit",
    hint: "Does it apply to cabins, partial gravity and exploration atmospheres?",
  },
  {
    key: "clarity",
    label: "Clarity",
    hint: "Can the result be said in one sentence?",
  },
] as const;

export type DimensionKey = (typeof DIMENSIONS)[number]["key"];
export type Weights = Record<DimensionKey, number>;

export type ExperimentStatus = "completed" | "active" | "in-analysis" | "series";

export interface SourceLink {
  label: string;
  url: string;
}

export interface OriginalDatum {
  label: string;
  value: string;
}

export interface FireInsight {
  crew: string;
  design: string;
}

export interface Experiment {
  id: string;
  name: string;
  aka: string;
  program: string;
  center: string;
  years: string;
  status: ExperimentStatus;
  domain: string;
  platform: string;
  summary: string;
  findings: string[];
  meaning: string;
  limits: string[];
  openQuestions: string[];
  scores: Weights;
  sources: SourceLink[];
  original: OriginalDatum[];
  insight: FireInsight | null;
}

export interface RankedExperiment {
  experiment: Experiment;
  score: number;
  rank: number;
}

export interface Preset {
  id: string;
  label: string;
  weights: Weights;
}
