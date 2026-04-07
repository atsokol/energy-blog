// Build-time data loader — runs during `npm run build` / `npm run dev`.
// Reads MAPBOX_TOKEN from the environment or from a local .env file.
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Parse .env file if it exists (Observable Framework doesn't auto-load it)
const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
}

const token = process.env.MAPBOX_TOKEN;
if (!token) throw new Error("MAPBOX_TOKEN is not set. Add it to .env or set it as an environment variable.");
process.stdout.write(JSON.stringify({ token }));
