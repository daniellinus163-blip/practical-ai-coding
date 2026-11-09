# Digital inquiry pipeline (FormShift + HubSpot + email)

## Why email might not arrive

1. **Resend** — Customer mail only sends when `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (verified domain), and `INTEGRATIONS_DRY_RUN=false` are set on **Vercel Production** (not only `.env.local`).
2. **Worker** — The server must have `SUPABASE_SERVICE_ROLE_KEY` so HubSpot/Resend run after submit. Without it, rows save but automations stall.
3. **Stuck events** — If a deploy interrupted the worker, events can sit in `processing`. Migration `20261109_reclaim_stale_event_processing.sql` reclaims them; apply it in Supabase SQL.
4. **Gmail** — First message from a new domain often lands in Spam/Promotions.
5. **My inquiries** — The account page only lists inquiries tied to your login. Submit while signed in (same email) to see history in the app.

## Vercel Production checklist

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client |
| `SUPABASE_SERVICE_ROLE_KEY` | Event worker + CRM |
| `NEXT_PUBLIC_SITE_URL` | `https://practical-ai-coding-uqjh.vercel.app` (must match Supabase Site URL) |
| `HUBSPOT_ACCESS_TOKEN` | Contact + deal upsert |
| `HUBSPOT_PIPELINE_ID` | Deal pipeline |
| `HUBSPOT_STAGE_NEW` | (and other stage IDs) |
| `RESEND_API_KEY` | Customer + staff mail |
| `RESEND_FROM_EMAIL` | e.g. `inquiries@yourverifieddomain.com` |
| `RESEND_INTERNAL_TO` | Your Gmail for staff alerts |
| `INTEGRATIONS_DRY_RUN` | `false` in production |
| `CRON_SECRET` | Daily follow-up worker (Vercel cron) |

## HubSpot (digitized deal)

Each inquiry creates or updates:

- **Contact** — upserted by email (name split to first/last).
- **Deal** — name `FormShift · {vehicle}`; **description** includes inquiry ID, vehicle, message excerpt, staff link, and whether a 3D config was attached.

Map pipeline stages in env (`HUBSPOT_STAGE_*`). Deals without mapped stages still create; stage patch is skipped when an ID is missing.

## Staff CRM

Insert yourself into `staff_members` (see `supabase/SETUP.md`) to open `/staff/leads` and `/staff/events`.

## Re-run stuck inquiries

Admin: **Staff → Events → Process queued events now**, or call `/api/internal/events/process` with `Authorization: Bearer <CRON_SECRET>`.
