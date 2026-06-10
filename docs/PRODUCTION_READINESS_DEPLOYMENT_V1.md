# Production Readiness & Deployment v1

This patch prepares Kunri Citizens Portal for live deployment on Vercel + Cloud Supabase.

## Added

- `vercel.json` with Vite build settings, SPA route rewrites, cache headers and basic security headers
- `.env.production.example`
- Updated `.env.example`
- `.gitignore`
- `public/robots.txt`
- `public/sitemap.xml`
- `supabase/production-readiness-v1.sql`
- Councilor dashboard routes wired into `src/App.tsx`
- `npm run check` script
- Production deployment/security docs

## Apply

```bash
cd ~/projects/kunri-citizens-portal
unzip -o /mnt/c/Users/*/Downloads/kunri-production-readiness-deployment-v1.zip -d .
```

## Local test

```bash
npm run typecheck
npm run build
npm run dev -- --port 3001
```

## Cloud SQL order

Run in Supabase SQL Editor:

1. `supabase/schema.sql`
2. `supabase/phase1-v2.sql`
3. `supabase/admin-dashboard-v2.sql`
4. `supabase/certificates-v1.sql`
5. `supabase/certificate-ward-verification-v1.sql`
6. `supabase/certificate-final-processing-v2.sql`
7. `supabase/public-cms-v1.sql`
8. `supabase/staff-ward-management-v1.sql`
9. `supabase/production-readiness-v1.sql`

## Vercel environment variables

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Do not add Supabase `service_role` keys to Vercel frontend environment variables.
