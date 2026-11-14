import { readFileSync } from "node:fs";
import path from "node:path";

const PREFERRED = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const API_KEY = process.env.GEMINI_API_KEY;
const BASE = "https://generativelanguage.googleapis.com/v1beta";

const SYSTEM = `You answer questions about NASA microgravity fire experiments for an atlas used by people planning fire safety for crewed Moon and Mars missions.

Rules:
- Use ONLY the experiment records provided. Do not add facts, numbers, or experiments from outside them.
- If the records do not answer the question, say: "The record in this atlas does not show this." Then say what the records do cover that is closest.
- Never invent numbers. Quote figures exactly as they appear in the records.
- Cite the experiments you used by id in square brackets, like [saffire-iv-vi].
- The "insight" fields are interpretations, not NASA statements. If you use one, say it is an interpretation.
- Keep answers under 150 words, in plain language.`;

function loadExperiments() {
  return JSON.parse(readFileSync(path.join(process.cwd(), "data", "experiments.json"), "utf8"));
}

function toContext(list) {
  return list.map((e) => ({
    id: e.id,
    name: e.name,
    aka: e.aka,
    years: e.years,
    status: e.status,
    domain: e.domain,
    platform: e.platform,
    summary: e.summary,
    findings: e.findings,
    meaning: e.meaning,
    limits: e.limits,
    openQuestions: e.openQuestions,
    original: e.original ?? [],
    insight: e.insight ?? null,
  }));
}

function offlineAnswer(question, experiments, intro) {
  const words = question.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [];
  const scored = experiments
    .map((e) => {
      const haystack = JSON.stringify(e).toLowerCase();
      return { e, score: words.filter((w) => haystack.includes(w)).length };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  if (scored.length === 0) {
    return { answer: "The record in this atlas does not show this.", sources: [], mode: "offline" };
  }
  const lines = scored.map(({ e }) => `${e.name}: ${e.meaning} [${e.id}]`).join("\n\n");
  return {
    answer: `${intro}\n\n${lines}`,
    sources: scored.map((x) => x.e.id),
    mode: "offline",
  };
}

// Your preferred model first, then up to two other Flash models your key can use.
async function pickModels() {
  const models = [PREFERRED];
  try {
    const response = await fetch(`${BASE}/models?pageSize=100`, {
      headers: { "x-goog-api-key": API_KEY },
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      const data = await response.json();
      const found = (data.models ?? [])
        .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
        .map((m) => String(m.name).replace(/^models\//, ""))
        .filter((name) => /flash/.test(name))
        .filter((name) => !/(image|tts|live|audio|embed|thinking|exp|robotics|computer)/.test(name))
                .sort((a, b) => Number(/lite/.test(b)) - Number(/lite/.test(a)) || b.localeCompare(a));
      for (const name of found) {
        if (!models.includes(name)) models.push(name);
      }
    }
  } catch {
    // If the list can't be fetched, just use the preferred model.
  }
  return models.slice(0, 3);
}

async function askAI(question, experiments) {
  const payload = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Experiment records (JSON):\n${JSON.stringify(toContext(experiments))}\n\nQuestion: ${question}`,
          },
        ],
      },
    ],
    generationConfig: { maxOutputTokens: 2000, temperature: 0.2 },
  });

  const deadline = Date.now() + 24000;
  const reasons = [];
  const models = await pickModels();

  for (const model of models) {
    try {
      const response = await fetch(`${BASE}/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": API_KEY },
        body: payload,
                signal: AbortSignal.timeout(Math.max(2000, Math.min(18000, deadline - Date.now()))),
      });

      // Busy, out of quota, or model missing: try the next model.
      if ([429, 503, 404].includes(response.status)) {
        reasons.push(`${model}: ${response.status}`);
        continue;
      }
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`AI service error ${response.status} on ${model}: ${text.slice(0, 300)}`);
      }

      const data = await response.json();
      const answer = (data.candidates?.[0]?.content?.parts ?? [])
        .map((part) => part.text ?? "")
        .join("\n")
        .trim();
      if (!answer) {
        reasons.push(`${model}: empty answer`);
        continue;
      }

      const known = new Set(experiments.map((e) => e.id));
      const cited = [...answer.matchAll(/\[([a-z0-9-]+)\]/g)].map((m) => m[1]).filter((id) => known.has(id));
      return { answer, sources: [...new Set(cited)], mode: "ai", model };
    } catch (error) {
      if (error.name === "TimeoutError") {
        reasons.push(`${model}: too slow`);
        continue;
      }
      throw error;
    }
  }

  const failure = new Error(reasons.join(", ") || "no model answered");
  failure.temporary = true;
  throw failure;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body ?? {});
    const question = body.question;
    if (typeof question !== "string" || question.trim() === "") {
      return res.status(400).json({ error: "Please type a question." });
    }
    if (question.length > 500) {
      return res.status(400).json({ error: "Please keep the question under 500 characters." });
    }

    const experiments = loadExperiments();
    if (!API_KEY) {
      return res.status(200).json(
        offlineAnswer(question, experiments, "AI is not connected, so these are the closest records:"),
      );
    }

    try {
      return res.status(200).json(await askAI(question.trim(), experiments));
    } catch (error) {
      if (error.temporary) {
        return res.status(200).json(
          offlineAnswer(
            question,
            experiments,
            `The AI could not answer right now (${error.message}), so here are the closest records instead:`,
          ),
        );
      }
      throw error;
    }
  } catch (error) {
    console.error(error);
    return res.status(502).json({ error: error instanceof Error ? error.message : "Server error." });
  }
}