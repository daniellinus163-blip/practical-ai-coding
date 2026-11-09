import fs from "node:fs";
import path from "node:path";
import { vehicle3DManifest } from "../src/configurator/manifest.ts";

const root = process.cwd();

for (const asset of vehicle3DManifest) {
  const src = path.join(root, asset.relativeFile);
  const dest = path.join(root, "public", asset.publicUrl.replace(/^\//, ""));

  if (asset.relativeFile.endsWith(".zip")) {
    if (!fs.existsSync(dest)) {
      console.warn(`[sync-models] ${asset.vehicleSlug}: unzip ${asset.relativeFile} to public${asset.publicUrl} manually`);
    }
    continue;
  }

  if (!fs.existsSync(src)) {
    console.warn(`[sync-models] missing source for ${asset.vehicleSlug}: ${asset.relativeFile}`);
    continue;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`[sync-models] ${asset.vehicleSlug} → ${asset.publicUrl}`);
}
