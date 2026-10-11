# Aurelia Clinic

Premium English/Arabic general-healthcare website with appointment scheduling, patient and doctor portals, and administrative clinic CRM.

## Standing product requirements

- Use **Supabase exclusively** for PostgreSQL, authentication and uploaded media. Never introduce Clerk, Replit Auth, Replit's database, Neon, SQLite, or localStorage persistence.
- Administrative and scheduling data only: no medical records, diagnoses, prescriptions or clinical charts.
- The assistant provides clinic information and booking guidance, never medical advice or emergency triage.
- Default locale English; real Arabic RTL support. Initial configurable currency JOD and time zone Asia/Amman.
- Blue/white visual identity: navy `#102D69`, royal `#1263DF`, accent `#1686FF`, ice `#EAF5FF`, pearl `#F7FAFE`.
- Do not invent appointment success, delivered notifications, verified doctors, authentic reviews or live metrics. Synthetic content must be distinguishable.
- This application is not automatically compliant with healthcare or privacy laws. Legal/security/operational reviews are required before real-patient use.

## Run

- Managed frontend workflow: `artifacts/aurelia-clinic: web`.
- Managed API workflow: `artifacts/api-server: API Server`.
- `pnpm run typecheck` checks all packages.
- `pnpm --filter @workspace/api-spec run codegen` regenerates hooks and validators.
- Build frontend with workflow-provided `PORT` and `BASE_PATH`; API build is `pnpm --filter @workspace/api-server run build`.
- Never run `@workspace/db push`; that unused scaffold is not the clinic's database.

## Source of truth

- API contract: `lib/api-spec/openapi.yaml`; generated clients/validators in `lib/api-client-react` and `lib/api-zod`.
- Backend: `artifacts/api-server/src/routes`; Supabase configuration, role checks and cookies in `src/lib/supabase.ts`.
- Management field validation: `artifacts/api-server/src/lib/resources.ts`.
- Frontend: `artifacts/aurelia-clinic/src`; separate public, booking, account and management surfaces.
- Supabase schema/RLS/transactional functions: `supabase/migrations/001_aurelia.sql`.
- Optional public demonstration seed: `supabase/seed.sql`.
- Setup and remaining live verification: `docs/SETUP.md`.

## Configuration

Required: `SUPABASE_URL`, `SUPABASE_ANON_KEY`. Public inquiry submission and account invitations additionally require server-only `SUPABASE_SERVICE_ROLE_KEY`.
`APP_URL` is the approved application origin used in Supabase email flows. Obtain the published URL through the deployment tooling; do not guess it.
Optional: `OPENAI_API_KEY`, `AI_MODEL` (defaults to `gpt-4o-mini`).
Credentials belong in Secrets, never source control or client bundles.

## Architecture decisions

- Supabase user-scoped clients enforce RLS for private operations; the service-role client is restricted to invitation creation and validated public inquiry submission.
- Authentication uses Supabase Auth with HttpOnly Secure cookies. No custom identity system or client-stored bearer tokens.
- Booking and rescheduling run as database functions; an exclusion constraint prevents overlapping active appointments. Patient identity and duration are server-owned.
- With no Supabase credentials, the public site uses explicit read-only illustrative content. Availability is empty and mutations fail, never simulated persistence.
- Migrations are applied to the explicitly chosen external Supabase project, not by Replit Publish and never at application startup.
