export type PartCategory = "Body" | "Wheels" | "Interior" | "Glass" | "Lights" | "Trim" | "Other";

export interface ColorablePart {
  id: string;
  label: string;
  group: string;
  meshName: string;
  materialName: string;
  category: PartCategory;
}

export interface PartGroup {
  name: string;
  category: PartCategory;
  parts: ColorablePart[];
}

const GROUP_ORDER = [
  "Body",
  "Doors",
  "Hood",
  "Boot",
  "Spoiler",
  "Tyres",
  "Wheels",
  "Brake calipers",
  "Brake discs",
  "Seats",
  "Steering wheel",
  "Interior",
  "Door interior",
  "Carpet",
  "Mirrors",
  "Windscreen",
  "Door glass",
  "Glass",
  "Headlights",
  "Tail lights",
  "Lights",
  "Carbon fibre",
  "Chrome & metal",
  "Grille",
  "Engine",
  "Other",
];

export function groupPartsForUi(parts: ColorablePart[]): PartGroup[] {
  const map = new Map<string, ColorablePart[]>();
  for (const part of parts) {
    const list = map.get(part.group) ?? [];
    list.push(part);
    map.set(part.group, list);
  }
  return [...map.entries()]
    .map(([name, groupParts]) => ({
      name,
      category: groupParts[0]?.category ?? "Other",
      parts: groupParts,
    }))
    .sort((a, b) => GROUP_ORDER.indexOf(a.name) - GROUP_ORDER.indexOf(b.name));
}

export function sortPartIndex(group: string) {
  return GROUP_ORDER.indexOf(group);
}
