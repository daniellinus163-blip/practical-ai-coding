import { placeholderImage } from "@/catalog/seed/placeholder-image";
import type { Vehicle } from "@/catalog/types";

const amgOnePage = {
  name: "Mercedes-AMG ONE",
  url: "https://www.mercedes-amg.com/en/vehicles/one.html",
  retrievedNote: "Manufacturer AMG ONE page reviewed 28 Oct 2026.",
};

export const mercedesAmgOne: Vehicle = {
  id: "vehicle-mercedes-amg-one",
  brandId: "brand-mercedes-benz",
  slug: "mercedes-amg-one",
  model: "AMG ONE",
  modelYear: null,
  modelYearNote: "Limited two-seat hypercar. A single catalog model year is not assigned.",
  generation: "AMG ONE (Project ONE)",
  bodyStyle: "coupe",
  drivetrainLayout: "plug_in_hybrid",
  status: "production",
  statusLabel: "Limited production",
  description:
    "Two-seat plug-in hybrid hypercar using a Formula 1-derived turbocharged 1.6-litre V6 with electric motors. The 3D file is a third-party Project ONE model, not an official Mercedes-AMG configurator.",
  independenceDisclaimer:
    "FormShift AI is not a Mercedes-Benz or Mercedes-AMG dealer. An inquiry is not an order or allocation.",
  configurations: [
    {
      id: "cfg-amg-one",
      vehicleId: "vehicle-mercedes-amg-one",
      slug: "one",
      name: "AMG ONE",
      isDefault: true,
      notes: "Manufacturer-stated AMG ONE identity.",
    },
  ],
  specifications: [
    {
      id: "one-body",
      vehicleId: "vehicle-mercedes-amg-one",
      configurationId: "cfg-amg-one",
      specKey: "body_style",
      group: "body",
      label: "Body style",
      value: "Two-seat coupe",
      unit: null,
      confidence: "confirmed",
      notes: null,
      source: amgOnePage,
    },
    {
      id: "one-powertrain",
      vehicleId: "vehicle-mercedes-amg-one",
      configurationId: "cfg-amg-one",
      specKey: "powertrain",
      group: "powertrain",
      label: "Powertrain",
      value: "Plug-in hybrid; Formula 1-derived turbocharged V6 with electric motors",
      unit: null,
      confidence: "confirmed",
      notes: null,
      source: amgOnePage,
    },
  ],
  images: [placeholderImage("vehicle-mercedes-amg-one", "Mercedes-AMG ONE")],
  options: [
    {
      id: "one-opt-paint",
      vehicleId: "vehicle-mercedes-amg-one",
      category: "exterior",
      name: "Paint",
      description: "Studio recolors the body_color material on the third-party GLB.",
      availability: "illustrative",
      configurableInStudio: true,
      notes: "Not Mercedes-AMG's official paint list.",
    },
  ],
};
