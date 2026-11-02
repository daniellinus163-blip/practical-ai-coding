-- Catalog-only snapshot. The applied Phase 4 migration is:
-- supabase/migrations/20261028_formshift_phase4.sql
-- Maps 1:1 to src/catalog/types.ts. Public pages still read local seed until you load catalog rows.

create table if not exists public.brands (
  id uuid primary key,
  slug text not null unique,
  name text not null,
  trademark_note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key,
  brand_id uuid not null references public.brands (id),
  slug text not null unique,
  model text not null,
  model_year integer,
  model_year_note text,
  generation text,
  body_style text not null,
  drivetrain_layout text not null,
  status text not null,
  status_label text not null,
  description text not null,
  independence_disclaimer text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_configurations (
  id uuid primary key,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  slug text not null,
  name text not null,
  is_default boolean not null default false,
  notes text,
  unique (vehicle_id, slug)
);

create table if not exists public.vehicle_specifications (
  id uuid primary key,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  configuration_id uuid references public.vehicle_configurations (id) on delete cascade,
  spec_key text not null,
  spec_group text not null,
  label text not null,
  value text,
  unit text,
  confidence text not null check (confidence in ('confirmed', 'announced', 'estimate', 'unavailable')),
  notes text,
  source_name text,
  source_url text,
  source_retrieved_note text
);

create table if not exists public.vehicle_images (
  id uuid primary key,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  role text not null,
  src text,
  alt text not null,
  is_placeholder boolean not null default true,
  rights_note text not null
);

create table if not exists public.vehicle_options (
  id uuid primary key,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  category text not null,
  name text not null,
  description text,
  availability text not null,
  configurable_in_studio boolean not null default false,
  notes text
);

alter table public.brands enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_configurations enable row level security;
alter table public.vehicle_specifications enable row level security;
alter table public.vehicle_images enable row level security;
alter table public.vehicle_options enable row level security;
