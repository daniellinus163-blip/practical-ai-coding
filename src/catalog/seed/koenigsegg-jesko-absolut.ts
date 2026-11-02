import { placeholderImage } from "@/catalog/seed/placeholder-image";
import type { Vehicle } from "@/catalog/types";

const jeskoPage = {
  name: "Koenigsegg Jesko Absolut",
  url: "https://www.koenigsegg.com/model/jesko-absolut",
  retrievedNote: "Manufacturer Jesko Absolut page reviewed 28 Oct 2026.",
};

export const koenigseggJeskoAbsolut: Vehicle = {
  id: "vehicle-koenigsegg-jesko-absolut",
  brandId: "brand-koenigsegg",
  slug: "koenigsegg-jesko-absolut",
  model: "Jesko Absolut",
  modelYear: null,
  modelYearNote: "Limited Jesko programme. A single catalog model year is not assigned.",
  generation: "Jesko Absolut",
  bodyStyle: "coupe",
  drivetrainLayout: "internal_combustion",
  status: "production",
  statusLabel: "Limited production",
  description:
    "Low-drag Jesko variant with a twin-turbocharged V8. Koenigsegg publishes the Absolut as the speed-focused Jesko. The 3D file is a third-party model, not an official Koenigsegg configurator.",
  independenceDisclaimer:
    "FormShift AI is not affiliated with Koenigsegg Automotive AB. An inquiry is not an order or allocation.",
  configurations: [
    {
      id: "cfg-jesko-absolut",
      vehicleId: "vehicle-koenigsegg-jesko-absolut",
      slug: "absolut",
      name: "Jesko Absolut",
      isDefault: true,
      notes: "Manufacturer-stated Jesko Absolut identity. Derivative-specific figures not duplicated from other Jesko variants.",
    },
  ],
  specifications: [
    {
      id: "jesko-body",
      vehicleId: "vehicle-koenigsegg-jesko-absolut",
      configurationId: "cfg-jesko-absolut",
      specKey: "body_style",
      group: "body",
      label: "Body style",
      value: "Two-door coupe",
      unit: null,
      confidence: "confirmed",
      notes: null,
      source: jeskoPage,
    },
    {
      id: "jesko-engine",
      vehicleId: "vehicle-koenigsegg-jesko-absolut",
      configurationId: "cfg-jesko-absolut",
      specKey: "engine",
      group: "powertrain",
      label: "Engine",
      value: "Twin-turbocharged V8",
      unit: null,
      confidence: "confirmed",
      notes: null,
      source: jeskoPage,
    },
  ],
  images: [placeholderImage("vehicle-koenigsegg-jesko-absolut", "Koenigsegg Jesko Absolut")],
  options: [
    {
      id: "jesko-opt-paint",
      vehicleId: "vehicle-koenigsegg-jesko-absolut",
      category: "exterior",
      name: "Paint",
      description: "Studio recolors the third-party GLB coloured body materials.",
      availability: "illustrative",
      configurableInStudio: true,
      notes: "Not Koenigsegg's official colour programme.",
    },
  ],
};
