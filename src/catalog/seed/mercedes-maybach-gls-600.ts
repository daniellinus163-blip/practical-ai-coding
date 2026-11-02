import { placeholderImage } from "@/catalog/seed/placeholder-image";
import type { Vehicle } from "@/catalog/types";

const glsPage = {
  name: "Mercedes-Maybach GLS",
  url: "https://www.mercedes-benz.com/en/vehicles/passenger-cars/maybach/gls/",
  retrievedNote: "Manufacturer Mercedes-Maybach GLS page reviewed 28 Oct 2026.",
};

export const mercedesMaybachGls600: Vehicle = {
  id: "vehicle-mercedes-maybach-gls-600",
  brandId: "brand-mercedes-benz",
  slug: "mercedes-maybach-gls-600",
  model: "Maybach GLS 600",
  modelYear: null,
  modelYearNote: "Current Mercedes-Maybach GLS range. A single catalog model year is not assigned.",
  generation: "X167 Mercedes-Maybach GLS",
  bodyStyle: "suv",
  drivetrainLayout: "internal_combustion",
  status: "production",
  statusLabel: "Production",
  description:
    "Full-size luxury SUV in the Mercedes-Maybach GLS 600 range. The 3D file was unzipped from mersedes-benz-maybach-gls-600.zip and is not an official Mercedes-Benz configurator.",
  independenceDisclaimer:
    "FormShift AI is not a Mercedes-Benz dealer. An inquiry is not an order.",
  configurations: [
    {
      id: "cfg-gls-600",
      vehicleId: "vehicle-mercedes-maybach-gls-600",
      slug: "gls-600",
      name: "Maybach GLS 600",
      isDefault: true,
      notes: "Market-specific output figures are not invented for this seed.",
    },
  ],
  specifications: [
    {
      id: "gls-body",
      vehicleId: "vehicle-mercedes-maybach-gls-600",
      configurationId: "cfg-gls-600",
      specKey: "body_style",
      group: "body",
      label: "Body style",
      value: "Luxury SUV",
      unit: null,
      confidence: "confirmed",
      notes: null,
      source: glsPage,
    },
    {
      id: "gls-name",
      vehicleId: "vehicle-mercedes-maybach-gls-600",
      configurationId: "cfg-gls-600",
      specKey: "model_name",
      group: "identity",
      label: "Model",
      value: "Mercedes-Maybach GLS 600",
      unit: null,
      confidence: "confirmed",
      notes: null,
      source: glsPage,
    },
  ],
  images: [placeholderImage("vehicle-mercedes-maybach-gls-600", "Mercedes-Maybach GLS 600")],
  options: [
    {
      id: "gls-opt-paint",
      vehicleId: "vehicle-mercedes-maybach-gls-600",
      category: "exterior",
      name: "Paint",
      description: "Studio recolors gls_paint / vehicle_paint materials on the unzipped glTF.",
      availability: "illustrative",
      configurableInStudio: true,
      notes: "Not Mercedes-Benz paint codes.",
    },
  ],
};
