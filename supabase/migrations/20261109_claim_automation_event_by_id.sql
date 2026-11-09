-- Claim one automation event immediately after record_inquiry (faster staff alerts).
create or replace function public.claim_automation_event_by_id(p_event_id uuid, p_worker text)
returns public.automation_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.automation_events;
begin
  update public.automation_events e
  set status = 'processing',
      locked_at = now(),
      locked_by = left(coalesce(p_worker, 'worker'), 80),
      attempt_count = e.attempt_count + 1
  where e.id = p_event_id
    and (
      e.status in ('queued', 'failed')
      or (
        e.status = 'processing'
        and e.locked_at is not null
        and e.locked_at < now() - interval '2 minutes'
      )
    )
    and e.next_attempt_at <= now()
    and e.attempt_count < e.max_attempts
  returning e.* into v_row;
  return v_row;
end;
$$;

revoke all on function public.claim_automation_event_by_id(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_automation_event_by_id(uuid, text) to service_role;
