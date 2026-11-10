-- Follow-up tasks: description, timestamptz due, reminder tracking.

alter table public.lead_tasks
  add column if not exists description text,
  add column if not exists due_notified_at timestamptz,
  add column if not exists overdue_notified_at timestamptz;

alter table public.lead_tasks drop constraint if exists lead_tasks_description_len;
alter table public.lead_tasks
  add constraint lead_tasks_description_len
  check (description is null or char_length(description) between 0 and 2000);

alter table public.lead_tasks
  alter column due_at type timestamptz using (
    case when due_at is null then null else due_at::timestamptz end
  );

create index if not exists lead_tasks_open_due_idx
  on public.lead_tasks (due_at)
  where completed_at is null;
