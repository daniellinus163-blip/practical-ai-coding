-- Staff-initiated customer follow-up: in-app notifications + inquiry.staff_reply events.

alter table public.automation_events drop constraint if exists automation_events_type_check;
alter table public.automation_events
  add constraint automation_events_type_check
  check (event_type = any (array[
    'inquiry.received',
    'configuration.saved',
    'lead.stage_changed',
    'follow_up.reminder',
    'integration.delivery_failed',
    'inquiry.staff_reply'
  ]::text[]));

create table if not exists public.customer_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  inquiry_id uuid references public.inquiries (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint customer_notifications_body_len check (char_length(body) between 1 and 4000),
  constraint customer_notifications_title_len check (char_length(title) between 1 and 200)
);

create index if not exists customer_notifications_user_created_idx
  on public.customer_notifications (user_id, created_at desc);

alter table public.customer_notifications enable row level security;

drop policy if exists customer_notifications_select_own on public.customer_notifications;
create policy customer_notifications_select_own on public.customer_notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists customer_notifications_update_own on public.customer_notifications;
create policy customer_notifications_update_own on public.customer_notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
