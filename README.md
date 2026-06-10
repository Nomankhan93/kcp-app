# Kunri Citizens Portal (KCP)

Official citizen services portal for Town Committee Kunri.

## Main modules

- Public website: introduction, leadership messages, services, notices, news, downloads, contact
- Citizen complaint submission and tracking
- Admin complaint management dashboard
- Chairman dashboard and reports/CSV export
- Birth, marriage and death certificate applications
- Ward-wise General Councilor certificate verification for 10 wards
- Certificate final processing and delivery workflow
- Public CMS for notices, news, downloads/forms and leadership messages
- Staff, certificate officer and ward councilor role management
- Favicon/PWA icons and responsive header/navigation

## Local development

```bash
cd ~/projects/kunri-citizens-portal
npm install
cp .env.example .env
npm run dev -- --port 3001
```

Use a separate Kunri local Supabase backend. Recommended local ports:

```text
API:    http://127.0.0.1:55321
DB:     127.0.0.1:55322
Studio: http://127.0.0.1:55323
```

## Required environment variables

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Never put a Supabase `service_role` or secret key in frontend `.env` files.

## Cloud Supabase SQL order

Run these files in Supabase SQL Editor in this order:

1. `supabase/schema.sql`
2. `supabase/phase1-v2.sql`
3. `supabase/admin-dashboard-v2.sql`
4. `supabase/certificates-v1.sql`
5. `supabase/certificate-ward-verification-v1.sql`
6. `supabase/certificate-final-processing-v2.sql`
7. `supabase/public-cms-v1.sql`
8. `supabase/staff-ward-management-v1.sql`
9. `supabase/production-readiness-v1.sql`

Then create Auth users in Supabase and assign roles using `/admin/users` and `/admin/ward-councilors`, or with direct SQL for the first admin user.

## Vercel deployment

1. Push the repo to GitHub.
2. Import the repo in Vercel.
3. Add environment variables from `.env.production.example`.
4. Build command: `npm run build`
5. Output directory: `dist`

`vercel.json` is included for SPA route rewrites, cache headers and basic security headers.

## Production check

```bash
npm run check
```

## Important approval note

Before official launch, Town Committee Kunri should approve the domain name, official logo, leadership text/images, privacy wording, complaint categories, certificate workflow, user roles, and data ownership policy.
