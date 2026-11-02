import { placeholderImage } from "@/catalog/seed/placeholder-image";
import type { Vehicle } from "@/catalog/types";

const mclarenSennaPage = {
  name: "McLaren Senna model information",
  url: "https://cars.mclaren.com/en/ultimate-series/mclaren-senna",
  retrievedNote: "Manufacturer Ultimate Series Senna page reviewed 28 Oct 2026.",
};

export const mclarenSenna: Vehicle = {
  id: "vehicle-mclaren-senna",
  brandId: "brand-mclaren",
  slug: "mclaren-senna",
  model: "Senna",
  modelYear: null,
  modelYearNote:
    "Limited Ultimate Series road car. McLaren completed the Senna programme; a single current model year is not listed.",
  generation: "Senna (P15)",
  bodyStyle: "coupe",
  drivetrainLayout: "internal_combustion",
  status: "production_ended",
  statusLabel: "Production ended",
  description:
    "Two-seat carbon-fibre Ultimate Series coupe with a 4.0-litre twin-turbocharged V8. McLaren published 800 PS and 800 Nm for the Senna. The 3D file is a third-party model, not an official McLaren configurator asset.",
  independenceDisclaimer:
    "FormShift AI is not a McLaren retailer or McLaren Automotive partner. An inquiry is not an order or allocation.",
  configurations: [
    {
      id: "cfg-senna",
      vehicleId: "vehicle-mclaren-senna",
      slug: "senna",
      name: "Senna (manufacturer core specification)",
      isDefault: true,
      notes: "Figures are McLaren-stated Senna technical data. Senna GTR is a separate model and is not seeded here.",
    },
  ],
  specifications: [
    {
      id: "senna-body",
      vehicleId: "vehicle-mclaren-senna",
      configurationId: "cfg-senna",
      specKey: "body_style",
      group: "body",
      label: "Body style",
      value: "Two-seat coupe",
      unit: null,
      confidence: "confirmed",
      notes: null,
      source: mclarenSennaPage,
    },
    {
      id: "senna-engine",
      vehicleId: "vehicle-mclaren-senna",
      configurationId: "cfg-senna",
      specKey: "engine",
      group: "powertrain",
      label: "Engine",
      value: "4.0-litre twin-turbocharged V8",
      unit: null,
      confidence: "confirmed",
      notes: null,
      source: mclarenSennaPage,
    },
    {
      id: "senna-power",
      vehicleId: "vehicle-mclaren-senna",
      configurationId: "cfg-senna",
      specKey: "power",
      group: "powertrain",
      label: "Power output",
      value: "800",
      unit: "PS",
      confidence: "confirmed",
      notes: null,
      source: mclarenSennaPage,
    },
    {
      id: "senna-torque",
      vehicleId: "vehicle-mclaren-senna",
      configurationId: "cfg-senna",
      specKey: "torque",
      group: "powertrain",
      label: "Torque",
      value: "800",
      unit: "Nm",
      confidence: "confirmed",
      notes: null,
      source: mclarenSennaPage,
    },
  ],
  images: [placeholderImage("vehicle-mclaren-senna", "McLaren Senna")],
  options: [
    {
      id: "senna-opt-paint",
      vehicleId: "vehicle-mclaren-senna",
      category: "exterior",
      name: "Paint",
      description: "McLaren MSO paint programmes existed for the Senna.",
      availability: "supported",
      configurableInStudio: true,
      notes: "Studio colours recolor the third-party GLB. They are not McLaren's official configurator list.",
    },
  ],
};
