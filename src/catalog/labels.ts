import type { BodyStyle, FactConfidence, VehicleStatus } from "@/catalog/types";

export const statusCopy: Record<VehicleStatus, string> = {
  production: "Production",
  upcoming: "Upcoming / planned",
  announced: "Announced",
  concept: "Concept",
  production_ended: "Production ended",
};

export const bodyCopy: Record<BodyStyle, string> = {
  sedan: "Sedan",
  coupe: "Coupe",
  roadster: "Roadster",
  targa: "Targa",
  suv: "SUV",
};

export const confidenceCopy: Record<FactConfidence, string> = {
  confirmed: "Confirmed manufacturer fact",
  announced: "Announced / not production-confirmed",
  estimate: "Estimate",
  unavailable: "Not available",
};
