alter table public.automation_event_deliveries
  drop constraint if exists automation_event_deliveries_integration_check;

alter table public.automation_event_deliveries
  add constraint automation_event_deliveries_integration_check
  check (integration = any (array['internal','n8n','hubspot','resend','resend_staff']::text[]));
