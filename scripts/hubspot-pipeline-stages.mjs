import { readFileSync } from "node:fs";

function tokenFromEnvFile() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("HUBSPOT_ACCESS_TOKEN=")) continue;
    return line.slice("HUBSPOT_ACCESS_TOKEN=".length).trim().replace(/^['"]|['"]$/g, "");
  }
  return "";
}

const token = process.env.HUBSPOT_ACCESS_TOKEN?.trim() || tokenFromEnvFile();
if (!token) {
  console.log(JSON.stringify({ ok: false, recordsModified: false, error: "missing_token" }));
  process.exit(1);
}

const response = await fetch("https://api.hubapi.com/crm/v3/pipelines/deals/default", {
  method: "GET",
  headers: { authorization: `Bearer ${token}` },
});

let body = null;
try {
  body = await response.json();
} catch {
  body = null;
}

if (!response.ok) {
  console.log(
    JSON.stringify({
      ok: false,
      recordsModified: false,
      method: "GET",
      path: "/crm/v3/pipelines/deals/default",
      httpStatus: response.status,
      category: typeof body?.category === "string" ? body.category : null,
    }),
  );
  process.exit(1);
}

const stages = Array.isArray(body?.stages) ? body.stages : [];
console.log(
  JSON.stringify({
    ok: true,
    recordsModified: false,
    method: "GET",
    path: "/crm/v3/pipelines/deals/default",
    httpStatus: response.status,
    pipelineId: typeof body?.id === "string" ? body.id : null,
    pipelineLabel: typeof body?.label === "string" ? body.label : null,
    stages: stages.map((stage) => ({
      label: typeof stage?.label === "string" ? stage.label : null,
      id: typeof stage?.id === "string" ? stage.id : null,
      displayOrder: typeof stage?.displayOrder === "number" ? stage.displayOrder : null,
      archived: stage?.archived === true,
    })),
  }),
);
