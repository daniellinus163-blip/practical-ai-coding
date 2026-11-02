import { placeholderImage } from "@/catalog/seed/placeholder-image";
import type { Vehicle } from "@/catalog/types";

const porscheGt3 = {
  name: "Porsche 911 GT3 model page",
  url: "https://www.porsche.com/international/models/911/911-gt3/911-gt3/",
  retrievedNote: "Manufacturer 911 GT3 page reviewed 28 Oct 2026. Figures are for the current 992-generation GT3 as Porsche publishes them and can vary by market.",
};

export const porsche911Gt3: Vehicle = {
  id: "vehicle-porsche-911-gt3",
  brandId: "brand-porsche",
  slug: "porsche-911-gt3",
  model: "911 GT3",
  modelYear: null,
  modelYearNote:
    "Current 992-generation 911 GT3 as listed on porsche.com. A single catalog model year is not assigned because Porsche updates the range by market.",
  generation: "992 GT3",
  bodyStyle: "coupe",
  drivetrainLayout: "internal_combustion",
  status: "production",
  statusLabel: "Production",
  description:
    "Two-door high-performance 911 with a naturally aspirated 4.0-litre flat-six. Porsche publishes 375 kW (510 PS) for the current GT3. The 3D file is a third-party model, not an official Porsche configurator asset.",
  independenceDisclaimer:
    "FormShift AI is not a Porsche Centre or Porsche AG partner. An inquiry is not an order or allocation.",
  configurations: [
    {
      id: "cfg-911-gt3",
      vehicleId: "vehicle-porsche-911-gt3",
      slug: "gt3",
      name: "911 GT3 (manufacturer core specification)",
      isDefault: true,
      notes: "Figures are Porsche-stated GT3 technical data. GT3 Touring and RS are separate models and are not seeded here.",
    },
  ],
  specifications: [
    {
      id: "gt3-body",
      vehicleId: "vehicle-porsche-911-gt3",
      configurationId: "cfg-911-gt3",
      specKey: "body_style",
      group: "body",
      label: "Body style",
      value: "Two-door sports coupe",
      unit: null,
      confidence: "confirmed",
      notes: null,
      source: porscheGt3,
    },
    {
      id: "gt3-engine",
      vehicleId: "vehicle-porsche-911-gt3",
      configurationId: "cfg-911-gt3",
      specKey: "engine",
      group: "powertrain",
      label: "Engine",
      value: "4.0-litre naturally aspirated flat-six",
      unit: null,
      confidence: "confirmed",
      notes: null,
      source: porscheGt3,
    },
    {
      id: "gt3-power",
      vehicleId: "vehicle-porsche-911-gt3",
      configurationId: "cfg-911-gt3",
      specKey: "power",
      group: "powertrain",
      label: "Power output",
      value: "375",
      unit: "kW",
      confidence: "confirmed",
      notes: "Porsche also states 510 PS for this output.",
      source: porscheGt3,
    },
    {
      id: "gt3-drive",
      vehicleId: "vehicle-porsche-911-gt3",
      configurationId: "cfg-911-gt3",
      specKey: "drivetrain",
      group: "powertrain",
      label: "Drivetrain",
      value: "Rear-wheel drive",
      unit: null,
      confidence: "confirmed",
      notes: null,
      source: porscheGt3,
    },
  ],
  images: [placeholderImage("vehicle-porsche-911-gt3", "Porsche 911 GT3")],
  options: [
    {
      id: "gt3-opt-paint",
      vehicleId: "vehicle-porsche-911-gt3",
      category: "exterior",
      name: "Paint",
      description: "Porsche paint and Paint to Sample programmes exist and change by market.",
      availability: "supported",
      configurableInStudio: true,
      notes: "Studio colours recolor the third-party GLB. They are not Porsche's official configurator list.",
    },
  ],
};
