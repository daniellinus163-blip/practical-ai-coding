# FormShift events and integrations (Phase 7–8)

Code is implemented. Live n8n / HubSpot / Resend calls stay off until you add keys **and** set `INTEGRATIONS_DRY_RUN=false`. If that variable is unset, dry-run stays on.

## Cost

| Service | Free option | Limits / paid risk |
|---|---|---|
| n8n | Yes, self-host | n8n Cloud has a free trial then paid |
| HubSpot | Yes, free CRM + private app | Paid seats and Marketing Hub not used here |
| Resend | Yes, free tier | 100 emails/day, 3,000/month; paid plans exist |
| Vercel Cron | Hobby: typically 1 job/day | More frequent crons may need Pro |

Do not enable paid plans without approval.

## Migrations to apply

In the FormShift Supabase SQL editor, run in order if not already applied:

1. Existing Phase 4–6 and profile migrations
2. `supabase/migrations/20261029_formshift_phase7_events.sql`
3. `supabase/migrations/20261029_formshift_phase8_integrations.sql`

These add event retry columns, `automation_event_deliveries`, transactional RPCs, and `integration_mappings`. RLS stays on with no client policies on event/delivery/mapping tables.

## Worker

- After an inquiry, save, or stage change the server tries to process due events immediately.
- `GET` or `POST /api/internal/events/process` accepts `Authorization: Bearer` with `EVENTS_WORKER_SECRET` or `CRON_SECRET`. A missing or wrong bearer returns 401. A secret in the query string is rejected.
- `record_inquiry` queues `follow_up.reminder` for 24 hours later. The claim only takes rows whose `next_attempt_at` is already due, with `FOR UPDATE SKIP LOCKED`, and stops after 8 attempts.
- `vercel.json` schedules that path once per day at 06:00 UTC (`0 6 * * *`). This matches the Vercel Hobby limit of one run per day. Hobby may invoke it any time during that hour. Vercel does not retry a failed cron HTTP call; the next day’s run claims events that are still due.
- The cron is not live until this app is deployed and `CRON_SECRET` is set in the hosting project’s environment variables. Vercel then adds `Authorization: Bearer <CRON_SECRET>` itself. Do not put the secret in `vercel.json`.
- A follow-up can wait until the next daily run after it becomes due, so the email may leave between about 24 and 48 hours after the inquiry. More frequent runs need a paid Vercel plan and are not enabled.
- For a manual run while developing, use **Process queued events now** on `/staff/events` (admin only). That does not require the cron secret.

## Event payloads (no email, name, message, or secrets)

| Type | Payload | Outcomes |
|---|---|---|
| `inquiry.received` | `inquiry_id`, `lead_id`, `vehicle_slug`, `has_config` | Supabase follow-up task; HubSpot contact and deal; optional Resend mail |
| `configuration.saved` | `configuration_id`, `vehicle_slug`, `schema_version`, `action` | stored in Supabase only |
| `lead.stage_changed` | `lead_id`, `from_status`, `to_status`, `version` | HubSpot deal stage when `HUBSPOT_STAGE_*` is set |
| `follow_up.reminder` | `inquiry_id`, `lead_id`, `vehicle_slug` | Existing Supabase task is kept; optional Resend follow-up when the reminder is due |

n8n is not called. HubSpot uses `Authorization: Bearer` with `HUBSPOT_ACCESS_TOKEN` (Service Key). `INTEGRATIONS_DRY_RUN` gates Resend only.

Each integration has its own delivery row. A failed Resend send does not replay a successful HubSpot upsert.

## Manual provider setup

### HubSpot

1. Create a Service Key (Development → Keys → Service keys) or an existing private-app token. Put it in `HUBSPOT_ACCESS_TOKEN`. The worker sends `Authorization: Bearer`.
2. Scopes: `crm.objects.contacts.read`, `crm.objects.contacts.write`, `crm.objects.deals.read`, `crm.objects.deals.write`.
3. Settings → Objects → Deals → Pipelines: copy the pipeline ID and each stage ID into `HUBSPOT_PIPELINE_ID` and `HUBSPOT_STAGE_*`. The app never guesses stage IDs. Unmapped stages skip the deal-stage patch.
4. Contacts upsert by email. Deals reuse `integration_mappings` so retries do not create duplicates.

### Resend

1. Verify your sending domain in Resend.
2. `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (verified), optional `RESEND_INTERNAL_TO`.
3. Safe test: `INTEGRATIONS_DRY_RUN=true` and submit an inquiry. Deliveries should show `skipped` / `dry_run`. Then send one mail to an address you own with dry-run off.
4. These are transactional messages for an inquiry the customer submitted, not marketing.

## Test order (after migrations)

1. With `HUBSPOT_ACCESS_TOKEN` set, submit an inquiry. Supabase stores the inquiry and lead. The worker upserts one HubSpot contact and one deal.
2. Retry the same event. The contact and deal IDs stay the same.
3. Resend stays skipped until `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `INTEGRATIONS_DRY_RUN=false` are set. Then one confirmation is sent, and a retry does not send again.
5. Signed inbound webhook with a bad signature must return 401.
6. Unsigned `/api/internal/events/process` must return 401. Signed request processes the queue.
