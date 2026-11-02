/**
 * Catalog types are shaped like future Supabase rows.
 * IDs are stable strings now and can become UUIDs when the database is connected.
 */

export type FactConfidence = "confirmed" | "announced" | "estimate" | "unavailable";

export type VehicleStatus =
  | "production"
  | "upcoming"
  | "announced"
  | "concept"
  | "production_ended";

export type BodyStyle = "sedan" | "coupe" | "roadster" | "targa" | "suv";

export type DrivetrainLayout =
  | "battery_electric"
  | "internal_combustion"
  | "plug_in_hybrid";

export type SpecGroup =
  | "identity"
  | "body"
  | "powertrain"
  | "performance"
  | "dimensions"
  | "capacity"
  | "availability";

export type OptionAvailability = "supported" | "announced" | "illustrative" | "unavailable";

export type ImageRole = "hero" | "gallery" | "placeholder";

export interface Brand {
  id: string;
  slug: string;
  name: string;
  trademarkNote: string;
}

export interface SourceRef {
  name: string;
  url: string;
  retrievedNote: string;
}

export interface VehicleSpecification {
  id: string;
  vehicleId: string;
  configurationId: string | null;
  specKey: string;
  group: SpecGroup;
  label: string;
  value: string | null;
  unit: string | null;
  confidence: FactConfidence;
  notes: string | null;
  source: SourceRef | null;
}

export interface VehicleImage {
  id: string;
  vehicleId: string;
  role: ImageRole;
  /** Local placeholders only in Phase 2. Manufacturer photography is not bundled. */
  src: string | null;
  alt: string;
  isPlaceholder: boolean;
  rightsNote: string;
}

export interface VehicleOption {
  id: string;
  vehicleId: string;
  category: string;
  name: string;
  description: string | null;
  availability: OptionAvailability;
  configurableInStudio: boolean;
  notes: string | null;
}

export interface VehicleConfiguration {
  id: string;
  vehicleId: string;
  slug: string;
  name: string;
  isDefault: boolean;
  notes: string | null;
}

export interface Vehicle {
  id: string;
  brandId: string;
  slug: string;
  model: string;
  /** Null when a single model year is not applicable or not verified. */
  modelYear: number | null;
  modelYearNote: string | null;
  generation: string | null;
  bodyStyle: BodyStyle;
  drivetrainLayout: DrivetrainLayout;
  status: VehicleStatus;
  statusLabel: string;
  description: string;
  independenceDisclaimer: string;
  configurations: VehicleConfiguration[];
  specifications: VehicleSpecification[];
  images: VehicleImage[];
  options: VehicleOption[];
}

export interface CatalogVehicle extends Vehicle {
  brand: Brand;
}

export interface CatalogFilters {
  query?: string;
  brand?: string;
  bodyStyle?: BodyStyle | "all";
  status?: VehicleStatus | "all";
  sort?: CatalogSort;
}

export type CatalogSort = "name" | "brand" | "status" | "year";

export interface CatalogRepository {
  listBrands(): Promise<Brand[]>;
  listVehicles(): Promise<CatalogVehicle[]>;
  getVehicleBySlug(slug: string): Promise<CatalogVehicle | null>;
  getVehiclesBySlugs(slugs: string[]): Promise<CatalogVehicle[]>;
}
