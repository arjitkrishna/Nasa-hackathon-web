import { DIMENSIONS, type Experiment, type ExperimentStatus, type FireInsight, type OriginalDatum, type SourceLink } from "../types";
const STATUSES = new Set<ExperimentStatus>(["completed", "active", "in-analysis", "series"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

function requiredList(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a list with at least one entry.`);
  }
  return value.map((item, index) => requiredString(item, `${label} item ${index + 1}`));
}

function requiredSources(value: unknown, label: string): SourceLink[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must include at least one source.`);
  }
  return value.map((item, index) => {
    const where = `${label} source ${index + 1}`;
    if (!isRecord(item)) throw new Error(`${where} must be an object.`);
    const url = requiredString(item.url, `${where} url`);
    if (!url.startsWith("https://")) {
      throw new Error(`${where} url must start with https://`);
    }
    return { label: requiredString(item.label, `${where} label`), url };
  });
}

function optionalOriginal(value: unknown, label: string): OriginalDatum[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error(`${label} original must be a list.`);
  }
  return value.map((item, index) => {
    const where = `${label} original ${index + 1}`;
    if (!isRecord(item)) throw new Error(`${where} must be an object.`);
    return {
      label: requiredString(item.label, `${where} label`),
      value: requiredString(item.value, `${where} value`),
    };
  });
}

function optionalInsight(value: unknown, label: string): FireInsight | null {
  if (value === undefined) return null;
  if (!isRecord(value)) throw new Error(`${label} insight must be an object.`);
  return {
    crew: requiredString(value.crew, `${label} insight crew`),
    design: requiredString(value.design, `${label} insight design`),
  };
}

export function loadCatalog(raw: unknown): Experiment[] {
  if (!Array.isArray(raw)) {
    throw new Error("data/experiments.json must be an array.");
  }

  const ids = new Set<string>();
  return raw.map((item, index) => {
    const where = `Experiment ${index + 1}`;
    if (!isRecord(item)) throw new Error(`${where} must be an object.`);

    const id = requiredString(item.id, `${where} id`);
    if (ids.has(id)) throw new Error(`Duplicate id "${id}".`);
    ids.add(id);

    const status = requiredString(item.status, `${where} status`);
    if (!STATUSES.has(status as ExperimentStatus)) {
      throw new Error(`${where} status must be completed, active, in-analysis, or series.`);
    }

    if (!isRecord(item.scores)) throw new Error(`${where} is missing scores.`);
    const scores = {} as Experiment["scores"];
    for (const dimension of DIMENSIONS) {
      const value = item.scores[dimension.key];
      if (typeof value !== "number" || value < 0 || value > 100) {
        throw new Error(`${where} score "${dimension.key}" must be a number from 0 to 100.`);
      }
      scores[dimension.key] = value;
    }

    return {
      id,
      name: requiredString(item.name, `${where} name`),
      aka: requiredString(item.aka, `${where} aka`),
      program: requiredString(item.program, `${where} program`),
      center: requiredString(item.center, `${where} center`),
      years: requiredString(item.years, `${where} years`),
      status: status as ExperimentStatus,
      domain: requiredString(item.domain, `${where} domain`),
      platform: requiredString(item.platform, `${where} platform`),
      summary: requiredString(item.summary, `${where} summary`),
      findings: requiredList(item.findings, `${where} findings`),
      meaning: requiredString(item.meaning, `${where} meaning`),
      limits: requiredList(item.limits, `${where} limits`),
      openQuestions: requiredList(item.openQuestions, `${where} openQuestions`),
      scores,
      sources: requiredSources(item.sources, where),
      original: optionalOriginal(item.original, where),
      insight: optionalInsight(item.insight, where),
    };
  });
}

export function uniqueValues(experiments: Experiment[], key: "domain" | "platform" | "status"): string[] {
  return [...new Set(experiments.map((experiment) => experiment[key]))].sort((a, b) => a.localeCompare(b));
}
