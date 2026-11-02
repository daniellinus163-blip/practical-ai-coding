"use client";

import type { Mesh, Object3D, Material } from "three";
import { sortPartIndex, type ColorablePart, type PartCategory } from "@/configurator/part-groups";

function materialsOf(mesh: Mesh) {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function lineage(object: Object3D) {
  const names: string[] = [];
  let current: Object3D | null = object;
  while (current) {
    if (current.name) names.push(current.name);
    current = current.parent;
  }
  return names.join(" ");
}

function partGroup(mesh: Object3D, materialName: string): string {
  const blob = `${lineage(mesh)} ${materialName}`;

  if (/tire|tyre|thread|sidewall/i.test(blob)) return "Tyres";
  if (/caliper/i.test(blob)) return "Brake calipers";
  if (/brake.?rotor|brake.?disc/i.test(blob)) return "Brake discs";
  if (/\brim|wheel(?!house)|hub/i.test(blob) && !/tire|tyre|steer/i.test(blob)) return "Wheels";
  if (/seat/i.test(blob)) return "Seats";
  if (/steer/i.test(blob)) return "Steering wheel";
  if (/carpet/i.test(blob)) return "Carpet";
  if (/door/i.test(blob) && /glass|window|windshield/i.test(blob)) return "Door glass";
  if (/door/i.test(blob) && /interior|leather|plastic|button|seat/i.test(blob)) return "Door interior";
  if (/door/i.test(blob)) return "Doors";
  if (/boot|trunk|enginetrunk/i.test(blob)) return "Boot";
  if (/bonnet|hood/i.test(blob) && !/headlight/i.test(blob)) return "Hood";
  if (/spoiler/i.test(blob)) return "Spoiler";
  if (/headlight/i.test(blob)) return "Headlights";
  if (/tail.?light|brake.?light|reverse.?light/i.test(blob)) return "Tail lights";
  if (/windshield|windscreen/i.test(blob)) return "Windscreen";
  if (/glass|window/i.test(blob)) return "Glass";
  if (/mirror/i.test(blob)) return "Mirrors";
  if (/grill/i.test(blob)) return "Grille";
  if (/engine/i.test(blob) && !/trunk/i.test(blob)) return "Engine";
  if (/interior|leather|alcantara|cabin/i.test(blob)) return "Interior";
  if (/carbon/i.test(blob)) return "Carbon fibre";
  if (/chrome|silver|steel|aluminium|aluminum/i.test(blob)) return "Chrome & metal";
  if (/paint|body|primary|coloured|colored|car_main/i.test(blob)) return "Body";
  return "Other";
}

function categorizeFromGroup(group: string): PartCategory {
  if (["Seats", "Steering wheel", "Interior", "Door interior", "Carpet"].includes(group)) return "Interior";
  if (["Tyres", "Wheels", "Brake calipers", "Brake discs"].includes(group)) return "Wheels";
  if (["Windscreen", "Door glass", "Glass"].includes(group)) return "Glass";
  if (["Headlights", "Tail lights", "Lights"].includes(group)) return "Lights";
  if (["Carbon fibre", "Chrome & metal", "Grille", "Mirrors", "Spoiler", "Engine"].includes(group)) return "Trim";
  if (["Body", "Doors", "Hood", "Boot"].includes(group)) return "Body";
  return "Other";
}

export function catalogColorableParts(root: Object3D): ColorablePart[] {
  const parts: ColorablePart[] = [];
  const used = new Map<string, number>();

  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    for (const material of materialsOf(mesh)) {
      const colored = material as Material & { color?: { getHex: () => number } };
      if (!colored?.color) continue;
      const meshName = mesh.name || "mesh";
      const materialName = material.name || "material";
      const group = partGroup(mesh, materialName);
      const base = `${meshName}::${materialName}`;
      const n = (used.get(base) ?? 0) + 1;
      used.set(base, n);
      const id = n > 1 ? `${base}#${n}` : base;
      colored.userData.formshiftPartId = id;
      parts.push({
        id,
        label: group,
        group,
        meshName,
        materialName,
        category: categorizeFromGroup(group),
      });
    }
  });

  return parts.sort((a, b) => {
    const d = sortPartIndex(a.group) - sortPartIndex(b.group);
    if (d !== 0) return d;
    return a.meshName.localeCompare(b.meshName);
  });
}

export function applyPartColors(root: Object3D, colors: Record<string, string>) {
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    for (const material of materialsOf(mesh)) {
      const id = material.userData?.formshiftPartId as string | undefined;
      if (!id) continue;
      const hex = colors[id];
      if (!hex) continue;
      const colored = material as Material & { color?: { set: (hex: string) => void } };
      if (colored.color) {
        colored.color.set(hex);
        material.needsUpdate = true;
      }
    }
  });
}

export function partIdFromObject(object: Object3D): string | null {
  const mesh = object as Mesh;
  if (!mesh.isMesh) return null;
  for (const material of materialsOf(mesh)) {
    const id = material.userData?.formshiftPartId as string | undefined;
    if (id) return id;
  }
  return null;
}

export type { ColorablePart, PartCategory };
