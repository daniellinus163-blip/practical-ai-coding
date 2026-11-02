import { placeholderImage } from "@/catalog/seed/placeholder-image";
import type { Vehicle } from "@/catalog/types";

const ferrariSp38Page = {
  name: "Ferrari SP38 model page",
  url: "https://www.ferrari.com/en-EN/auto/sp38",
  retrievedNote: "Manufacturer Special Projects SP38 page reviewed 28 Oct 2026.",
};

export const ferrariSp38: Vehicle = {
  id: "vehicle-ferrari-sp38",
  brandId: "brand-ferrari",
  slug: "ferrari-sp38",
  model: "SP38 Deborah",
  modelYear: 2018,
  modelYearNote:
    "Ferrari presented the SP38 in 2018 as a one-off Special Projects car. It is not a series-production model.",
  generation: "Special Projects one-off (488-based)",
  bodyStyle: "coupe",
  drivetrainLayout: "internal_combustion",
  status: "production_ended",
  statusLabel: "One-off / production ended",
  description:
    "Ferrari describes the SP38 as a unique two-seater Special Projects car inspired by the 288 GTO and 308 GTS, developed from the 488 family. FormShift loads the third-party 2018 SP38 Deborah model you saved; it is not an official Ferrari configurator.",
  independenceDisclaimer:
    "FormShift AI is not a Ferrari dealer or partner. An inquiry is not a commission, order, or confirmation that an SP38 exists for sale.",
  configurations: [
    {
      id: "cfg-sp38",
      vehicleId: "vehicle-ferrari-sp38",
      slug: "sp38",
      name: "SP38 (one-off)",
      isDefault: true,
      notes: "Ferrari's SP38 page does not republish a full technical table. Powertrain figures unique to this one-off are therefore not invented here.",
    },
  ],
  specifications: [
    {
      id: "sp38-body",
      vehicleId: "vehicle-ferrari-sp38",
      configurationId: "cfg-sp38",
      specKey: "body_style",
      group: "body",
      label: "Body style",
      value: "Two-seat special-series coupe",
      unit: null,
      confidence: "confirmed",
      notes: null,
      source: ferrariSp38Page,
    },
    {
      id: "sp38-programme",
      vehicleId: "vehicle-ferrari-sp38",
      configurationId: "cfg-sp38",
      specKey: "programme",
      group: "identity",
      label: "Programme",
      value: "Ferrari Special Projects one-off",
      unit: null,
      confidence: "confirmed",
      notes: "Not a regular-production catalogue model.",
      source: ferrariSp38Page,
    },
    {
      id: "sp38-year",
      vehicleId: "vehicle-ferrari-sp38",
      configurationId: "cfg-sp38",
      specKey: "year_presented",
      group: "identity",
      label: "Year presented",
      value: "2018",
      unit: null,
      confidence: "confirmed",
      notes: null,
      source: ferrariSp38Page,
    },
    {
      id: "sp38-power",
      vehicleId: "vehicle-ferrari-sp38",
      configurationId: "cfg-sp38",
      specKey: "power",
      group: "powertrain",
      label: "Power output",
      value: null,
      unit: null,
      confidence: "unavailable",
      notes: "Ferrari's SP38 page does not publish a unique power figure. The 488 GTB donor figure is not copied here as if it were SP38-specific.",
      source: ferrariSp38Page,
    },
  ],
  images: [placeholderImage("vehicle-ferrari-sp38", "Ferrari SP38")],
  options: [
    {
      id: "sp38-opt-paint",
      vehicleId: "vehicle-ferrari-sp38",
      category: "exterior",
      name: "Paint",
      description: "The real SP38 was a unique commission. Studio paint is illustrative only.",
      availability: "illustrative",
      configurableInStudio: true,
      notes: "Recolors the third-party glTF. Not Ferrari Tailor Made.",
    },
  ],
};
