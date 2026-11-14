import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import rawCatalog from "../data/experiments.json";
import { App } from "./App";
import { loadCatalog } from "./lib/catalog";
import "./styles.css";
import "./home.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

let catalogError: string | null = null;
let catalog: ReturnType<typeof loadCatalog> = [];
try {
  catalog = loadCatalog(rawCatalog);
} catch (error) {
  catalogError = error instanceof Error ? error.message : "Could not read the catalog.";
}

createRoot(root).render(
  <StrictMode>
    <App catalog={catalog} catalogError={catalogError} />
  </StrictMode>,
);