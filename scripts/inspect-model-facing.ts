import fs from "node:fs";
import path from "node:path";

type Node = {
  name?: string;
  mesh?: number;
  skin?: number;
  children?: number[];
  matrix?: number[];
  translation?: number[];
  rotation?: number[];
  scale?: number[];
};

function mul(a: number[], b: number[]) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c += 1) {
    for (let r = 0; r < 4; r += 1) {
      o[c * 4 + r] =
        a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return o;
}

function fromTRS(t = [0, 0, 0], r = [0, 0, 0, 1], s = [1, 1, 1]) {
  const [x, y, z, w] = r;
  const x2 = x + x;
  const y2 = y + y;
  const z2 = z + z;
  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;
  const yy = y * y2;
  const yz = y * z2;
  const zz = z * z2;
  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;
  return [
    (1 - (yy + zz)) * s[0],
    (xy + wz) * s[0],
    (xz - wy) * s[0],
    0,
    (xy - wz) * s[1],
    (1 - (xx + zz)) * s[1],
    (yz + wx) * s[1],
    0,
    (xz + wy) * s[2],
    (yz - wx) * s[2],
    (1 - (xx + yy)) * s[2],
    0,
    t[0],
    t[1],
    t[2],
    1,
  ];
}

function transformPoint(m: number[], p: number[]) {
  const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
  const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
  const z = m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14];
  return [x, y, z];
}

function emptyBox() {
  return { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
}

function addPoint(box: { min: number[]; max: number[] }, p: number[]) {
  for (let i = 0; i < 3; i += 1) {
    box.min[i] = Math.min(box.min[i], p[i]);
    box.max[i] = Math.max(box.max[i], p[i]);
  }
}

function addAabb(box: { min: number[]; max: number[] }, m: number[], min: number[], max: number[]) {
  for (const x of [min[0], max[0]]) {
    for (const y of [min[1], max[1]]) {
      for (const z of [min[2], max[2]]) addPoint(box, transformPoint(m, [x, y, z]));
    }
  }
}

function parseGlb(file: string) {
  const b = fs.readFileSync(file);
  const len = b.readUInt32LE(12);
  return JSON.parse(b.slice(20, 20 + len).toString("utf8")) as {
    nodes?: Node[];
    meshes?: { primitives: { attributes: { POSITION?: number } }[] }[];
    accessors?: { min?: number[]; max?: number[]; type?: string }[];
    scenes?: { nodes: number[] }[];
    scene?: number;
  };
}

function analyze(file: string) {
  const gltf = parseGlb(file);
  const nodes = gltf.nodes ?? [];
  const world: number[][] = [];
  const visit = (index: number, parent: number[]) => {
    const node = nodes[index];
    const local = node.matrix ?? fromTRS(node.translation, node.rotation, node.scale);
    const m = mul(parent, local);
    world[index] = m;
    for (const child of node.children ?? []) visit(child, m);
  };
  const ident = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const scene = gltf.scenes?.[gltf.scene ?? 0];
  for (const root of scene?.nodes ?? []) visit(root, ident);

  const car = emptyBox();
  const head = emptyBox();
  const tail = emptyBox();
  let heads = 0;
  let tails = 0;
  const doors = emptyBox();
  let doorNodes = 0;
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (node.mesh == null || !world[i]) continue;
    const mesh = gltf.meshes?.[node.mesh];
    const box = emptyBox();
    for (const prim of mesh?.primitives ?? []) {
      const acc = gltf.accessors?.[prim.attributes.POSITION ?? -1];
      if (!acc?.min || !acc.max) continue;
      addAabb(box, world[i], acc.min, acc.max);
    }
    if (!Number.isFinite(box.min[0])) continue;
    addAabb(car, ident, box.min, box.max);
    const name = (node.name ?? "").toLowerCase();
    if (/headlight|head-light|front_light|foglight|head_light/.test(name)) {
      addAabb(head, ident, box.min, box.max);
      heads += 1;
    }
    if (/tail-light|taillight|rear_light|brake-light|reverse-light|tail_light/.test(name)) {
      addAabb(tail, ident, box.min, box.max);
      tails += 1;
    }
    if (/^door_\d+$/.test(name) || name === "door_01" || name === "door_03") {
      addAabb(doors, ident, box.min, box.max);
      doorNodes += 1;
    }
  }
  const size = [0, 1, 2].map((i) => car.max[i] - car.min[i]);
  const headC = heads ? [0, 1, 2].map((i) => (head.min[i] + head.max[i]) / 2) : null;
  const tailC = tails ? [0, 1, 2].map((i) => (tail.min[i] + tail.max[i]) / 2) : null;
  const longAxis = size[0] >= size[2] ? "x" : "z";
  console.log(
    path.basename(file),
    "size",
    size.map((n) => n.toFixed(2)).join("x"),
    "long",
    longAxis,
    "lights",
    heads,
    tails,
    headC && tailC ? `head-tail x ${(headC[0] - tailC[0]).toFixed(2)} z ${(headC[2] - tailC[2]).toFixed(2)}` : "no-light-delta",
    doorNodes ? `doors y ${doors.min[1].toFixed(2)}..${doors.max[1].toFixed(2)} car y ${car.min[1].toFixed(2)}..${car.max[1].toFixed(2)}` : "",
  );
}

const dir = "3d car models";
for (const name of fs.readdirSync(dir)) {
  if (!name.endsWith(".glb")) continue;
  try {
    analyze(path.join(dir, name));
  } catch (error) {
    console.log(name, "ERR", error instanceof Error ? error.message : error);
  }
}
