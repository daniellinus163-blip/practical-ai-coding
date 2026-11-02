import { placeholderImage } from "@/catalog/seed/placeholder-image";
import type { Vehicle } from "@/catalog/types";

const paganiHuayraPage = {
  name: "Pagani Huayra",
  url: "https://www.pagani.com/huayra/",
  retrievedNote: "Manufacturer Huayra family page reviewed 28 Oct 2026.",
};

export const paganiHuayra: Vehicle = {
  id: "vehicle-pagani-huayra",
  brandId: "brand-pagani",
  slug: "pagani-huayra",
  model: "Huayra",
  modelYear: null,
  modelYearNote:
    "Huayra-family production has been succeeded by later Pagani programmes. A single current model year is not listed.",
  generation: "Huayra",
  bodyStyle: "coupe",
  drivetrainLayout: "internal_combustion",
  status: "production_ended",
  statusLabel: "Production ended",
  description:
    "Two-seat carbon-fibre hypercar with a Mercedes-AMG twin-turbocharged V12. The 3D file is a third-party model, not an official Pagani configurator.",
  independenceDisclaimer:
    "FormShift AI is not a Pagani dealer or partner. An inquiry is not an order or allocation.",
  configurations: [
    {
      id: "cfg-huayra",
      vehicleId: "vehicle-pagani-huayra",
      slug: "huayra",
      name: "Huayra (core family)",
      isDefault: true,
      notes: "Roadster, BC, Codalunga and other derivatives are not separately seeded.",
    },
  ],
  specifications: [
    {
      id: "huayra-body",
      vehicleId: "vehicle-pagani-huayra",
      configurationId: "cfg-huayra",
      specKey: "body_style",
      group: "body",
      label: "Body style",
      value: "Two-seat coupe",
      unit: null,
      confidence: "confirmed",
      notes: null,
      source: paganiHuayraPage,
    },
    {
      id: "huayra-engine",
      vehicleId: "vehicle-pagani-huayra",
      configurationId: "cfg-huayra",
      specKey: "engine",
      group: "powertrain",
      label: "Engine",
      value: "Mercedes-AMG twin-turbocharged V12",
      unit: null,
      confidence: "confirmed",
      notes: null,
      source: paganiHuayraPage,
    },
  ],
  images: [placeholderImage("vehicle-pagani-huayra", "Pagani Huayra")],
  options: [
    {
      id: "huayra-opt-paint",
      vehicleId: "vehicle-pagani-huayra",
      category: "exterior",
      name: "Paint",
      description: "Studio recolors PAG_HUAYRA_PAINT on the third-party GLB.",
      availability: "illustrative",
      configurableInStudio: true,
      notes: "Not Pagani's official colour programme.",
    },
  ],
};
