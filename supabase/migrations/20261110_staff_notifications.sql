-- Staff in-app notification centre + Supabase Realtime.

create table if not exists public.staff_notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  disabled_types text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.staff_notification_preferences enable row level security;

drop policy if exists staff_notification_preferences_select_own on public.staff_notification_preferences;
create policy staff_notification_preferences_select_own on public.staff_notification_preferences
  for select to authenticated
  using (
    user_id = auth.uid()
    and exists (select 1 from public.staff_members sm where sm.user_id = auth.uid())
  );

drop policy if exists staff_notification_preferences_upsert_own on public.staff_notification_preferences;
create policy staff_notification_preferences_upsert_own on public.staff_notification_preferences
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.staff_members sm where sm.user_id = auth.uid())
  );

drop policy if exists staff_notification_preferences_update_own on public.staff_notification_preferences;
create policy staff_notification_preferences_update_own on public.staff_notification_preferences
  for update to authenticated
  using (
    user_id = auth.uid()
    and exists (select 1 from public.staff_members sm where sm.user_id = auth.uid())
  )
  with check (user_id = auth.uid());

create table if not exists public.staff_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users (id) on delete cascade,
  notification_type text not null,
  category text not null,
  title text not null,
  message text not null,
  lead_id uuid references public.leads (id) on delete set null,
  inquiry_id uuid references public.inquiries (id) on delete set null,
  activity_id uuid references public.lead_activities (id) on delete set null,
  automation_event_id uuid references public.automation_events (id) on delete set null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  dedupe_key text,
  constraint staff_notifications_title_len check (char_length(title) between 1 and 200),
  constraint staff_notifications_message_len check (char_length(message) between 1 and 4000),
  constraint staff_notifications_type_check check (
    notification_type = any (array[
      'inquiry.new',
      'customer.message',
      'lead.assigned',
      'lead.status_changed',
      'follow_up.due',
      'follow_up.overdue',
      'integration.hubspot_failed',
      'integration.email_failed',
      'integration.worker_failed'
    ]::text[])
  )
);

create index if not exists staff_notifications_recipient_created_idx
  on public.staff_notifications (recipient_user_id, created_at desc);

create index if not exists staff_notifications_recipient_unread_idx
  on public.staff_notifications (recipient_user_id, created_at desc)
  where read_at is null;

create unique index if not exists staff_notifications_dedupe_uidx
  on public.staff_notifications (recipient_user_id, dedupe_key)
  where dedupe_key is not null;

alter table public.staff_notifications enable row level security;

drop policy if exists staff_notifications_select_own on public.staff_notifications;
create policy staff_notifications_select_own on public.staff_notifications
  for select to authenticated
  using (
    recipient_user_id = auth.uid()
    and exists (select 1 from public.staff_members sm where sm.user_id = auth.uid())
  );

drop policy if exists staff_notifications_update_own on public.staff_notifications;
create policy staff_notifications_update_own on public.staff_notifications
  for update to authenticated
  using (
    recipient_user_id = auth.uid()
    and exists (select 1 from public.staff_members sm where sm.user_id = auth.uid())
  )
  with check (recipient_user_id = auth.uid());

alter publication supabase_realtime add table public.staff_notifications;

create or replace function public.staff_notification_type_enabled(p_user_id uuid, p_type text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.staff_notification_preferences p
    where p.user_id = p_user_id
      and p_type = any (p.disabled_types)
  );
$$;

create or replace function public.staff_notify_user(
  p_user_id uuid,
  p_type text,
  p_category text,
  p_title text,
  p_message text,
  p_lead_id uuid default null,
  p_inquiry_id uuid default null,
  p_activity_id uuid default null,
  p_automation_event_id uuid default null,
  p_href text default null,
  p_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_user_id is null or not public.staff_notification_type_enabled(p_user_id, p_type) then
    return null;
  end if;
  if p_dedupe_key is not null then
    select id into v_id
    from public.staff_notifications
    where recipient_user_id = p_user_id and dedupe_key = p_dedupe_key
    limit 1;
    if found then
      return v_id;
    end if;
  end if;
  insert into public.staff_notifications (
    recipient_user_id, notification_type, category, title, message,
    lead_id, inquiry_id, activity_id, automation_event_id, href, dedupe_key
  ) values (
    p_user_id, p_type, p_category, p_title, p_message,
    p_lead_id, p_inquiry_id, p_activity_id, p_automation_event_id, p_href, p_dedupe_key
  )
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.staff_notify_all_staff(
  p_type text,
  p_category text,
  p_title text,
  p_message text,
  p_lead_id uuid default null,
  p_inquiry_id uuid default null,
  p_activity_id uuid default null,
  p_automation_event_id uuid default null,
  p_href text default null,
  p_dedupe_key text default null,
  p_exclude_user_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  r record;
begin
  for r in select user_id from public.staff_members loop
    if p_exclude_user_id is not null and r.user_id = p_exclude_user_id then
      continue;
    end if;
    perform public.staff_notify_user(
      r.user_id, p_type, p_category, p_title, p_message,
      p_lead_id, p_inquiry_id, p_activity_id, p_automation_event_id, p_href,
      case when p_dedupe_key is not null then p_dedupe_key || ':' || r.user_id::text else null end
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.trg_staff_notify_new_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_vehicle text;
begin
  v_name := coalesce(new.name, 'Customer');
  v_vehicle := coalesce(new.vehicle_slug, 'general');
  perform public.staff_notify_all_staff(
    'inquiry.new',
    'inquiry',
    'New customer inquiry',
    v_name || ' submitted an inquiry' || case when new.vehicle_slug is not null then ' for ' || new.vehicle_slug else '' end || '.',
    new.id,
    new.inquiry_id,
    null,
    null,
    '/staff/leads/' || new.id::text,
    'inquiry.new:' || new.id::text
  );
  return new;
end;
$$;

drop trigger if exists staff_notify_new_lead on public.leads;
create trigger staff_notify_new_lead
  after insert on public.leads
  for each row
  execute function public.trg_staff_notify_new_lead();

create or replace function public.trg_staff_notify_lead_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null then
    v_name := coalesce(new.name, 'Lead');
    perform public.staff_notify_user(
      new.assigned_to,
      'lead.assigned',
      'assignment',
      'Lead assigned to you',
      v_name || ' was assigned to your queue.',
      new.id,
      new.inquiry_id,
      null,
      null,
      '/staff/leads/' || new.id::text,
      'lead.assigned:' || new.id::text || ':' || new.assigned_to::text
    );
    if old.assigned_to is not null and old.assigned_to <> new.assigned_to then
      perform public.staff_notify_all_staff(
        'lead.status_changed',
        'pipeline',
        'Lead reassigned',
        v_name || ' was reassigned.',
        new.id,
        new.inquiry_id,
        null,
        null,
        '/staff/leads/' || new.id::text,
        null,
        new.assigned_to
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists staff_notify_lead_assignment on public.leads;
create trigger staff_notify_lead_assignment
  after update of assigned_to on public.leads
  for each row
  execute function public.trg_staff_notify_lead_assignment();

create or replace function public.trg_staff_notify_lead_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    perform public.staff_notify_all_staff(
      'lead.status_changed',
      'pipeline',
      'Lead stage updated',
      coalesce(new.name, 'Lead') || ': ' || coalesce(old.status, '?') || ' → ' || new.status || '.',
      new.id,
      new.inquiry_id,
      null,
      null,
      '/staff/leads/' || new.id::text,
      'lead.status:' || new.id::text || ':' || new.status
    );
    if new.assigned_to is not null then
      perform public.staff_notify_user(
        new.assigned_to,
        'lead.status_changed',
        'pipeline',
        'Your lead moved stage',
        'Status is now ' || new.status || '.',
        new.id,
        new.inquiry_id,
        null,
        null,
        '/staff/leads/' || new.id::text,
        null
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists staff_notify_lead_status on public.leads;
create trigger staff_notify_lead_status
  after update of status on public.leads
  for each row
  execute function public.trg_staff_notify_lead_status();

create or replace function public.trg_staff_notify_inquiry_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inquiry_id uuid;
begin
  if new.kind = 'inquiry_received' then
    return new;
  end if;
  if new.kind is distinct from 'customer_note' then
    return new;
  end if;
  select inquiry_id into v_inquiry_id from public.leads where id = new.lead_id;
  perform public.staff_notify_all_staff(
    'customer.message',
    'inquiry',
    'Customer message on lead',
    left(coalesce(new.body, ''), 120),
    new.lead_id,
    v_inquiry_id,
    new.id,
    null,
    '/staff/leads/' || new.lead_id::text,
    null,
    null
  );
  return new;
end;
$$;

drop trigger if exists staff_notify_inquiry_activity on public.lead_activities;
create trigger staff_notify_inquiry_activity
  after insert on public.lead_activities
  for each row
  execute function public.trg_staff_notify_inquiry_activity();

revoke all on function public.staff_notify_user(uuid, text, text, text, text, uuid, uuid, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.staff_notify_all_staff(text, text, text, text, uuid, uuid, uuid, uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.staff_notify_user(uuid, text, text, text, text, uuid, uuid, uuid, uuid, text, text) to service_role;
grant execute on function public.staff_notify_all_staff(text, text, text, text, uuid, uuid, uuid, uuid, text, text, uuid) to service_role;
