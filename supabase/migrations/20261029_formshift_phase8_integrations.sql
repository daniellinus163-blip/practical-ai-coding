-- Phase 8 HubSpot ID mappings. Non-destructive. RLS on, no client policies.

create table if not exists public.integration_mappings (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = any (array['hubspot','n8n','resend']::text[])),
  provider_object text not null,
  local_type text not null,
  local_id text not null,
  provider_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_object, local_type, local_id)
);

create unique index if not exists integration_mappings_provider_id_uidx
  on public.integration_mappings (provider, provider_object, provider_id);

create index if not exists integration_mappings_local_idx
  on public.integration_mappings (local_type, local_id);

alter table public.integration_mappings enable row level security;
