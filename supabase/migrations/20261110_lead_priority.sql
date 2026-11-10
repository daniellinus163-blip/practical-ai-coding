-- Lead priority for staff triage.

alter table public.leads
  add column if not exists priority text not null default 'normal';

alter table public.leads drop constraint if exists leads_priority_check;
alter table public.leads
  add constraint leads_priority_check
  check (priority = any (array['low', 'normal', 'high', 'urgent']::text[]));

create index if not exists leads_priority_idx on public.leads (priority);
create index if not exists leads_created_at_idx on public.leads (created_at desc);
