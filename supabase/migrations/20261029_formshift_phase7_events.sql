-- Phase 7 durable event engine. Run after Phase 4–6. Non-destructive.

alter table public.lead_tasks
  add column if not exists source_key text;

alter table public.automation_events
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists max_attempts integer not null default 8,
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists last_error text,
  add column if not exists completed_at timestamptz,
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by text,
  add column if not exists idempotency_key text;

update public.automation_events set status = 'succeeded' where status = 'sent';
update public.automation_events set event_type = 'inquiry.received' where event_type = 'inquiry_received';

alter table public.automation_events drop constraint if exists automation_events_status_check;
alter table public.automation_events
  add constraint automation_events_status_check
  check (status = any (array['queued','processing','succeeded','failed','dead','skipped']::text[]));

alter table public.automation_events drop constraint if exists automation_events_type_check;
alter table public.automation_events
  add constraint automation_events_type_check
  check (event_type = any (array[
    'inquiry.received',
    'configuration.saved',
    'lead.stage_changed',
    'follow_up.reminder',
    'integration.delivery_failed'
  ]::text[]));

alter table public.automation_events drop constraint if exists automation_events_idempotency_key;
drop index if exists automation_events_idempotency_uidx;
alter table public.automation_events
  add constraint automation_events_idempotency_key unique (idempotency_key);

create index if not exists automation_events_claim_idx
  on public.automation_events (next_attempt_at)
  where status in ('queued', 'failed');

create table if not exists public.automation_event_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.automation_events (id) on delete cascade,
  integration text not null check (integration = any (array['internal','n8n','hubspot','resend','resend_staff']::text[])),
  status text not null default 'pending' check (status = any (array['pending','succeeded','failed','skipped']::text[])),
  attempt_count integer not null default 0,
  retryable boolean not null default true,
  last_error text,
  external_id text,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (event_id, integration)
);

create index if not exists automation_event_deliveries_event_idx
  on public.automation_event_deliveries (event_id);

alter table public.automation_event_deliveries enable row level security;

alter table public.lead_tasks drop constraint if exists lead_tasks_source_key_key;
drop index if exists lead_tasks_source_key_uidx;
alter table public.lead_tasks
  add constraint lead_tasks_source_key_key unique (source_key);

create or replace function public.enqueue_automation_event(
  p_event_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_lead_id uuid,
  p_payload jsonb,
  p_idempotency_key text,
  p_next_attempt_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_idempotency_key is null or length(p_idempotency_key) < 4 then
    raise exception 'idempotency_key required';
  end if;

  insert into public.automation_events (
    event_type, entity_type, entity_id, lead_id, payload, status, idempotency_key, next_attempt_at
  ) values (
    p_event_type, p_entity_type, p_entity_id, p_lead_id, coalesce(p_payload, '{}'::jsonb),
    'queued', p_idempotency_key, coalesce(p_next_attempt_at, now())
  )
  on conflict on constraint automation_events_idempotency_key
  do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.automation_events where idempotency_key = p_idempotency_key;
  end if;
  return v_id;
end;
$$;

create or replace function public.record_inquiry(
  p_name text,
  p_email text,
  p_message text,
  p_vehicle_slug text,
  p_configuration_id uuid,
  p_configuration_snapshot jsonb,
  p_submission_hash text,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inquiry public.inquiries%rowtype;
  v_lead_id uuid;
  v_event_id uuid;
  v_follow_id uuid;
begin
  if p_user_id is not null and v_uid is distinct from p_user_id then
    raise exception 'not allowed';
  end if;
  if p_user_id is null and v_uid is not null then
    p_user_id := v_uid;
  end if;
  if p_email is null or p_name is null or p_message is null or p_submission_hash is null then
    raise exception 'invalid inquiry';
  end if;

  select * into v_inquiry
  from public.inquiries
  where submission_hash = p_submission_hash
    and created_at >= now() - interval '10 minutes'
  order by created_at desc
  limit 1;

  if found then
    select id into v_lead_id from public.leads where inquiry_id = v_inquiry.id;
    select id into v_event_id from public.automation_events
      where idempotency_key = 'inquiry.received:' || v_inquiry.id::text;
    return jsonb_build_object(
      'inquiry_id', v_inquiry.id,
      'lead_id', v_lead_id,
      'event_id', v_event_id,
      'duplicate', true
    );
  end if;

  insert into public.inquiries (
    user_id, vehicle_slug, configuration_id, configuration_snapshot, submission_hash,
    name, email, message, status
  ) values (
    p_user_id, p_vehicle_slug, p_configuration_id, p_configuration_snapshot, p_submission_hash,
    p_name, lower(p_email), p_message, 'new'
  )
  returning * into v_inquiry;

  insert into public.leads (inquiry_id, user_id, email, name, status, source, vehicle_slug)
  values (v_inquiry.id, p_user_id, lower(p_email), p_name, 'new', 'inquiry', p_vehicle_slug)
  on conflict (inquiry_id) do update set updated_at = now()
  returning id into v_lead_id;

  insert into public.lead_activities (lead_id, actor_user_id, kind, body)
  values (v_lead_id, p_user_id, 'inquiry_received', left(p_message, 500));

  v_event_id := public.enqueue_automation_event(
    'inquiry.received',
    'inquiry',
    v_inquiry.id,
    v_lead_id,
    jsonb_build_object(
      'inquiry_id', v_inquiry.id,
      'lead_id', v_lead_id,
      'vehicle_slug', p_vehicle_slug,
      'has_config', p_configuration_snapshot is not null
    ),
    'inquiry.received:' || v_inquiry.id::text,
    now()
  );

  v_follow_id := public.enqueue_automation_event(
    'follow_up.reminder',
    'inquiry',
    v_inquiry.id,
    v_lead_id,
    jsonb_build_object(
      'inquiry_id', v_inquiry.id,
      'lead_id', v_lead_id,
      'vehicle_slug', p_vehicle_slug
    ),
    'follow_up.reminder:' || v_inquiry.id::text,
    now() + interval '24 hours'
  );

  return jsonb_build_object(
    'inquiry_id', v_inquiry.id,
    'lead_id', v_lead_id,
    'event_id', v_event_id,
    'follow_up_event_id', v_follow_id,
    'duplicate', false
  );
end;
$$;

create or replace function public.record_saved_configuration(
  p_id uuid,
  p_vehicle_slug text,
  p_catalog_vehicle_id text,
  p_name text,
  p_payload jsonb,
  p_schema_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_event_id uuid;
  v_action text;
begin
  if v_uid is null then
    raise exception 'sign in required';
  end if;

  if p_id is null then
    insert into public.saved_configurations (
      user_id, vehicle_slug, catalog_vehicle_id, name, payload, schema_version
    ) values (
      v_uid, p_vehicle_slug, p_catalog_vehicle_id, p_name, coalesce(p_payload, '{}'::jsonb), coalesce(p_schema_version, 1)
    )
    returning id into v_id;
    v_action := 'create';
  else
    update public.saved_configurations
    set name = p_name,
        payload = coalesce(p_payload, '{}'::jsonb),
        schema_version = coalesce(p_schema_version, 1),
        catalog_vehicle_id = p_catalog_vehicle_id,
        vehicle_slug = p_vehicle_slug
    where id = p_id and user_id = v_uid
    returning id into v_id;
    if v_id is null then
      raise exception 'saved configuration not found';
    end if;
    v_action := 'update';
  end if;

  v_event_id := public.enqueue_automation_event(
    'configuration.saved',
    'saved_configuration',
    v_id,
    null,
    jsonb_build_object(
      'configuration_id', v_id,
      'vehicle_slug', p_vehicle_slug,
      'schema_version', coalesce(p_schema_version, 1),
      'action', v_action
    ),
    'configuration.saved:' || v_id::text || ':' || v_action || ':' || floor(extract(epoch from now()))::text,
    now()
  );

  return jsonb_build_object('id', v_id, 'event_id', v_event_id, 'action', v_action);
end;
$$;

create or replace function public.record_lead_stage_change(
  p_lead_id uuid,
  p_to_status text,
  p_expected_version integer,
  p_actor uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from text;
  v_version integer;
  v_event_id uuid;
begin
  if p_actor is null then
    raise exception 'actor required';
  end if;
  if not exists (select 1 from public.staff_members where user_id = p_actor) then
    raise exception 'not staff';
  end if;

  select status, version into v_from, v_version
  from public.leads
  where id = p_lead_id
  for update;

  if v_from is null then
    raise exception 'lead not found';
  end if;
  if v_version is distinct from p_expected_version then
    raise exception 'version conflict';
  end if;
  if v_from = p_to_status then
    return jsonb_build_object('id', p_lead_id, 'unchanged', true, 'version', v_version);
  end if;

  update public.leads
  set status = p_to_status, version = v_version + 1
  where id = p_lead_id and version = p_expected_version;
  if not found then
    raise exception 'version conflict';
  end if;

  insert into public.lead_activities (lead_id, actor_user_id, kind, body)
  values (p_lead_id, p_actor, 'stage_change', v_from || ' → ' || p_to_status);

  insert into public.lead_audit (lead_id, actor_user_id, action, before_state, after_state)
  values (
    p_lead_id,
    p_actor,
    'stage_change',
    jsonb_build_object('status', v_from),
    jsonb_build_object('status', p_to_status)
  );

  v_event_id := public.enqueue_automation_event(
    'lead.stage_changed',
    'lead',
    p_lead_id,
    p_lead_id,
    jsonb_build_object(
      'lead_id', p_lead_id,
      'from_status', v_from,
      'to_status', p_to_status,
      'version', v_version + 1
    ),
    'lead.stage_changed:' || p_lead_id::text || ':' || (v_version + 1)::text,
    now()
  );

  return jsonb_build_object('id', p_lead_id, 'event_id', v_event_id, 'version', v_version + 1);
end;
$$;

create or replace function public.claim_automation_events(p_limit integer, p_worker text)
returns setof public.automation_events
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with picked as (
    select e.id
    from public.automation_events e
    where e.status in ('queued', 'failed')
      and e.next_attempt_at <= now()
      and e.attempt_count < e.max_attempts
      and (e.locked_at is null or e.locked_at < now() - interval '2 minutes')
    order by e.next_attempt_at asc
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 10), 20))
  )
  update public.automation_events e
  set status = 'processing',
      locked_at = now(),
      locked_by = left(coalesce(p_worker, 'worker'), 80),
      attempt_count = e.attempt_count + 1
  from picked
  where e.id = picked.id
  returning e.*;
end;
$$;

create or replace function public.complete_automation_event(p_event_id uuid, p_status text, p_error text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.automation_events
  set status = p_status,
      last_error = case when p_status in ('failed', 'dead') then left(p_error, 400) else last_error end,
      completed_at = case when p_status in ('succeeded', 'skipped', 'dead') then now() else null end,
      locked_at = null,
      locked_by = null,
      next_attempt_at = case
        when p_status = 'failed' then now() + least(interval '1 hour', (interval '30 seconds') * power(2, greatest(attempt_count - 1, 0)))
        else next_attempt_at
      end
  where id = p_event_id;
end;
$$;

create or replace function public.retry_automation_event(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean := false;
begin
  update public.automation_events
  set status = 'queued',
      next_attempt_at = now(),
      locked_at = null,
      locked_by = null,
      completed_at = null,
      last_error = null
  where id = p_event_id
    and status in ('failed', 'dead', 'processing')
  returning true into v_ok;

  update public.automation_event_deliveries
  set status = 'pending',
      retryable = true,
      last_error = null,
      completed_at = null,
      updated_at = now()
  where event_id = p_event_id
    and status = 'failed';

  return coalesce(v_ok, false);
end;
$$;

create or replace function public.upsert_follow_up_task(
  p_lead_id uuid,
  p_source_key text,
  p_title text,
  p_due date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.lead_tasks (lead_id, title, due_at, source_key)
  values (p_lead_id, left(p_title, 160), p_due, p_source_key)
  on conflict on constraint lead_tasks_source_key_key
  do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.lead_tasks where source_key = p_source_key;
  end if;
  return v_id;
end;
$$;

revoke all on function public.enqueue_automation_event(text, text, uuid, uuid, jsonb, text, timestamptz) from public, anon, authenticated;
revoke all on function public.claim_automation_events(integer, text) from public, anon, authenticated;
revoke all on function public.complete_automation_event(uuid, text, text) from public, anon, authenticated;
revoke all on function public.retry_automation_event(uuid) from public, anon, authenticated;
revoke all on function public.upsert_follow_up_task(uuid, text, text, date) from public, anon, authenticated;
revoke all on function public.record_lead_stage_change(uuid, text, integer, uuid) from public, anon, authenticated;

grant execute on function public.record_inquiry(text, text, text, text, uuid, jsonb, text, uuid) to anon, authenticated, service_role;
grant execute on function public.record_saved_configuration(uuid, text, text, text, jsonb, integer) to authenticated, service_role;
grant execute on function public.enqueue_automation_event(text, text, uuid, uuid, jsonb, text, timestamptz) to service_role;
grant execute on function public.claim_automation_events(integer, text) to service_role;
grant execute on function public.complete_automation_event(uuid, text, text) to service_role;
grant execute on function public.retry_automation_event(uuid) to service_role;
grant execute on function public.upsert_follow_up_task(uuid, text, text, date) to service_role;
grant execute on function public.record_lead_stage_change(uuid, text, integer, uuid) to service_role;
