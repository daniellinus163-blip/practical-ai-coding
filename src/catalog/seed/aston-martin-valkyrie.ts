import { placeholderImage } from "@/catalog/seed/placeholder-image";
import type { Vehicle } from "@/catalog/types";

const valkyriePage = {
  name: "Aston Martin Valkyrie",
  url: "https://www.astonmartin.com/en/models/valkyrie",
  retrievedNote: "Manufacturer Valkyrie page reviewed 28 Oct 2026.",
};

export const astonMartinValkyrie: Vehicle = {
  id: "vehicle-aston-martin-valkyrie",
  brandId: "brand-aston-martin",
  slug: "aston-martin-valkyrie",
  model: "Valkyrie",
  modelYear: null,
  modelYearNote: "Limited hypercar programme. A single catalog model year is not assigned.",
  generation: "Valkyrie",
  bodyStyle: "coupe",
  drivetrainLayout: "plug_in_hybrid",
  status: "production",
  statusLabel: "Limited production",
  description:
    "Two-seat hypercar with a Cosworth naturally aspirated V12 and hybrid assistance, developed with Red Bull Advanced Technologies. The 3D file is a third-party model, not an official Aston Martin configurator.",
  independenceDisclaimer:
    "FormShift AI is not an Aston Martin dealer or partner. An inquiry is not an order or allocation.",
  configurations: [
    {
      id: "cfg-valkyrie",
      vehicleId: "vehicle-aston-martin-valkyrie",
      slug: "valkyrie",
      name: "Valkyrie",
      isDefault: true,
      notes: "Spider and AMR Pro derivatives are not separately seeded.",
    },
  ],
  specifications: [
    {
      id: "valk-body",
      vehicleId: "vehicle-aston-martin-valkyrie",
      configurationId: "cfg-valkyrie",
      specKey: "body_style",
      group: "body",
      label: "Body style",
      value: "Two-seat coupe",
      unit: null,
      confidence: "confirmed",
      notes: null,
      source: valkyriePage,
    },
    {
      id: "valk-powertrain",
      vehicleId: "vehicle-aston-martin-valkyrie",
      configurationId: "cfg-valkyrie",
      specKey: "powertrain",
      group: "powertrain",
      label: "Powertrain",
      value: "Naturally aspirated V12 with hybrid assistance",
      unit: null,
      confidence: "confirmed",
      notes: null,
      source: valkyriePage,
    },
  ],
  images: [placeholderImage("vehicle-aston-martin-valkyrie", "Aston Martin Valkyrie")],
  options: [
    {
      id: "valk-opt-paint",
      vehicleId: "vehicle-aston-martin-valkyrie",
      category: "exterior",
      name: "Paint",
      description: "Studio recolors the Shell_t body material on the third-party GLB.",
      availability: "illustrative",
      configurableInStudio: true,
      notes: "Not Aston Martin's official Q colour programme.",
    },
  ],
};
