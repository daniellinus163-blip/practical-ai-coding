-- FormShift AI Phase 4 schema.
-- Apply in the FormShift Supabase project SQL editor (or `supabase db push`).
-- Do not run this on unrelated projects. This file does not delete existing tables.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Catalog (public read of approved fields only)
-- ---------------------------------------------------------------------------

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  trademark_note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
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
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  slug text not null,
  name text not null,
  is_default boolean not null default false,
  notes text,
  unique (vehicle_id, slug)
);

create table if not exists public.vehicle_specifications (
  id uuid primary key default gen_random_uuid(),
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
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  role text not null,
  src text,
  alt text not null,
  is_placeholder boolean not null default true,
  rights_note text not null
);

create table if not exists public.vehicle_options (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  category text not null,
  name text not null,
  description text,
  availability text not null,
  configurable_in_studio boolean not null default false,
  notes text
);

create index if not exists vehicles_brand_id_idx on public.vehicles (brand_id);
create index if not exists vehicle_specifications_vehicle_id_idx on public.vehicle_specifications (vehicle_id);
create index if not exists vehicle_options_vehicle_id_idx on public.vehicle_options (vehicle_id);

-- ---------------------------------------------------------------------------
-- Customer and CRM
-- ---------------------------------------------------------------------------

create table if not exists public.customer_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  phone text,
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_profiles_display_name_len check (display_name is null or char_length(display_name) between 1 and 80),
  constraint customer_profiles_phone_len check (phone is null or char_length(phone) between 5 and 32)
);

create table if not exists public.staff_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('staff', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.saved_configurations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vehicle_slug text not null,
  name text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_configurations_name_len check (name is null or char_length(name) between 1 and 80),
  constraint saved_configurations_slug_len check (char_length(vehicle_slug) between 1 and 120)
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  vehicle_slug text,
  configuration_id uuid references public.saved_configurations (id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'reviewed', 'closed')),
  created_at timestamptz not null default now(),
  constraint inquiries_name_len check (char_length(name) between 2 and 80),
  constraint inquiries_email_len check (char_length(email) between 5 and 160),
  constraint inquiries_message_len check (char_length(message) between 10 and 4000)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid references public.inquiries (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  name text,
  status text not null default 'open' check (status in ('open', 'contacted', 'qualified', 'closed')),
  source text not null default 'inquiry',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  kind text not null,
  body text,
  created_at timestamptz not null default now()
);

create table if not exists public.automation_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads (id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  created_at timestamptz not null default now()
);

create index if not exists saved_configurations_user_id_idx on public.saved_configurations (user_id);
create index if not exists inquiries_user_id_idx on public.inquiries (user_id);
create index if not exists inquiries_email_idx on public.inquiries (email);
create index if not exists leads_email_idx on public.leads (email);
create index if not exists lead_activities_lead_id_idx on public.lead_activities (lead_id);

-- ---------------------------------------------------------------------------
-- Profile on signup
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customer_profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, 'guest'), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customer_profiles_updated_at on public.customer_profiles;
create trigger customer_profiles_updated_at
  before update on public.customer_profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists saved_configurations_updated_at on public.saved_configurations;
create trigger saved_configurations_updated_at
  before update on public.saved_configurations
  for each row execute function public.touch_updated_at();

drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at
  before update on public.leads
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Catalog: public SELECT only. Writes stay with the service role (dashboard / server).
-- ---------------------------------------------------------------------------

alter table public.brands enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_configurations enable row level security;
alter table public.vehicle_specifications enable row level security;
alter table public.vehicle_images enable row level security;
alter table public.vehicle_options enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.staff_members enable row level security;
alter table public.saved_configurations enable row level security;
alter table public.inquiries enable row level security;
alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;
alter table public.automation_events enable row level security;

drop policy if exists brands_public_read on public.brands;
create policy brands_public_read on public.brands
  for select to anon, authenticated using (true);

drop policy if exists vehicles_public_read on public.vehicles;
create policy vehicles_public_read on public.vehicles
  for select to anon, authenticated using (true);

drop policy if exists vehicle_configurations_public_read on public.vehicle_configurations;
create policy vehicle_configurations_public_read on public.vehicle_configurations
  for select to anon, authenticated using (true);

drop policy if exists vehicle_specifications_public_read on public.vehicle_specifications;
create policy vehicle_specifications_public_read on public.vehicle_specifications
  for select to anon, authenticated using (true);

drop policy if exists vehicle_images_public_read on public.vehicle_images;
create policy vehicle_images_public_read on public.vehicle_images
  for select to anon, authenticated using (true);

drop policy if exists vehicle_options_public_read on public.vehicle_options;
create policy vehicle_options_public_read on public.vehicle_options
  for select to anon, authenticated using (true);

-- Customer profiles: owner only
drop policy if exists customer_profiles_select_own on public.customer_profiles;
create policy customer_profiles_select_own on public.customer_profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists customer_profiles_update_own on public.customer_profiles;
create policy customer_profiles_update_own on public.customer_profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists customer_profiles_insert_own on public.customer_profiles;
create policy customer_profiles_insert_own on public.customer_profiles
  for insert to authenticated with check (id = auth.uid());

-- staff_members: no client policies. Service role (server) is the only reader/writer.
-- saved configurations: owner CRUD
drop policy if exists saved_configurations_select_own on public.saved_configurations;
create policy saved_configurations_select_own on public.saved_configurations
  for select to authenticated using (user_id = auth.uid());

drop policy if exists saved_configurations_insert_own on public.saved_configurations;
create policy saved_configurations_insert_own on public.saved_configurations
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists saved_configurations_update_own on public.saved_configurations;
create policy saved_configurations_update_own on public.saved_configurations
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists saved_configurations_delete_own on public.saved_configurations;
create policy saved_configurations_delete_own on public.saved_configurations
  for delete to authenticated using (user_id = auth.uid());

-- Inquiries: customers insert as themselves (or anonymous with null user_id); select own only.
drop policy if exists inquiries_insert_self on public.inquiries;
create policy inquiries_insert_self on public.inquiries
  for insert to anon, authenticated
  with check (
    (auth.uid() is null and user_id is null)
    or (auth.uid() is not null and user_id = auth.uid())
  );

drop policy if exists inquiries_select_own on public.inquiries;
create policy inquiries_select_own on public.inquiries
  for select to authenticated using (user_id = auth.uid());

-- leads, lead_activities, automation_events: RLS on, no client policies (staff uses service role).
