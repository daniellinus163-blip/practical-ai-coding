# FormShift AI — Supabase setup (Phase 4)

Free option: **yes** (Supabase Free). Stay on Free unless you approve paid compute or extra storage.

The public catalog still runs from local seed data. Auth, saved builds, inquiries, and staff leads need a **FormShift** Supabase project — not a different product’s database.

## 1. Create a project

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Create a new project named FormShift (Free).
3. Wait until the database is ready.

## 2. Environment variables

Copy `.env.example` to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- Anon / publishable: Project Settings → API. Safe in the browser; RLS still applies.
- Service role: server only. Never prefix with `NEXT_PUBLIC_`. Never commit it.
- Restart `npm run dev` after saving `.env.local`.

## 3. Tables and RLS

In the **FormShift** project: SQL Editor → New query → paste and run:

`supabase/migrations/20261028_formshift_phase4.sql`, then `phase5`, then `20261028_formshift_phase6_crm.sql`, then `20261029_profile_fields.sql` and `20261029_profile_avatars.sql` (city, preferred contact, and the public `avatars` storage bucket), then `20261029_formshift_phase7_events.sql` and `20261029_formshift_phase8_integrations.sql`. See `supabase/EVENTS.md`.

This creates catalog tables (public read), customer profiles, saved configurations, inquiries, CRM leads, tasks, audit, and `staff_members`. It does not drop other tables, insert catalog rows, or create a default administrator.

## 4. Auth dashboard

Authentication → URL configuration:

- Site URL: `http://localhost:3000` (add your production origin later)
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/callback?next=/account`
  - `http://localhost:3000/auth/callback?next=/auth/update-password`

Email confirmation: leave **Confirm email** on if you want a confirmation step. Registration then shows “check your email”. Turn it off only if you explicitly want instant sessions on local.

## 5. First administrator

After you register once, copy your user UUID from Authentication → Users, then:

```sql
insert into public.staff_members (user_id, role, email, display_name)
values ('YOUR-USER-UUID', 'admin', 'you@your-domain', 'Your name');
```

Roles: `admin` or `staff`. Both can work the CRM (stages, assignment, tasks). Only this SQL (or a later admin tool) can grant access. The app never inserts a default admin and never trusts a role from the browser.

Customers can `select` only their own `staff_members` row (usually none). They have **no** RLS policies on `leads`, `lead_tasks`, `lead_audit`, or `lead_activities`. Direct anon/authenticated API reads of those tables return empty/denied. CRM pages use the **service role on the server** after `getUser()` + `staff_members` lookup.

## 6. What is not automatic

- Catalog seed is **not** copied into Supabase. Discover/car pages keep using `src/catalog/seed`.
- Email delivery uses Supabase’s built-in mail (rate-limited on Free). Production mail is a later, possibly paid, choice.
- Inquiry automation events are queued in the database. n8n, HubSpot, and Resend stay skipped until you add keys and set `INTEGRATIONS_DRY_RUN=false`. Details: `supabase/EVENTS.md`.

## 7. Checks after setup

- Register, confirm email if required, sign in, refresh — session should persist.
- Sign out.
- Forgot password → mail → set a new password.
- Save a studio build while signed in → `/my-builds`.
- Send an inquiry on a car page (signed in and signed out).
- `/staff` as a normal customer → redirected to `/staff-denied` with no lead data.
- After the SQL insert and `SUPABASE_SERVICE_ROLE_KEY`: overview counts, lead search, pipeline, tasks.
- Home, Discover, and car studios still work if `.env.local` is missing.
