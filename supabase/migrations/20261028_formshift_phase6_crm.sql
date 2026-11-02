-- Phase 6 CRM. Run after Phase 4–5. Does not insert an administrator.

alter table public.staff_members
  add column if not exists display_name text,
  add column if not exists email text;

drop policy if exists staff_members_select_own on public.staff_members;
create policy staff_members_select_own on public.staff_members
  for select to authenticated using (user_id = auth.uid());

alter table public.leads drop constraint if exists leads_status_check;
update public.leads set status = 'new' where status = 'open';
update public.leads set status = 'lost' where status = 'closed';
alter table public.leads
  alter column status set default 'new';
alter table public.leads
  add constraint leads_status_check
  check (status = any (array['new','contacted','qualified','quote_sent','negotiation','won','lost']::text[]));

alter table public.leads
  add column if not exists assigned_to uuid references auth.users (id) on delete set null,
  add column if not exists vehicle_slug text,
  add column if not exists version integer not null default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leads_inquiry_id_key'
  ) then
    alter table public.leads add constraint leads_inquiry_id_key unique (inquiry_id);
  end if;
end $$;
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_assigned_to_idx on public.leads (assigned_to);
create index if not exists leads_email_lower_idx on public.leads (lower(email));

create table if not exists public.lead_tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  title text not null,
  due_at date,
  completed_at timestamptz,
  assigned_to uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint lead_tasks_title_len check (char_length(title) between 2 and 160)
);

create index if not exists lead_tasks_lead_id_idx on public.lead_tasks (lead_id);
create index if not exists lead_tasks_due_at_idx on public.lead_tasks (due_at);

create table if not exists public.lead_audit (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lead_audit_lead_id_idx on public.lead_audit (lead_id);

alter table public.lead_tasks enable row level security;
alter table public.lead_audit enable row level security;
-- No client policies: CRM rows are read/written only with the server service role after a staff check.
