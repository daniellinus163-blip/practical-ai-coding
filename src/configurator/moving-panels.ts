"use client";

import { Box3, Group, Quaternion, Vector3, type Mesh, type Object3D } from "three";

export type PanelKind = "door" | "hood" | "boot" | "engine";

export interface PanelInfo {
  id: string;
  label: string;
  kind: PanelKind;
  side?: "left" | "right";
}

export interface PanelHandle extends PanelInfo {
  pivot: Group;
  axis: "x" | "y" | "z";
  openAngle: number;
  closedAngle: number;
  currentAngle: number;
}

const Y_AXIS = new Vector3(0, 1, 0);
const X_AXIS = new Vector3(1, 0, 0);

function collectHighestMatching(root: Object3D, pattern: RegExp) {
  const found: Object3D[] = [];
  root.traverse((object) => {
    if (object === root || !object.name) return;
    if (!pattern.test(object.name)) return;
    let ancestor = object.parent;
    while (ancestor && ancestor !== root) {
      if (ancestor.name && pattern.test(ancestor.name)) return;
      ancestor = ancestor.parent;
    }
    found.push(object);
  });
  return found;
}

function groupPieces(root: Object3D, pieces: Object3D[], name: string): Object3D | null {
  const unique = [...new Set(pieces)];
  if (unique.length === 0) return null;
  if (unique.length === 1) return unique[0];
  const group = new Group();
  group.name = name;
  root.add(group);
  for (const piece of unique) group.attach(piece);
  root.updateWorldMatrix(true, true);
  return group;
}

function worldBox(object: Object3D) {
  object.updateWorldMatrix(true, true);
  return new Box3().setFromObject(object);
}

function frontSign(root: Object3D): number {
  const head = new Vector3();
  const tail = new Vector3();
  let heads = 0;
  let tails = 0;
  const pos = new Vector3();
  root.traverse((object) => {
    const name = object.name.toLowerCase();
    if (!(object as Mesh).isMesh) return;
    object.getWorldPosition(pos);
    if (/headlight|head-light|front_light|foglight/.test(name)) {
      head.add(pos);
      heads += 1;
    }
    if (/tail-light|taillight|rear_light|brake-light|reverse-light/.test(name)) {
      tail.add(pos);
      tails += 1;
    }
  });
  if (heads && tails) {
    head.multiplyScalar(1 / heads);
    tail.multiplyScalar(1 / tails);
    return head.z >= tail.z ? 1 : -1;
  }
  return 1;
}

/** Aligner stays fixed (world hinge axis). Rotator starts at identity so the door is closed. */
function wrapHinge(object: Object3D, hingeWorld: Vector3, hingeAxisWorld: Vector3): Group {
  const parent = object.parent;
  if (!parent) {
    const pivot = new Group();
    pivot.add(object);
    return pivot;
  }

  const align = new Group();
  align.name = `${object.name || "panel"}_hinge`;
  parent.add(align);
  const local = hingeWorld.clone();
  parent.worldToLocal(local);
  align.position.copy(local);

  const parentWorld = new Quaternion();
  parent.getWorldQuaternion(parentWorld);
  const axisAlign = new Quaternion().setFromUnitVectors(Y_AXIS, hingeAxisWorld.clone().normalize());
  align.quaternion.copy(parentWorld.clone().invert()).multiply(axisAlign);
  align.updateMatrixWorld(true);

  const rotator = new Group();
  rotator.name = `${object.name || "panel"}_rotator`;
  align.add(rotator);
  rotator.updateMatrixWorld(true);
  rotator.attach(object);
  rotator.rotation.set(0, 0, 0);
  return rotator;
}

function doorLabel(side: "left" | "right", station: "front" | "rear" | "only") {
  if (station === "front") return side === "left" ? "Left front door" : "Right front door";
  if (station === "rear") return side === "left" ? "Left rear door" : "Right rear door";
  return side === "left" ? "Left door" : "Right door";
}

function doorId(side: "left" | "right", station: "front" | "rear" | "only") {
  if (station === "only") return side === "left" ? "door-left" : "door-right";
  return `door-${side}-${station}`;
}

function looksModeledOpen(doorBox: Box3, carBox: Box3) {
  const carH = carBox.max.y - carBox.min.y;
  const doorH = doorBox.max.y - doorBox.min.y;
  const sitsHigh = doorBox.min.y > carBox.min.y + carH * 0.32;
  const reachesRoof = carBox.max.y - doorBox.max.y < carH * 0.1;
  return sitsHigh && reachesRoof && doorH > carH * 0.28;
}

function dihedralClosedScore(doorBox: Box3, carBox: Box3, side: "left" | "right") {
  const carH = carBox.max.y - carBox.min.y;
  const carW = carBox.max.x - carBox.min.x;
  const center = doorBox.getCenter(new Vector3());
  const sill = carBox.min.y + carH * 0.34;
  const roof = carBox.max.y - carH * 0.12;
  const flank = carW * 0.36;
  const wantX = side === "left" ? -flank : flank;
  let score = Math.abs(doorBox.min.y - sill) * 10;
  score += Math.abs(doorBox.max.y - roof) * 6;
  score += Math.max(0, doorBox.max.y - carBox.max.y) * 40;
  score += Math.max(0, carBox.min.y + carH * 0.05 - doorBox.min.y) * 30;
  score += Math.abs(center.x - wantX) * 14;
  if ((side === "left" && center.x > 0) || (side === "right" && center.x < 0)) score += 80;
  return score;
}

function closedScore(doorBox: Box3, carBox: Box3) {
  const carW = carBox.max.x - carBox.min.x;
  const center = doorBox.getCenter(new Vector3());
  let score = (doorBox.max.y - carBox.min.y) * 3;
  score += Math.max(0, doorBox.max.y - carBox.max.y) * 20;
  score += Math.max(0, carBox.min.y - doorBox.min.y) * 30;
  score += Math.max(0, Math.abs(center.x) - carW * 0.55) * 8;
  score += Math.max(0, carW * 0.1 - Math.abs(center.x)) * 6;
  return score;
}

function solveAngle(
  rotator: Group,
  object: Object3D,
  carBox: Box3,
  scoreAt: (doorBox: Box3) => number = (doorBox) => closedScore(doorBox, carBox),
) {
  let best = 0;
  let bestScore = Infinity;
  for (let step = -36; step <= 36; step += 1) {
    const angle = (step / 36) * Math.PI;
    rotator.rotation.y = angle;
    rotator.updateWorldMatrix(true, true);
    const score = scoreAt(worldBox(object));
    if (score < bestScore) {
      bestScore = score;
      best = angle;
    }
  }
  rotator.rotation.y = best;
  rotator.updateWorldMatrix(true, true);
  return best;
}

function calibrateOutward(handle: PanelHandle, object: Object3D, carCenterX: number) {
  const width = () => Math.abs(worldBox(object).getCenter(new Vector3()).x - carCenterX);
  const start = width();
  const base = handle.closedAngle;
  handle.pivot.rotation.y = base + 0.15;
  handle.pivot.updateWorldMatrix(true, true);
  const positive = width();
  handle.pivot.rotation.y = base - 0.15;
  handle.pivot.updateWorldMatrix(true, true);
  const negative = width();
  handle.pivot.rotation.y = base;
  handle.pivot.updateWorldMatrix(true, true);
  const delta = Math.abs(handle.openAngle - handle.closedAngle) || 1.2;
  if (negative > positive && negative > start) handle.openAngle = base - delta;
  else handle.openAngle = base + delta;
}

function tooBig(object: Object3D, maxSpan: number) {
  return worldBox(object).getSize(new Vector3()).length() > maxSpan * 0.88;
}

function rigSwingDoor(
  object: Object3D,
  carBox: Box3,
  carCenterX: number,
  front: number,
  id: string,
  label: string,
): PanelHandle {
  const box = worldBox(object);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const side: "left" | "right" = center.x < carCenterX ? "left" : "right";
  const towardCenter = side === "left" ? 1 : -1;
  const modeledOpen = looksModeledOpen(box, carBox);
  const hinge = new Vector3();
  hinge.x = (side === "left" ? box.max.x : box.min.x) + towardCenter * Math.min(size.x * 0.02, 0.03);
  if (modeledOpen) {
    hinge.y = box.min.y + size.y * 0.05;
    hinge.z = center.z;
  } else {
    hinge.y = box.min.y + size.y * 0.5;
    hinge.z = (front > 0 ? box.max.z : box.min.z) - front * size.z * 0.06;
  }

  const axis = modeledOpen ? new Vector3(0, 0, front >= 0 ? 1 : -1) : Y_AXIS;
  const rotator = wrapHinge(object, hinge, axis);
  const closedAngle = modeledOpen
    ? solveAngle(rotator, object, carBox, (doorBox) => dihedralClosedScore(doorBox, carBox, side))
    : 0;
  rotator.rotation.y = closedAngle;
  rotator.updateWorldMatrix(true, true);

  const handle: PanelHandle = {
    id,
    label,
    kind: "door",
    side,
    pivot: rotator,
    axis: "y",
    closedAngle,
    openAngle: modeledOpen ? 0 : closedAngle + 1.2,
    currentAngle: closedAngle,
  };
  if (!modeledOpen) {
    calibrateOutward(handle, object, carCenterX);
    handle.currentAngle = handle.closedAngle;
    handle.pivot.rotation.y = handle.closedAngle;
  }
  return handle;
}

function rigFlap(object: Object3D, front: number, id: string, label: string, kind: PanelKind, atRear: boolean): PanelHandle {
  const box = worldBox(object);
  const size = box.getSize(new Vector3());
  const hinge = new Vector3();
  hinge.x = (box.min.x + box.max.x) / 2;
  if (atRear) {
    hinge.y = box.min.y + size.y * 0.1;
    hinge.z = (front > 0 ? box.min.z : box.max.z) + front * size.z * 0.05;
  } else {
    hinge.y = box.max.y - size.y * 0.06;
    hinge.z = (front > 0 ? box.max.z : box.min.z) - front * size.z * 0.06;
  }
  const rotator = wrapHinge(object, hinge, X_AXIS);
  const handle: PanelHandle = {
    id,
    label,
    kind,
    pivot: rotator,
    axis: "y",
    openAngle: atRear ? 0.85 : 0.95,
    closedAngle: 0,
    currentAngle: 0,
  };
  const height = () => worldBox(object).max.y;
  const start = height();
  handle.pivot.rotation.y = 0.12;
  handle.pivot.updateWorldMatrix(true, true);
  const up = height();
  handle.pivot.rotation.y = 0;
  handle.pivot.updateWorldMatrix(true, true);
  if (up < start) handle.openAngle *= -1;
  handle.currentAngle = 0;
  handle.pivot.rotation.set(0, 0, 0);
  return handle;
}

function namedDoors(root: Object3D) {
  const skip = /indoor|doorstop|door.?lock|door.?seal|door.?handle|door.?sill|doorstep|windshield/i;
  const all = collectHighestMatching(root, /door/i).filter((object) => !skip.test(object.name));
  const dummies = all.filter((object) => /dummy/i.test(object.name));
  if (dummies.length >= 2) return dummies;
  const hasLeftRight = all.some((object) => /door[_-]?l\b|door[_-]?r\b|door_lf|door_rf|door-left|door-right/i.test(object.name));
  return hasLeftRight ? all.filter((object) => !/door_hr/i.test(object.name)) : all;
}

function splitForeAft(
  items: { node: Object3D; center: Vector3; size: Vector3 }[],
  front: number,
): { node: Object3D; center: Vector3; size: Vector3 }[][] {
  if (items.length === 0) return [];
  if (items.length === 1) return [items];
  const zs = items.map((item) => item.center.z);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const doorDepth = Math.max(...items.map((item) => item.size.z), 0.01);
  if (maxZ - minZ < doorDepth * 1.25) return [items];
  const mid = (minZ + maxZ) / 2;
  const namedFront = items.filter((item) => /_lf|_rf|front/i.test(item.node.name));
  const namedRear = items.filter((item) => /_lr|_rr|rear/i.test(item.node.name));
  if (namedFront.length && namedRear.length) return [namedFront, namedRear];
  const fore = items.filter((item) => (item.center.z - mid) * front >= 0);
  const aft = items.filter((item) => (item.center.z - mid) * front < 0);
  return [fore, aft].filter((group) => group.length > 0);
}

function clusterDoors(nodes: Object3D[], carCenterX: number, front: number) {
  const items = nodes.map((node) => {
    const box = worldBox(node);
    return { node, center: box.getCenter(new Vector3()), size: box.getSize(new Vector3()) };
  });
  const left = items.filter((item) => item.center.x < carCenterX);
  const right = items.filter((item) => item.center.x >= carCenterX);
  return {
    left: splitForeAft(left, front),
    right: splitForeAft(right, front),
  };
}

export function rigMovingPanels(root: Object3D, _vehicleSlug = ""): PanelHandle[] {
  if (root.userData.formshiftPanelsRigged) {
    return (root.userData.formshiftPanelHandles as PanelHandle[]) ?? [];
  }

  const handles: PanelHandle[] = [];
  const carBox = worldBox(root);
  const carCenterX = (carBox.min.x + carBox.max.x) / 2;
  const front = frontSign(root);
  const maxSpan = Math.max(carBox.max.x - carBox.min.x, carBox.max.z - carBox.min.z);

  const doorNodes = namedDoors(root);
  const clusters = clusterDoors(doorNodes, carCenterX, front);
  for (const [side, groups] of [
    ["left", clusters.left],
    ["right", clusters.right],
  ] as const) {
    groups.forEach((group, index) => {
      const station: "front" | "rear" | "only" =
        groups.length === 1 ? "only" : index === 0 ? "front" : "rear";
      const object = groupPieces(
        root,
        group.map((item) => item.node),
        `FormShiftDoor_${side}_${station}`,
      );
      if (!object || tooBig(object, maxSpan)) return;
      handles.push(
        rigSwingDoor(object, carBox, carCenterX, front, doorId(side, station), doorLabel(side, station)),
      );
    });
  }

  const hoodNode =
    collectHighestMatching(root, /bonnet|hood/i).filter((object) => !/headlight|hoodbadge/i.test(object.name))[0] ??
    collectHighestMatching(root, /bonnet_dummy/i)[0] ??
    null;
  if (hoodNode && !tooBig(hoodNode, maxSpan)) {
    handles.push(rigFlap(hoodNode, front, "hood", "Hood", "hood", true));
  }

  const bootNode =
    collectHighestMatching(root, /boot_dummy|^boot$|trunklid|boot(?!_)/i).filter(
      (object) => !/steering|rack|seat|belt/i.test(object.name),
    )[0] ??
    collectHighestMatching(root, /boot|trunk/i).filter(
      (object) => !/steering|rack|seat|belt/i.test(object.name),
    )[0] ??
    null;
  if (bootNode && !tooBig(bootNode, maxSpan)) {
    handles.push(rigFlap(bootNode, front, "boot", "Boot", "boot", false));
  }

  const engineNode =
    collectHighestMatching(
      root,
      /engine.?trunk|engine.?cover|engine.?lid|enginecover|enginelid|engine_hood/i,
    )[0] ?? null;
  if (engineNode && !tooBig(engineNode, maxSpan)) {
    handles.push(rigFlap(engineNode, front, "engine", "Engine cover", "engine", false));
  }

  root.userData.formshiftPanelsRigged = true;
  root.userData.formshiftPanelHandles = handles;
  return handles;
}
