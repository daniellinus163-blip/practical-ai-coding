import { placeholderImage } from "@/catalog/seed/placeholder-image";
import type { Vehicle } from "@/catalog/types";

const maybachS = {
  name: "Mercedes-Maybach S-Class",
  url: "https://www.mercedes-benz.com/en/vehicles/passenger-cars/maybach/s-class/",
  retrievedNote: "Manufacturer Mercedes-Maybach S-Class page reviewed 28 Oct 2026.",
};

export const mercedesMaybachSClass: Vehicle = {
  id: "vehicle-mercedes-maybach-s-class",
  brandId: "brand-mercedes-benz",
  slug: "mercedes-maybach-s-class",
  model: "Maybach S-Class",
  modelYear: 2021,
  modelYearNote:
    "The saved GLB is labelled 2021. Mercedes-Maybach S-Class (Z223) remains in production with later updates; this entry is the 2021-era file, not every later facelift.",
  generation: "Z223 Mercedes-Maybach S-Class",
  bodyStyle: "sedan",
  drivetrainLayout: "internal_combustion",
  status: "production",
  statusLabel: "Production",
  description:
    "Long-wheelbase luxury sedan in the Mercedes-Maybach S-Class range. The 3D file is a third-party 2021 model, not an official Mercedes-Benz configurator.",
  independenceDisclaimer:
    "FormShift AI is not a Mercedes-Benz dealer. An inquiry is not an order.",
  configurations: [
    {
      id: "cfg-maybach-s",
      vehicleId: "vehicle-mercedes-maybach-s-class",
      slug: "s-class",
      name: "Maybach S-Class (2021 file)",
      isDefault: true,
      notes: "Trim-specific S 580 / S 680 figures are not invented for this seed.",
    },
  ],
  specifications: [
    {
      id: "ms-body",
      vehicleId: "vehicle-mercedes-maybach-s-class",
      configurationId: "cfg-maybach-s",
      specKey: "body_style",
      group: "body",
      label: "Body style",
      value: "Four-door luxury sedan",
      unit: null,
      confidence: "confirmed",
      notes: null,
      source: maybachS,
    },
    {
      id: "ms-year",
      vehicleId: "vehicle-mercedes-maybach-s-class",
      configurationId: "cfg-maybach-s",
      specKey: "model_year_file",
      group: "identity",
      label: "3D file label",
      value: "2021",
      unit: null,
      confidence: "confirmed",
      notes: "Taken from the filename 2021_mercedes-benz_s-class_maybach.glb.",
      source: maybachS,
    },
  ],
  images: [placeholderImage("vehicle-mercedes-maybach-s-class", "Mercedes-Maybach S-Class")],
  options: [
    {
      id: "ms-opt-paint",
      vehicleId: "vehicle-mercedes-maybach-s-class",
      category: "exterior",
      name: "Paint",
      description: "Studio attempts to recolor detected body materials on this file.",
      availability: "illustrative",
      configurableInStudio: true,
      notes: "Material names on this GLB are generic. Not Mercedes-Benz paint codes.",
    },
  ],
};
