-- Phase 5 extras. Safe to run after 20261028_formshift_phase4.sql.

alter table public.saved_configurations
  add column if not exists catalog_vehicle_id text,
  add column if not exists schema_version integer not null default 1;

alter table public.inquiries
  add column if not exists configuration_snapshot jsonb,
  add column if not exists submission_hash text;

create index if not exists inquiries_submission_hash_created_idx
  on public.inquiries (submission_hash, created_at desc);

create index if not exists saved_configurations_catalog_vehicle_id_idx
  on public.saved_configurations (catalog_vehicle_id);
