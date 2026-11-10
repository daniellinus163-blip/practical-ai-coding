-- Customer ↔ staff conversation metadata and in-app customer replies.

alter table public.lead_activities
  add column if not exists meta jsonb not null default '{}'::jsonb;

create or replace function public.record_customer_inquiry_reply(
  p_inquiry_id uuid,
  p_message text
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
  v_activity_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_message is null or char_length(trim(p_message)) < 10 or char_length(p_message) > 4000 then
    raise exception 'invalid message';
  end if;

  select * into v_inquiry from public.inquiries where id = p_inquiry_id;
  if not found then
    raise exception 'inquiry not found';
  end if;
  if v_inquiry.user_id is distinct from v_uid then
    raise exception 'not allowed';
  end if;

  select id into v_lead_id from public.leads where inquiry_id = v_inquiry.id limit 1;
  if v_lead_id is null then
    raise exception 'no lead for inquiry';
  end if;

  insert into public.lead_activities (lead_id, actor_user_id, kind, body)
  values (v_lead_id, v_uid, 'customer_reply', trim(p_message))
  returning id into v_activity_id;

  return jsonb_build_object(
    'activity_id', v_activity_id,
    'lead_id', v_lead_id,
    'inquiry_id', v_inquiry.id
  );
end;
$$;

revoke all on function public.record_customer_inquiry_reply(uuid, text) from public, anon;
grant execute on function public.record_customer_inquiry_reply(uuid, text) to authenticated, service_role;

create or replace function public.trg_staff_notify_inquiry_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inquiry_id uuid;
begin
  if new.kind in ('inquiry_received', 'note', 'stage_change', 'assignment', 'task_created', 'task_completed') then
    return new;
  end if;
  if new.kind not in ('customer_reply', 'customer_note') then
    return new;
  end if;
  select inquiry_id into v_inquiry_id from public.leads where id = new.lead_id;
  perform public.staff_notify_all_staff(
    'customer.message',
    'inquiry',
    case when new.kind = 'customer_reply' then 'Customer replied in account' else 'Customer message on lead' end,
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
