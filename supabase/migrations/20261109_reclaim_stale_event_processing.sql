-- Reclaim automation events left in 'processing' when a serverless worker exits early.
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
    where (
        e.status in ('queued', 'failed')
        or (
          e.status = 'processing'
          and e.locked_at is not null
          and e.locked_at < now() - interval '2 minutes'
        )
      )
      and e.next_attempt_at <= now()
      and e.attempt_count < e.max_attempts
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
