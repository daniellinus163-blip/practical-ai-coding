# FormShift AI

Independent automotive discovery and configuration. This is **not** an official manufacturer website or dealership. An inquiry is not an order.

## Phase 2 — catalog

The public catalog is driven by structured local seed data in `src/catalog/seed/`. Cards, filters, sorting, and comparison read that shape only. Adding a brand or model means adding a record, not rewriting UI.

Initial vehicles:

- Tesla Model 3 (production)
- Tesla Roadster (labelled **upcoming / planned**)
- Bugatti Chiron (production ended)
- Lamborghini Revuelto (production)

Facts are labelled **confirmed**, **announced**, or **unavailable**. Prices are not listed. Manufacturer photography is not bundled; placeholders are used until approved assets exist.

Catalog pages still read local seed data in `src/catalog/seed/`. Auth, saved builds, inquiries, and staff leads are implemented against Supabase. Follow `supabase/SETUP.md`. **Free option: yes.** Do not create a paid project without approval. The database is not live until you add keys and run the migration.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Main routes: `/`, `/discover`, `/compare`, `/cars/[slug]`, `/my-builds`, `/about`, `/login`, `/register`, `/account`, `/staff`.

```bash
npm run build
```

## Phase 3 — 3D studio

The vehicle page includes an interactive Three.js / React Three Fiber viewer (orbit, zoom, camera presets, reset, fullscreen, lights, loading and error states).

**No car models are included.** Place a licensed `.glb` at:

`public/models/<vehicle-slug>/vehicle.glb`

See `src/configurator/MODEL-MANIFEST.md` for licence notes and candidate sources. Customization is off until the loaded file is inspected and real mesh/material names are listed in `src/configurator/manifest.ts`. Wheels or interior will not be faked by recoloring the whole body.

The Tesla Roadster remains an upcoming/planned catalog entry. Any 3D file for it is a labelled reference preview, not an official production Tesla model.

## Cost rules

Gemini is the only allowed AI provider later (`GEMINI_API_KEY`). Do not add OpenAI or other paid AI APIs. Phase 2 does not call any AI API.

Supabase is wired in code (Free tier). n8n, HubSpot, and Resend adapters exist but stay inactive without keys. Each has a free or hobby option and paid upgrades. Ask before enabling billing. See `supabase/EVENTS.md`.
