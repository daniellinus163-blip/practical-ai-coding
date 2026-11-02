import type { Mesh, Object3D } from "three";

const EXCLUDE =
  /glass|tire|tyre|rubber|chrome|carbon|interior|light|lamp|caliper|rotor|rim|wheel|hub|grill|grille|plastic|leather|seat|brake|mirror|carpet|belt|thread|sidewall|emissive|headlight|taillight|indicator|vent|exhaust|logo|badge|stitch|alcantara|carpet|lcd|button/i;

const PAINT_NAME =
  /paint|carpaint|primary|body$|^body$|sennapaint|sennapaintmain|car_main_paint|car main paint|^PAINT$|body_color|coloured|colored|shell_t|huayra_paint|gls_paint|vehicle_paint/i;

const RIM_NAME = /rim|wheel(?!house)/i;
const CALIPER_NAME = /caliper/i;

function materialList(mesh: Mesh) {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

export function detectConfigurableMaterials(root: Object3D) {
  const paint = new Set<string>();
  const rims = new Set<string>();
  const calipers = new Set<string>();

  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const lineage = `${mesh.name} ${mesh.parent?.name ?? ""}`;
    for (const material of materialList(mesh)) {
      if (!material?.name) continue;
      const blob = `${material.name} ${lineage}`;
      if (CALIPER_NAME.test(blob)) {
        calipers.add(material.name);
        continue;
      }
      if (RIM_NAME.test(material.name) && !/tire|tyre|thread|sidewall/i.test(blob)) {
        rims.add(material.name);
        continue;
      }
      if (/^INT_/i.test(material.name)) continue;
      if (EXCLUDE.test(material.name) && !PAINT_NAME.test(material.name)) continue;
      if (EXCLUDE.test(lineage) && !/Coloured|body_primary|Body_Body/i.test(lineage)) continue;
      if (PAINT_NAME.test(material.name) || (/Coloured/.test(lineage) && !/SeatBelt|Belt/.test(lineage))) {
        paint.add(material.name);
      }
    }
  });

  return {
    paint: [...paint],
    rims: [...rims],
    calipers: [...calipers],
  };
}
