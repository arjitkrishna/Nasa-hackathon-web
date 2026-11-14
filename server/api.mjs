import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

// Tiny .env reader, so no extra packages are needed.
const envPath = path.join(root, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

const PORT = 8787;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM = `You answer questions about NASA microgravity fire experiments for an atlas used by people planning fire safety for crewed Moon and Mars missions.

Rules:
- Use ONLY the experiment records provided. Do not add facts, numbers, or experiments from outside them.
- If the records do not answer the question, say: "The record in this atlas does not show this." Then say what the records do cover that is closest.
- Never invent numbers. Quote figures exactly as they appear in the records.
- Cite the experiments you used by id in square brackets, like [saffire-iv-vi].
- The "insight" fields are interpretations, not NASA statements. If you use one, say it is an interpretation.
- Keep answers under 150 words, in plain language.`;

function loadExperiments() {
  return JSON.parse(readFileSync(path.join(root, "data", "experiments.json"), "utf8"));
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

// Used when no API key is set, so the feature still shows something.
function offlineAnswer(question, experiments) {
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
    answer: `AI is not connected, so these are the closest records:\n\n${lines}`,
    sources: scored.map((x) => x.e.id),
    mode: "offline",
  };
}

async function askAI(question, experiments) {
  const started = Date.now();
  console.log(`Asking ${MODEL}...`);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": API_KEY,
      },
      body: JSON.stringify({
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
      }),
      signal: AbortSignal.timeout(40000),
    },
  );

  console.log(`Reply status ${response.status} after ${Math.round((Date.now() - started) / 1000)}s`);

  if (response.status === 429) {
    throw new Error("The free AI quota is used up for now. Wait a minute and try again.");
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI service error ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = await response.json();
  const answer = (data.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();

  if (!answer) throw new Error("The AI returned an empty answer. Try rephrasing the question.");

  const known = new Set(experiments.map((e) => e.id));
  const cited = [...answer.matchAll(/\[([a-z0-9-]+)\]/g)].map((m) => m[1]).filter((id) => known.has(id));
  return { answer, sources: [...new Set(cited)], mode: "ai" };
}

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/api/ask") {
    return send(res, 404, { error: "Not found." });
  }

  let raw = "";
  req.on("data", (chunk) => {
    raw += chunk;
    if (raw.length > 10_000) req.destroy();
  });

  req.on("end", async () => {
    try {
      const { question } = JSON.parse(raw || "{}");
      if (typeof question !== "string" || question.trim() === "") {
        return send(res, 400, { error: "Please type a question." });
      }
      if (question.length > 500) {
        return send(res, 400, { error: "Please keep the question under 500 characters." });
      }

      console.log("Question received:", question.trim());
      const experiments = loadExperiments();
      const result = API_KEY
        ? await askAI(question.trim(), experiments)
        : offlineAnswer(question, experiments);
      send(res, 200, result);
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.name === "TimeoutError"
          ? "The AI took longer than 40 seconds. Try a lighter model (see GEMINI_MODEL in .env)."
          : error instanceof Error
            ? error.message
            : "Server error.";
      send(res, 502, { error: message });
    }
  });
});

server.listen(PORT, () => {
  console.log(
    `Atlas API on http://localhost:${PORT} (${API_KEY ? `AI connected, model ${MODEL}` : "offline mode: no API key"})`,
  );
});