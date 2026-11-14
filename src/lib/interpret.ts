import { DIMENSIONS, type Experiment, type Weights } from "../types";
import { scoreExperiment } from "./rank";

export interface Reading {
  headline: string;
  body: string;
  drivers: string[];
  caution: string;
}

/**
 * Builds the reading panel from fields already on the record.
 * Replace this function when you connect a model. Keep the Reading shape
 * and the component that renders it can stay as it is.
 */
export function interpret(experiment: Experiment, weights: Weights): Reading {
  const rankedDimensions = [...DIMENSIONS].sort(
    (a, b) => experiment.scores[b.key] - experiment.scores[a.key],
  );
  const strongest = rankedDimensions[0];
  const softest = rankedDimensions[rankedDimensions.length - 1];
  const emphasized = [...DIMENSIONS]
    .filter((dimension) => weights[dimension.key] > 0)
    .sort((a, b) => weights[b.key] - weights[a.key])[0];

  const headline = `${experiment.name} reads strongest on ${strongest.label.toLowerCase()} and softest on ${softest.label.toLowerCase()}.`;
  const emphasis =
    emphasized.key === strongest.key
      ? `Your current weights lean on ${emphasized.label.toLowerCase()}, which is already this record’s strongest score.`
      : `Your current weights lean on ${emphasized.label.toLowerCase()}. On that axis the record scores ${experiment.scores[emphasized.key]}.`;

  return {
    headline,
    body: `${experiment.meaning} ${emphasis}`,
    drivers: [
      `Strongest score: ${strongest.label} ${experiment.scores[strongest.key]}.`,
      `Softest score: ${softest.label} ${experiment.scores[softest.key]}.`,
      `Atlas score under these weights: ${scoreExperiment(experiment, weights).toFixed(1)}.`,
    ],
    caution: experiment.limits[0],
  };
}

export function readingText(experiment: Experiment, reading: Reading): string {
  const findings = experiment.findings.map((finding) => `- ${finding}`).join("\n");
  const questions = experiment.openQuestions.map((question) => `- ${question}`).join("\n");
  const sources = experiment.sources.map((source) => `- ${source.label}: ${source.url}`).join("\n");
  return [
    experiment.name,
    experiment.summary,
    "",
    reading.headline,
    reading.body,
    "",
    "Findings",
    findings,
    "",
    "Still open",
    questions,
    "",
    "Sources",
    sources,
  ].join("\n");
}
