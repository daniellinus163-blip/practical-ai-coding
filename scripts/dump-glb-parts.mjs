import { readFileSync } from "node:fs";
import { basename } from "node:path";

function dumpGlb(path) {
  const buf = readFileSync(path);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
  const nodes = json.nodes ?? [];
  const meshes = json.meshes ?? [];
  const materials = (json.materials ?? []).map((m, i) => `${i}:${m.name || "(unnamed)"}`);
  console.log("\n====", basename(path), "====");
  console.log("materials:", materials.join(" | "));
  console.log("meshes:", meshes.map((m, i) => `${i}:${m.name || "(unnamed)"} primitives=${m.primitives?.length}`).join(" | "));
  console.log("nodes:");
  nodes.forEach((n, i) => {
    const extras = [
      n.mesh != null ? `mesh=${n.mesh}` : null,
      n.children?.length ? `children=[${n.children.join(",")}]` : null,
      n.translation ? `t=${n.translation.map((v) => v.toFixed?.(2) ?? v)}` : null,
      n.rotation ? `r=${n.rotation.map((v) => Number(v).toFixed(3))}` : null,
    ]
      .filter(Boolean)
      .join(" ");
    console.log(`  ${i} ${n.name || "(unnamed)"} ${extras}`);
  });
}

const files = process.argv.slice(2);
for (const file of files) dumpGlb(file);
