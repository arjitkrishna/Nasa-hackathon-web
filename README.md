# Orrery

A local base for a dashboard that summarizes, ranks, and interprets NASA experiments. The catalog is a starter set of public investigations. It is not NASA’s database, and the order is not an official ranking.

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints, usually http://localhost:5173.

## Where to edit

| Path | What it is |
| --- | --- |
| `data/experiments.json` | The catalog. Add an experiment by copying an object. |
| `src/lib/rank.ts` | How a score is computed from the five weights. |
| `src/lib/interpret.ts` | The reading panel. This is the seam for a live model later. |
| `src/styles.css` | The visual system. |

`data/` is the shared folder for records. Add sibling folders here (`notes`, `imports`, `api`) when you want raw downloads or a backend beside the site.

## What the numbers mean

Each record has five editorial scores from 0 to 100: impact, evidence, open record, exploration, and clarity. The dashboard score is their weighted mean. Presets and sliders change only the weights. They do not change the underlying scores.

Summaries are condensed from public results. Check the source link before you treat a sentence as final.
