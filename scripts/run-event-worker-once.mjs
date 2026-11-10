import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const envPath = new URL("../.env.local", import.meta.url);
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 1 || line.trimStart().startsWith("#")) continue;
  const key = line.slice(0, i).trim();
  const value = line.slice(i + 1).trim();
  if (key && process.env[key] === undefined) process.env[key] = value;
}

const { runEventWorker } = await import("../src/events/run.ts");
const result = await runEventWorker("manual-retry");
console.log(result);
