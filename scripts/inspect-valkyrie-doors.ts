import fs from "node:fs";
import { Box3, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { rigMovingPanels } from "../src/configurator/moving-panels";
import { alignNoseToPositiveZ } from "../src/configurator/vehicle-facing";

const g = globalThis as unknown as {
  self: typeof globalThis;
  document: Document;
};

g.self = globalThis;

g.document = {
  createElementNS: (_namespace: string, tagName: string) => {
    if (tagName === "canvas") {
      return {
        width: 0,
        height: 0,
        getContext: () => null,
      } as unknown as SVGElement;
    }

    return {} as SVGElement;
  },
} as unknown as Document;
if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = () => "blob:node";
}

const buffer = fs.readFileSync("3d car models/aston_martin_valkyrie.glb");
const loader = new GLTFLoader();

loader.parse(
  buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  "",
  (gltf) => {
    const clone = gltf.scene;
    alignNoseToPositiveZ(clone);
    const box = new Box3().setFromObject(clone);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const longest = Math.max(size.x, size.y, size.z) || 1;
    const scale = 4.4 / longest;
    clone.scale.setScalar(scale);
    clone.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    clone.updateMatrixWorld(true);
    const car = new Box3().setFromObject(clone);
    console.log("car", car.min.toArray().map((n) => n.toFixed(2)), car.max.toArray().map((n) => n.toFixed(2)));
    const doors: string[] = [];
    clone.traverse((object) => {
      if (/^Door_\d+$/i.test(object.name)) {
        const doorBox = new Box3().setFromObject(object);
        const doorSize = doorBox.getSize(new Vector3());
        doors.push(
          `${object.name} min ${doorBox.min.toArray().map((n) => n.toFixed(2)).join(",")} max ${doorBox.max.toArray().map((n) => n.toFixed(2)).join(",")} size ${doorSize.toArray().map((n) => n.toFixed(2)).join(",")}`,
        );
      }
    });
    console.log(doors.join("\n"));
    const markers: string[] = [];
    clone.traverse((object) => {
      if (!/light|lamp|wheel|tyre|tire|head|tail|nose|bumper/i.test(object.name)) return;
      if (object.children.length > 0 && !/wheel|tyre|tire/i.test(object.name)) return;
      const marker = new Box3().setFromObject(object);
      if (marker.isEmpty()) return;
      const c = marker.getCenter(new Vector3());
      markers.push(`${object.name} ${c.x.toFixed(2)},${c.y.toFixed(2)},${c.z.toFixed(2)}`);
    });
    console.log(markers.slice(0, 40).join("\n"));
    const handles = rigMovingPanels(clone, "aston-martin-valkyrie");
    for (const handle of handles) {
      const panel = new Box3().setFromObject(handle.pivot);
      console.log(
        handle.id,
        handle.label,
        "closed",
        handle.closedAngle.toFixed(3),
        "open",
        handle.openAngle.toFixed(3),
        "boxY",
        panel.min.y.toFixed(2),
        panel.max.y.toFixed(2),
      );
    }
  },
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
