# Aurelia Clinic: setup and verification

## What is ready

The application includes a premium bilingual public website, service and doctor pages, appointment flow, Supabase-backed account endpoints, patient/doctor portals, role-aware administrative modules, CMS and a grounded administrative assistant.

**Without Supabase configuration, only the illustrative public website and limited FAQ assistant are usable.** No appointment, inquiry, account or CRM save is simulated. Private pages remain protected. Adding credentials is not sufficient on its own: the migration must also be applied and actual schedules/content must be configured.

## 1. Configure your Supabase project

Use a dedicated Supabase **development** project first. Do not enter real patient information during setup.

Add these values through Replit Secrets:

| Name | Purpose |
| --- | --- |
| `SUPABASE_URL` | Your project API URL, normally `https://<project-reference>.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase publishable/anon key used with RLS and user-scoped requests |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only privileged key for public inquiry insertion and authorized account invitations |

Never prefix the service-role key with `VITE_`; it must never appear in the browser bundle.

Set `APP_URL` to the exact approved application origin, including HTTPS. This can initially be the development preview opened in a new tab. Set it to the actual published origin before production email flows are enabled. Do not guess the published URL.

In Supabase Authentication:

1. Enable email/password sign-in and email verification.
2. Set the Site URL to `APP_URL`.
3. Add `${APP_URL}/login` and `${APP_URL}/reset-password` to allowed redirect URLs.
4. Configure production SMTP and sender verification before relying on email delivery. Supabase accepts requests separately from recipient delivery; this application does not claim delivery merely because the request was accepted.
5. Configure appropriate password policies, rate limits, CAPTCHA and MFA policies for clinic operations. This application applies per-process rate limiting and inquiry honeypots; these do not replace deployment-scale abuse protection.

## 2. Apply the schema

In the Supabase SQL editor for the chosen **development** project, execute:

`supabase/migrations/001_aurelia.sql`

It creates the application tables, indexes, RLS policies, constraints, auth-profile trigger, audit triggers, scheduling functions and public-media storage bucket.

The migration is a one-time, transactional initial schema. Do not repeatedly run it on an initialized project. Future changes should be separate versioned migrations.

Alternatively, use the Supabase CLI's linked-project migration workflow from a trusted administrative machine. Do not run a local container-based Supabase stack in this Replit environment. Never apply this file to the scaffolded Replit database.

### Core scheduling behavior

- All timestamps are `timestamptz`; availability derives working hours in the configured clinic time zone.
- Weekdays use PostgreSQL numbering: Sunday = 0 through Saturday = 6.
- Service duration controls slot size. Appointments are exclusive per doctor: capacity is one concurrent visit.
- Weekly breaks and full-day or partial-day exceptions exclude slots. A null exception doctor blocks every doctor's availability.
- Slots start at least one hour in the future and are available within 180 days.
- Every booking rechecks availability in a transaction; doctor locking and a GiST exclusion constraint prevent double booking.
- Rescheduling is atomic. A failed reschedule rolls back and preserves the original booking.
- Patient changes respect the configured change window. Reception has broader scheduling powers; doctors can only update assigned workflow statuses.
- Schedule-change approvals update regular working hours. They do **not** cancel existing appointments; reception must review affected visits.
- Guest booking is intentionally disabled. Verified patient sign-in is required.

## 3. Bootstrap the first administrator

Register one account through the website and verify its email. Use your Supabase administrative SQL editor to promote only that account:

```sql
update public.profiles
set role = 'super_admin'
where id = '<the-exact-auth-user-uuid>';
```

Do not use email or user-editable metadata as a role source. Do not promote every user. Sign out and sign back in after changing roles.

The super administrator can invite staff and assign roles. A doctor staff account must be linked to its doctor profile using `profile_id`. Published biographies do not themselves confer access.

## 4. Configure clinic operations

1. Replace illustrative clinic details with approved name, contact information, address, hours and branding.
2. Create services with durations and prices.
3. Create doctor profiles, link service IDs and (for doctor accounts) profile IDs.
4. Configure each doctor's weekly working schedule and breaks.
5. Add holidays/exceptions.
6. Publish approved content. FAQ/testimonials require **both approved and published**.
7. Review privacy and terms with qualified counsel. Default text is a draft, not a legal compliance determination.

For a demonstration-only Supabase project you may run `supabase/seed.sql` to add explicitly synthetic public content and real working schedules. Never run that seed on a real clinic project.

The optional `seed:demo` script additionally creates synthetic Supabase Auth patients, persisted appointments, leads and tasks. It is never called at startup and requires `--confirm-demo`. Use reserved `.invalid` addresses and never real recipients. Synthetic accounts have no seeded passwords. All synthetic private records are labelled or flagged.

## 5. AI and reminders

The assistant starts in clearly labelled **limited FAQ mode**, reading current published clinic information. A provider key is not required for that mode.

To enable the configured OpenAI provider, add `OPENAI_API_KEY` securely and optionally set `AI_MODEL`. Requests run server-side. The prompt is grounded in freshly queried, approved public data; no private CRM records are supplied to the model. The assistant has no unrestricted database tool. Actual availability is accessed through the secure booking interface, not invented by a model.

Medical safety refusals run before provider invocation for common medical/emergency requests, with further instructions in the provider prompt. These safeguards require adversarial evaluation and ongoing review before production; they are not a clinical safety certification.

Chat is not persisted by default. The server only accepts optional conversation persistence for an authenticated owner with an explicit opt-in flag; RLS isolates sessions and messages.

Notification templates/preferences and delivery logs are prepared. **No email/SMS appointment reminder provider is configured and no reminder sender or background scheduler is active.** Logs may not say `sent` without a provider reference. A production reminder integration needs provider credentials, consent checks, a delivery worker, retry/idempotency logic and receipt handling.

## 6. File storage

Website photos use Supabase Storage bucket `clinic-media`, with 3 MB limits, image MIME/signature checks and administrator-only writes. This is a **public marketing media bucket**, never a patient-document bucket.

Generated illustrative design images bundled with the site are visual demonstration assets, not photos of verified facilities or staff.

## 7. Verification required after configuration

The source can be typechecked and built without external credentials. Database migrations, RLS and full live workflows cannot be validated against Supabase until the project is configured. Do not interpret a successful frontend build as proof of production readiness.

Run all of the following in a development Supabase project:

1. Register, verify email, sign in and book an actual slot.
2. Confirm the saved booking is visible to the authorized patient, reception and linked doctor.
3. Submit two concurrent requests for one slot; exactly one must succeed.
4. Reschedule and cancel within policy; late patient changes must fail with reception guidance.
5. Test password recovery, invitations, sign-out and refresh.
6. Submit an inquiry; confirm both lead and inquiry records are saved.
7. Assign/update a lead, add a follow-up, complete a task and reload.
8. Publish a FAQ, change hours and verify public site and assistant reflect new data.
9. Attempt cross-patient, cross-doctor and receptionist-to-super-admin access through direct API and Supabase REST calls.
10. Check Arabic RTL and phone-sized booking/navigation.
11. Upload approved website media and attempt disallowed files/roles.
12. Exercise assistant medical refusals and emergency directions in both languages.

Before real patient use, obtain independent security and legal review, a retention/deletion policy, documented access reviews, deployment backup/incident procedures, tested recovery, provider processing agreements and jurisdiction-specific privacy review. Do not assume HIPAA/GDPR/Jordanian-law compliance.
