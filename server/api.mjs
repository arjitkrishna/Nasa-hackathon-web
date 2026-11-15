import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

// Tiny .env reader. It must run before api/ask.js is loaded, because that file reads the key at startup.
const envPath = path.join(root, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

const PORT = process.env.PORT || 8787;
const { default: handler } = await import("../api/ask.js");

const server = http.createServer((req, res) => {
  if (req.url !== "/api/ask") {
    res.writeHead(404, { "content-type": "application/json" });
    return res.end(JSON.stringify({ error: "Not found." }));
  }

  let raw = "";
  req.on("data", (chunk) => {
    raw += chunk;
    if (raw.length > 10_000) req.destroy();
  });

  req.on("end", async () => {
    req.body = raw;
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (body) => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(body));
      return res;
    };
    try {
      console.log("Question received");
      await handler(req, res);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error." });
    }
  });
});

server.listen(PORT, () => {
  console.log(
    `Atlas API on http://localhost:${PORT} (${process.env.GEMINI_API_KEY ? "AI key found" : "offline mode: no API key"})`,
  );
});